import { io } from 'socket.io-client'
import type { NFT, OrderStatus } from '../types/nft'

export function connectToOrder(orderId: string, onStatus: (status: OrderStatus) => void) {
  const url = getSocketUrl()
  if (!url) return null

  const socket = io(url, {
    reconnection: true,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => socket.emit('order:watch', orderId))
  socket.on('order:update', (update: { orderId: string; status: OrderStatus }) => {
    if (update.orderId === orderId) onStatus(update.status)
  })

  return socket
}

export function connectToNFT(nftId: string, onUpdate: (nft: Partial<NFT>) => void) {
  const url = getSocketUrl()
  if (!url) return null

  const socket = io(url, {
    reconnection: true,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => socket.emit('nft:watch', nftId))
  socket.on('nft.updated', (update: Partial<NFT> & { id: string }) => {
    if (update.id === nftId) onUpdate(update)
  })

  return socket
}

function getSocketUrl() {
  return import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:3001' : null)
}
