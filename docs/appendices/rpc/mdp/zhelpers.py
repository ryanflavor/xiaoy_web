# encoding: utf-8
"""
Helper module for example applications. Mimics ZeroMQ Guide's zhelpers.h.
"""
from __future__ import print_function

import binascii
import os
import time
from random import randint

import zmq
import logging
import socket
import subprocess


def port_available_check(port: int):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(('localhost', port)) == 0:
            logging.info(f"port {port} in use, try to kill the process..")
            cmd = f'netstat -aon | findstr :{port}'
            result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
            lines = result.stdout.splitlines()
            for line in lines:
                parts = line.strip().split()
                if len(parts) > 4 and parts[1].endswith(f':{port}'):
                    pid = parts[-1]
                    try:
                        subprocess.run(['taskkill', '/F', '/PID', pid], capture_output=True)
                        logging.info(f"killing process {pid} ...")
                    except subprocess.CalledProcessError as e:
                        logging.error(f"Failed to kill process {pid}: {e}")
        else:
            logging.info(f"port {port} NOT in use, continue...")
    time.sleep(0.1)

def socket_set_hwm(socket, hwm=-1):
    """libzmq 2/3/4 compatible sethwm"""
    try:
        socket.sndhwm = socket.rcvhwm = hwm
    except AttributeError:
        socket.hwm = hwm


def dump(msg_or_socket):
    """Receives all message parts from socket, printing each frame neatly"""
    if isinstance(msg_or_socket, zmq.Socket):
        # it's a socket, call on current message
        msg = msg_or_socket.recv_multipart()
    else:
        msg = msg_or_socket
    print("----------------------------------------")
    for part in msg:
        print("[%03d]" % len(part), end=' ')
        is_text = True
        try:
            print(part)
        except UnicodeDecodeError:
            print(r"0x%s" % (binascii.hexlify(part).decode('ascii')))


def set_id(zsocket):
    """Set simple random printable identity on socket"""
    identity = u"%04x-%04x" % (randint(0, 0x10000), randint(0, 0x10000))
    zsocket.setsockopt_string(zmq.IDENTITY, identity)


def zpipe(ctx):
    """build inproc pipe for talking to threads

    mimic pipe used in czmq zthread_fork.

    Returns a pair of PAIRs connected via inproc
    """
    a = ctx.socket(zmq.PAIR)
    b = ctx.socket(zmq.PAIR)
    a.linger = b.linger = 0
    a.hwm = b.hwm = 1
    iface = "inproc://%s" % binascii.hexlify(os.urandom(8))
    a.bind(iface)
    b.connect(iface)
    return a,b
