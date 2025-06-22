import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'

interface SocketState {
  socket: Socket | null
  isConnected: boolean
  connectionError: string | null
  
  connect: (token: string) => void
  disconnect: () => void
  emit: (event: string, data: any) => void
  on: (event: string, handler: (data: any) => void) => void
  off: (event: string, handler?: (data: any) => void) => void
}

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  connectionError: null,

  connect: (token: string) => {
    const currentSocket = get().socket
    if (currentSocket?.connected) {
      return
    }

    const socket = io(WEBSOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socket.on('connect', () => {
      set({ isConnected: true, connectionError: null })
      console.log('Socket connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      set({ isConnected: false })
      console.log('Socket disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
      set({ 
        isConnected: false, 
        connectionError: error.message || 'Connection failed' 
      })
      console.error('Socket connection error:', error)
    })

    // Real-time event handlers
    socket.on('account:update', (data) => {
      // Handle account updates
      console.log('Account update:', data)
    })

    socket.on('algorithm:progress', (data) => {
      // Handle algorithm progress updates
      console.log('Algorithm progress:', data)
    })

    socket.on('notification', (data) => {
      // Handle notifications
      console.log('Notification:', data)
    })

    set({ socket })
  },

  disconnect: () => {
    const socket = get().socket
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  },

  emit: (event: string, data: any) => {
    const socket = get().socket
    if (socket?.connected) {
      socket.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot emit event:', event)
    }
  },

  on: (event: string, handler: (data: any) => void) => {
    const socket = get().socket
    if (socket) {
      socket.on(event, handler)
    }
  },

  off: (event: string, handler?: (data: any) => void) => {
    const socket = get().socket
    if (socket) {
      if (handler) {
        socket.off(event, handler)
      } else {
        socket.off(event)
      }
    }
  },
}))