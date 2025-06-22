from .mdcliapi2 import MajorDomoClient
from .mdbroker import MajorDomoBroker
from .mdwrkapi import MajorDomoWorker
from .zhelpers import port_available_check

import pickle
from functools import lru_cache
import zmq
import threading
import datetime
import traceback
from typing import Any, Callable, Dict
import queue

KEEP_ALIVE_TOLERANCE = datetime.timedelta(seconds=5)


class RpcPublisher:
    def __init__(self, addr: str = ""):
        self.context: zmq.Context = zmq.Context()
        self.socket: zmq.Socket = self.context.socket(zmq.PUB)
        self.active: bool = False
        self.lock: threading.Lock = threading.Lock()
        self.addr: str = addr
        self.queue: queue.Queue = queue.Queue()
        self.publish_thread: threading.Thread = None

    def start(self) -> None:
        with self.lock:
            self.active = True
        self.socket.connect(self.addr)

        self.publish_thread = threading.Thread(target=self._process_queue)
        self.publish_thread.start()

    def publish(self, topic: str, event: Any) -> None:
        with self.lock:  # 确保在检查self.active状态时的线程安全
            if not self.active:  # 如果不处于活动状态，则不处理消息
                return
        topic_bytes = topic.encode('utf-8')
        data_bytes = pickle.dumps(event)
        self.queue.put((topic_bytes, data_bytes))  # 只有在活动状态时，才将消息放入队列

    def _process_queue(self):
        while True:
            try:
                topic_bytes, data_bytes = self.queue.get(block=True, timeout=1)
                self.socket.send_multipart([topic_bytes, data_bytes])
            except queue.Empty:
                continue

    def is_active(self) -> bool:
        with self.lock:
            return self.active

    def suspend(self) -> None:
        with self.lock:
            self.active = False

    def resume(self) -> None:
        with self.lock:
            self.active = True

    def stop(self) -> None:
        with self.lock:
            self.active = False
        if self.publish_thread and self.publish_thread.is_alive():
            self.publish_thread.join()
            self.publish_thread = None
        self.socket.close()


class RpcSubscriber:
    def __init__(self):
        self.context: zmq.Context = zmq.Context()
        self.socket: zmq.Socket = self.context.socket(zmq.SUB)

        self.active: bool = False
        self.thread: threading.Thread = None

    def start(self, addr: str) -> None:
        self.socket.connect(addr)
        self.active = True
        self.thread = threading.Thread(target=self.run)
        self.thread.start()

    def run(self) -> None:
        pull_tolerance = int(KEEP_ALIVE_TOLERANCE.total_seconds() * 1000)

        while self.active:
            if not self.socket.poll(pull_tolerance):
                continue
            recv = None
            try:
                recv = self.socket.recv_multipart()
                topic, data = recv
            except ValueError as e:
                for i in recv:
                    try:
                        r = i.decode()
                    except:
                        r = i

                    print(f"recv_multipart error: {e}, recv: {r}")
                continue
            topic = topic.decode()
            event = pickle.loads(data)
            self.callback(topic, event)

        self.socket.close()

    def callback(self, topic: str, event: Any) -> None:
        """
        Callable function
        """
        raise NotImplementedError

    def subscribe(self, topic: str) -> None:
        self.socket.setsockopt_string(zmq.SUBSCRIBE, topic)

    def stop(self) -> None:
        """
        Stop RpcClient
        """
        if not self.active:
            return

        self.active = False


class RpcClient(MajorDomoClient):
    def __init__(self, broker: str, verbose: bool = False):
        super().__init__(broker, verbose)
        self.active = False
        self.thread = None  # RpcClient thread

    def start(self) -> None:
        with self.lock:  # 使用锁保护active状态的修改
            self.active = True
        self.thread = threading.Thread(target=self.run)
        self.thread.start()

    @lru_cache(128)
    def __getattr__(self, name: str):
        # 执行远程调用任务
        def dorpc(*args, **kwargs):
            with self.lock:  # 在调用send之前使用锁来检查active状态
                if not self.active:
                    return None

            assert "_rpc_service" in kwargs, "miss _rpc_service"
            _rpc_service = kwargs.pop('_rpc_service')

            # 生成请求
            req = [name, args, kwargs]
            # 发送请求
            request = pickle.dumps(req)
            req_id = self.send(_rpc_service, request)
            return req_id

        return dorpc

    def run(self):
        while self.active:
            while not self.queue.empty():
                request = self.queue.get()
                self.client.send_multipart(request)

            reply = self.recv()
            if reply:
                req_id, rep = reply
                req_id = req_id.decode()
                self.callback(req_id, rep)

        self.close()

    def callback(self, req_id: str, rep: Any) -> None:
        """
        Callable function
        """
        raise NotImplementedError

    def stop(self) -> None:
        """
        Stop RpcClient
        """
        with self.lock:  # 使用锁保护active状态的修改
            if not self.active:
                return

        self.active = False
        if self.thread and self.thread.is_alive():
            self.thread.join()
        self.thread = None
        self.close()


class RpcWorker(MajorDomoWorker):
    def __init__(self, broker: str | int, service: str | bytes, verbose: bool = False):
        if isinstance(broker, int):
            broker = f"tcp://localhost:{broker}"
        if isinstance(service, str):
            service = service.encode()
        super().__init__(broker, service, verbose)
        self.lock = threading.Lock()
        self.__functions: Dict[str, Any] = {}
        self.active = False
        self.thread = None  # RpcWorker thread

    def start(self) -> None:
        with self.lock:
            self.active = True
        self.thread = threading.Thread(target=self.run)
        self.thread.start()

    def is_active(self) -> bool:
        with self.lock:
            return self.active

    def run(self):
        reply = None
        while self.active:
            request = self.recv(reply)
            if request is None:
                break  # Worker was interrupted
            req_id, req = request
            name, args, kwargs = pickle.loads(req)
            try:
                with self.lock:
                    func = self.__functions[name]
                r = func(*args, **kwargs)
                rep = [True, r]
            except Exception as e:  # noqa
                rep = [False, traceback.format_exc()]
            reply = [req_id, pickle.dumps(rep)]

        self.destroy()

    def register(self, func: Callable) -> None:
        """
        Register function
        """
        with self.lock:
            return self._register(func.__name__, func)

    def _register(self, name: str, func: Callable) -> None:
        """
        Register function
        """
        self.__functions[name] = func

    def stop(self):
        """
        Stop RpcWorker
        """
        with self.lock:
            if not self.active:
                return

            self.active = False

        if self.thread and self.thread.is_alive():
            self.thread.join()
            self.thread = None
        self.destroy()

    def designate_switch(self):
        raise NotImplementedError
