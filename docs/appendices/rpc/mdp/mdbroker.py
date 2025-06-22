"""
Majordomo Protocol broker
A minimal implementation of http:#rfc.zeromq.org/spec:7 and spec:8

Author: Min RK <benjaminrk@gmail.com>
Based on Java example by Arkadiusz Orzechowski
"""
import datetime
import logging
import sys
import time
from binascii import hexlify
import pickle
import zmq

# local
from .MDP import *
from .zhelpers import dump


class Service(object):
    """a single Service"""
    name = None  # Service name
    requests = None  # List of client requests
    waiting = None  # List of waiting workers
    last_activity_time = None  # Time of last activity
    workholic_mode = False  # 工作狂模式，即不断地分配任务给指定的worker
    designated_worker = None  # 指定的worker

    def __init__(self, name):
        self.name = name
        self.requests = []
        self.waiting = []
        # TODO: 根据服务名判断是否为workholic_mode,
        #  默认除APP服务以外都是workholic_mode，
        #  后续可以根据需求修改
        self.workholic_mode = False if name == b"APP" else True
        self.designated_worker = None
        self.last_activity_time = time.time()


class Worker(object):
    """a Worker, idle or active"""
    identity = None  # hex Identity of worker
    address = None  # Address to route to
    service = None  # Owning service, if known
    expiry = None  # expires at this point, unless heartbeat

    def __init__(self, identity, address, lifetime):
        self.identity = identity
        self.address = address
        self.expiry = time.time() + 1e-3 * lifetime


class MajorDomoBroker(object):
    """
    Majordomo Protocol broker
    A minimal implementation of http:#rfc.zeromq.org/spec:7 and spec:8
    """

    # We'd normally pull these from config data
    INTERNAL_SERVICE_PREFIX = b"mmi."
    HEARTBEAT_LIVENESS = 5  # 3-5 is reasonable
    HEARTBEAT_INTERVAL = 1000  # msecs
    HEARTBEAT_EXPIRY = HEARTBEAT_INTERVAL * HEARTBEAT_LIVENESS
    SERVICE_TIMEOUT = 5000  # 服务超时时间，单位为毫秒

    # ---------------------------------------------------------------------

    ctx = None  # Our context
    socket = None  # Socket for clients & workers
    poller = None  # our Poller

    heartbeat_at = None  # When to send HEARTBEAT
    service_timeout_at = None  # When to check for service timeouts
    services = None  # known services
    workers = None  # known workers
    waiting = None  # idle workers

    verbose = False  # Print activity to stdout

    # ---------------------------------------------------------------------

    def __init__(self, verbose=False):
        """Initialize broker state."""
        self.verbose = verbose
        self.services = {}
        self.workers = {}
        self.waiting = []
        self.heartbeat_at = time.time() + 1e-3 * self.HEARTBEAT_INTERVAL
        self.service_timeout_at = time.time() + 1e-3 * self.SERVICE_TIMEOUT  # 初始化服务超时检查时间
        self.ctx = zmq.Context()
        self.socket = self.ctx.socket(zmq.ROUTER)
        self.socket.linger = 0
        self.poller = zmq.Poller()
        self.poller.register(self.socket, zmq.POLLIN)
        if self.verbose:
            logging.basicConfig(format="%(asctime)s %(message)s",
                                datefmt="%Y-%m-%d %H:%M:%S",
                                level=logging.INFO)

    # ---------------------------------------------------------------------

    def mediate(self):
        """Main broker work happens here"""
        while True:
            try:
                items = self.poller.poll(self.HEARTBEAT_INTERVAL)
            except KeyboardInterrupt:
                break  # Interrupted
            if items:
                msg = self.socket.recv_multipart()
                if self.verbose:
                    logging.info("I: received message:")
                    dump(msg)

                sender = msg.pop(0)
                empty = msg.pop(0)
                assert empty == b''
                header = msg.pop(0)

                if C_CLIENT == header:
                    self.process_client(sender, msg)
                elif W_WORKER == header:
                    self.process_worker(sender, msg)
                else:
                    logging.error("E: invalid message:")
                    dump(msg)

            self.purge_workers()
            self.send_heartbeats()

            # 定期检查服务超时
            if time.time() > self.service_timeout_at:
                self.check_service_timeouts()
                self.service_timeout_at = time.time() + 1e-3 * self.SERVICE_TIMEOUT

    def destroy(self):
        """Disconnect all workers, destroy context."""
        while self.workers:
            self.delete_worker(self.workers.values()[0], True)
        self.ctx.destroy(0)

    def process_client(self, sender, msg):
        """Process a request coming from a client."""
        assert len(msg) >= 2  # Service name + body
        service = msg.pop(0)
        # Set reply return address to client sender
        msg = [sender, b''] + msg
        if service.startswith(self.INTERNAL_SERVICE_PREFIX):
            self.service_internal(service, msg)
        else:
            self.dispatch(self.require_service(service), msg)

    def process_worker(self, sender, msg):
        """Process message sent to us by a worker."""
        assert len(msg) >= 1  # At least, command

        command = msg.pop(0)

        worker_ready = hexlify(sender) in self.workers

        worker = self.require_worker(sender)

        if W_READY == command:
            assert len(msg) >= 1  # At least, a service name
            service = msg.pop(0)
            # Not first command in session or Reserved service name
            if worker_ready or service.startswith(self.INTERNAL_SERVICE_PREFIX):
                self.delete_worker(worker, True)
            else:
                # Attach worker to service and mark as idle
                worker.service = self.require_service(service)
                logging.info(
                    f"I: add worker in waiting list: {worker.identity}, service: {worker.service.name.decode()}")
                self.worker_waiting(worker)

        elif W_REPLY == command:
            if worker_ready:
                # Remove & save client return envelope and insert the
                # protocol header and service name, then rewrap envelope.
                client = msg.pop(0)
                empty = msg.pop(0)  # ?
                msg = [client, b'', C_CLIENT, worker.service.name] + msg
                self.socket.send_multipart(msg)
                self.worker_waiting(worker)
            else:
                self.delete_worker(worker, True)

        elif W_HEARTBEAT == command:
            if worker_ready:
                worker.expiry = time.time() + 1e-3 * self.HEARTBEAT_EXPIRY
            else:
                self.delete_worker(worker, True)

        elif W_DISCONNECT == command:
            self.delete_worker(worker, False)
        else:
            logging.error("E: invalid message:")
            dump(msg)

    def delete_worker(self, worker, disconnect):
        """Deletes worker from all data structures, and deletes worker."""
        assert worker is not None
        if disconnect:
            self.send_to_worker(worker, W_DISCONNECT, None, None)

        if worker.service is not None:
            if worker.service:
                logging.info(f"I: deleting worker: {worker.identity}, service: {worker.service.name.decode()}")
            if worker in worker.service.waiting:
                worker.service.waiting.remove(worker)
            if worker.service.workholic_mode and worker.identity == worker.service.designated_worker:
                worker.service.designated_worker = worker.service.waiting[0].identity if worker.service.waiting else None
                logging.info(
                    f"I: designated worker for service {worker.service.name.decode()} is {worker.service.designated_worker}")
        if worker.identity in self.workers:
            self.workers.pop(worker.identity)

        if worker in self.waiting:
            self.waiting.remove(worker)

        # 判断是否需要删除服务
        if worker.service is not None and not worker.service.waiting:
            del self.services[worker.service.name]
            logging.info(f"I: delete service: {worker.service.name.decode()}")

    def require_worker(self, address):
        """Finds the worker (creates if necessary)."""
        assert (address is not None)
        identity = hexlify(address)
        worker = self.workers.get(identity)
        if worker is None:
            worker = Worker(identity, address, self.HEARTBEAT_EXPIRY)
            self.workers[identity] = worker
            if self.verbose:
                logging.info("I: registering new worker: %s", identity)

        return worker

    def require_service(self, name):
        """Locates the service (creates if necessary)."""
        assert (name is not None)
        service = self.services.get(name)
        if service is None:
            service = Service(name)
            self.services[name] = service
            logging.info("I: adding new service: %s", name.decode())
        service.last_activity_time = time.time()  # 更新服务的最后活动时间
        return service

    def check_service_timeouts(self):
        """检查并删除超时的服务"""
        current_time = time.time()
        services_to_delete = []
        for service_name, service in self.services.items():
            if not service.waiting and (current_time - service.last_activity_time) * 1e3 > self.SERVICE_TIMEOUT:
                services_to_delete.append(service_name)

        for service_name in services_to_delete:
            del self.services[service_name]
            logging.info("I: delete service: %s", service_name.decode())

    def bind(self, endpoint):
        """Bind broker to endpoint, can call this multiple times.
        We use a single socket for both clients and workers.
        """
        try:
            self.socket.bind(endpoint)
        except zmq.ZMQError as e:
            if e.errno == zmq.EADDRINUSE:
                import os, subprocess
                logging.warning(f"端口被占用：{endpoint}")
                port = endpoint.split(':')[-1]
                # 使用netstat找到占用端口的PID
                cmd = f'netstat -aon | findstr :{port}'
                process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                stdout, stderr = process.communicate()
                if stdout:
                    # 解析输出以获取PID
                    pid = stdout.decode().strip().split()[-1]
                    # 获取并杀掉父进程
                    parent_cmd = f'wmic process where (ProcessId={pid}) get ParentProcessId'
                    parent_process = subprocess.Popen(parent_cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    parent_stdout, parent_stderr = parent_process.communicate()
                    parent_pid = parent_stdout.decode().split()[-1].strip()
                    if parent_pid.isdigit():
                        logging.info(f"杀掉父进程：{parent_pid}")
                        os.system(f"taskkill /PID {parent_pid} /F /T")
                    # 杀掉本身进程
                    logging.info(f"杀掉占用端口的进程：{pid}")
                    os.system(f"taskkill /PID {pid} /F /T")
                    # 重新尝试绑定端口
                    self.socket.bind(endpoint)
                    logging.info("重新绑定端口成功。")
                else:
                    logging.error("没有找到占用端口的进程")
            else:
                raise
        logging.info("I: MDP broker/0.1.1 is active at %s", endpoint)

    def service_internal(self, service, msg):
        """Handle internal service according to 8/MMI specification"""
        return_code = b"501"
        if b"mmi.service" == service:
            name = msg[-1]
            return_code = b"200" if name in self.services else b"404"
        msg[-1] = return_code

        # insert the protocol header and service name after the routing envelope ([client, ''])
        msg = msg[:2] + [C_CLIENT, service] + msg[2:]
        self.socket.send_multipart(msg)

    def send_heartbeats(self):
        """Send heartbeats to idle workers if it's time"""
        if time.time() > self.heartbeat_at:
            for worker in self.waiting:
                # 通知指定的worker它是designated_worker
                msg = b"designated" if worker.service.designated_worker == worker.identity else None
                self.send_to_worker(worker, W_HEARTBEAT, None, msg)

            self.heartbeat_at = time.time() + 1e-3 * self.HEARTBEAT_INTERVAL

    def purge_workers(self):
        """Look for & kill expired workers.

        Workers are oldest to most recent, so we stop at the first alive worker.
        """
        self.waiting.sort(key=lambda w: w.expiry)

        while self.waiting:
            w = self.waiting[0]
            if w.expiry < time.time():
                logging.info(f"I: deleting expired worker: {w.identity}")
                self.delete_worker(w, False)
            else:
                break

    def worker_waiting(self, worker):
        """This worker is now waiting for work."""
        # 如果服务处于workholic_mode且没有指定的worker，则设置当前worker为指定的worker
        if worker.service.workholic_mode and not worker.service.designated_worker:
            worker.service.designated_worker = worker.identity
            logging.info(
                f"I: designated worker for service {worker.service.name.decode()} is {worker.identity}")

        # Queue to broker and service waiting lists
        self.waiting.append(worker)
        worker.service.waiting.append(worker)
        worker.expiry = time.time() + 1e-3 * self.HEARTBEAT_EXPIRY
        self.dispatch(worker.service, None)

    def dispatch(self, service, msg):
        """Dispatch requests to waiting workers as possible"""
        assert (service is not None)
        if msg is not None:  # Queue message if any
            service.requests.append(msg)
        self.purge_workers()
        if service.workholic_mode and service.requests:
            # 如果处于workholic_mode，尝试只向designated_worker分配任务
            if service.designated_worker and service.designated_worker in self.workers:
                # 检查designated_worker是否在等待列表中
                if any(worker.identity == service.designated_worker for worker in service.waiting):
                    # 如果designated_worker可用，直接分配
                    designated_worker = next(
                        worker for worker in service.waiting if worker.identity == service.designated_worker)
                    service.waiting.remove(designated_worker)
                    msg = service.requests.pop(0)
                    self.waiting.remove(designated_worker)
                    self.send_to_worker(designated_worker, W_REQUEST, None, msg)
                # 如果designated_worker不在等待列表中但仍在线，不分配任务
            else:
                # 如果designated_worker不在线，选择另一个worker作为designated_worker
                if service.requests and service.waiting:  # 确保有请求和等待的worker
                    worker = service.waiting.pop(0)
                    msg = service.requests.pop(0)
                    self.waiting.remove(worker)
                    service.designated_worker = worker.identity  # 更新designated_worker
                    self.send_to_worker(worker, W_REQUEST, None, msg)
        else:
            # 原有的分配逻辑
            while service.waiting and service.requests:
                msg = service.requests.pop(0)
                worker = service.waiting.pop(0)
                self.waiting.remove(worker)
                self.send_to_worker(worker, W_REQUEST, None, msg)

    def send_to_worker(self, worker, command, option, msg=None):
        """Send message to worker.

        If message is provided, sends that message.
        """

        if msg is None:
            msg = []
        elif not isinstance(msg, list):
            msg = [msg]

        # Stack routing and protocol envelopes to start of message
        # and routing envelope
        if option is not None:
            msg = [option] + msg
        msg = [worker.address, b'', W_WORKER, command] + msg

        if self.verbose:
            logging.info("I: sending %r to worker", command)
            dump(msg)

        self.socket.send_multipart(msg)


def main():
    """create and start new broker"""
    verbose = '-v' in sys.argv
    broker = MajorDomoBroker(verbose)
    broker.bind("tcp://*:5555")
    broker.mediate()


if __name__ == '__main__':
    main()
