import { io } from 'socket.io-client'
import type { OrderStatus } from '../types/nft'

export interface NFTUpdate {
  id: string
  version: number
  price?: string | number
  likes?: number
  eventId?: string
}

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

export function connectToNFT(nftId: string, onUpdate: (nft: NFTUpdate) => void) {
  const url = getSocketUrl()
  if (!url) return null

  const socket = io(url, {
    reconnection: true,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => socket.emit('nft:watch', nftId))
  socket.on('nft.updated', (update: NFTUpdate) => {
    if (update.id === nftId) {
      const nftUpdate = {
        id: update.id,
        version: update.version,
        ...(update.price === undefined ? {} : { price: String(update.price) }),
        ...(update.likes === undefined ? {} : { likes: update.likes }),
      }
      onUpdate(nftUpdate)
    }
  })

  return socket
}

export function connectToNFTUpdates(onUpdate: (update: NFTUpdate) => void) {
  const url = getSocketUrl()
  if (!url) return null

  const socket = io(url, {
    reconnection: true,
    reconnectionAttempts: 5,
  })

  socket.on('nft.updated', (update: NFTUpdate) => {
    const { eventId, ...nftUpdate } = update
    onUpdate(nftUpdate)
    if (update.eventId) socket.emit('nft.updated:ack', update.eventId)
  })
  return socket
}

function getSocketUrl() {
  return import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:3001' : null)
}
