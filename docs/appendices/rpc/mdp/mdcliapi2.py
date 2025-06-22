"""Majordomo Protocol Client API, Python version.

Implements the MDP/Worker spec at http:#rfc.zeromq.org/spec:7.

Author: Min RK <benjaminrk@gmail.com>
Based on Java example by Arkadiusz Orzechowski
"""

import logging
import uuid  # 引入uuid模块

import zmq

from . import MDP
from .zhelpers import dump
import queue
import threading


class MajorDomoClient(object):
    """Majordomo Protocol Client API, Python version.

      Implements the MDP/Worker spec at http:#rfc.zeromq.org/spec:7.
    """
    broker = None
    ctx = None
    client = None
    poller = None
    timeout = 1
    verbose = False

    def __init__(self, broker, verbose=False):
        self.broker = broker
        self.verbose = verbose
        self.ctx = zmq.Context()
        self.poller = zmq.Poller()
        self.lock = threading.Lock()
        self.queue: queue.Queue = queue.Queue()
        # self.thread = threading.Thread(target=self._process_queue)
        # self.thread.start()

        if self.verbose:
            logging.basicConfig(format="%(asctime)s %(message)s",
                                datefmt="%Y-%m-%d %H:%M:%S",
                                level=logging.INFO)
        self.reconnect_to_broker()

    def reconnect_to_broker(self):
        """Connect or reconnect to broker"""
        if self.client:
            self.poller.unregister(self.client)
            self.client.close()
        self.client = self.ctx.socket(zmq.DEALER)
        self.client.linger = 0
        self.client.connect(self.broker)
        self.poller.register(self.client, zmq.POLLIN)
        if self.verbose:
            logging.info("I: connecting to broker at %s...", self.broker)

    def send(self, service, request):
        """Send request to broker, including a unique request ID."""
        request_id = uuid.uuid4().hex.encode()  # 生成唯一的请求编号
        if not isinstance(request, list):
            request = [request]

        # 在请求前添加请求编号
        request = [b'', MDP.C_CLIENT, service, request_id] + request

        if self.verbose:
            logging.info(f"I: send request {request_id} to '{service}' service: ")
            dump(request)

        self.queue.put(request)
        return request_id.decode()

    # def _process_queue(self):
    #     while True:
    #         try:
    #             while not self.queue.empty():
    #                 request = self.queue.get()
    #                 self.client.send_multipart(request)
    #         except queue.Empty:
    #             continue

    def recv(self):
        """Returns the reply message or None if there was no reply, and removes the request from the tracking dictionary."""
        try:
            items = self.poller.poll(self.timeout)
        except KeyboardInterrupt:
            return  # interrupted

        if items:
            msg = self.client.recv_multipart()
            if self.verbose:
                logging.info("I: received reply:")
                dump(msg)

            assert len(msg) >= 5  # 确保消息包含请求编号

            empty = msg.pop(0)
            header = msg.pop(0)
            assert MDP.C_CLIENT == header

            service = msg.pop(0)
            request_id = msg[0]  # 获取请求编号

            if self.verbose:
                logging.info(f"I: received reply for request {request_id}")

            return msg
        # else:
        #     logging.warning("W: permanent error, abandoning request")

    def close(self):
        if self.client:
            # self.poller.unregister(self.client)
            self.client.close()
            self.ctx.term()
