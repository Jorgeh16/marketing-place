import { io } from 'socket.io-client'
import type { OrderStatus } from '../types/nft'

export function connectToOrder(orderId: string, onStatus: (status: OrderStatus) => void) {
  const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
    reconnection: true,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => socket.emit('order:watch', orderId))
  socket.on('order:update', (update: { orderId: string; status: OrderStatus }) => {
    if (update.orderId === orderId) onStatus(update.status)
  })

  return socket
}
