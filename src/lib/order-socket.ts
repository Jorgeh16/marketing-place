import { io } from 'socket.io-client'
import type { OrderStatus } from '../types/nft'

export interface NFTUpdate {
  id: string
  version: number
  price?: string | number
  likes?: number
  eventId?: string
}

interface ResourceEvent<T> {
  eventId: string
  resource: { id: string }
  version: number
  data: T
}

export function connectToOrder(
  orderId: string,
  onStatus: (status: OrderStatus, version: number) => void,
  onReconnect?: () => void,
) {
  const socket = createAuthenticatedSocket()
  if (!socket) return null

  socket.on('connect', () => {
    socket.emit('order:watch', orderId)
    onReconnect?.()
  })

  const seenEvents = new Set<string>()
  let latestVersion = 0
  socket.on('order.updated', (event: ResourceEvent<{ status: OrderStatus }>) => {
    if (
      event.resource.id !== orderId ||
      seenEvents.has(event.eventId) ||
      event.version <= latestVersion
    ) return
    seenEvents.add(event.eventId)
    latestVersion = event.version
    onStatus(event.data.status, event.version)
    socket.emit('order.updated:ack', event.eventId)
  })

  return socket
}

export function connectToNFT(
  nftId: string,
  onUpdate: (nft: NFTUpdate) => void,
  onReconnect?: () => void,
) {
  const socket = createAuthenticatedSocket()
  if (!socket) return null

  socket.on('connect', () => {
    socket.emit('nft:watch', nftId)
    onReconnect?.()
  })

  const seenEvents = new Set<string>()
  let latestVersion = 0
  socket.on('nft.updated', (event: ResourceEvent<Omit<NFTUpdate, 'id' | 'eventId'>>) => {
    if (
      event.resource.id !== nftId ||
      seenEvents.has(event.eventId) ||
      event.version <= latestVersion
    ) return
    seenEvents.add(event.eventId)
    latestVersion = event.version
    onUpdate({
      id: event.resource.id,
      version: event.version,
      ...(event.data.price === undefined ? {} : { price: String(event.data.price) }),
      ...(event.data.likes === undefined ? {} : { likes: event.data.likes }),
      eventId: event.eventId,
    })
    socket.emit('nft.updated:ack', event.eventId)
  })

  return socket
}

export function connectToNFTUpdates(
  nftIds: string[],
  onUpdate: (update: NFTUpdate) => void,
  onReconnect?: () => void,
) {
  const socket = createAuthenticatedSocket()
  if (!socket) return null

  const seenEvents = new Set<string>()
  const versions = new Map<string, number>()
  socket.on('connect', () => {
    nftIds.forEach((nftId) => socket.emit('nft:watch', nftId))
    onReconnect?.()
  })
  socket.on('nft.updated', (event: ResourceEvent<Omit<NFTUpdate, 'id' | 'eventId'>>) => {
    const nftId = event.resource.id
    if (
      seenEvents.has(event.eventId) ||
      event.version <= (versions.get(nftId) ?? 1)
    ) return
    seenEvents.add(event.eventId)
    versions.set(nftId, event.version)
    onUpdate({
      id: nftId,
      version: event.version,
      ...(event.data.price === undefined ? {} : { price: String(event.data.price) }),
      ...(event.data.likes === undefined ? {} : { likes: event.data.likes }),
      eventId: event.eventId,
    })
    socket.emit('nft.updated:ack', event.eventId)
  })
  return socket
}

function createAuthenticatedSocket() {
  const token = localStorage.getItem('auth-token')
  const url = getSocketUrl()
  if (!token || !url) return null

  return io(url, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
  })
}

function getSocketUrl() {
  return import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? window.location.origin : null)
}
