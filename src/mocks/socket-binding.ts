import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws, type WebSocketHandlerConnection, type WebSocketLink } from 'msw'

export interface SocketEvent<T> {
  eventId: string
  resource: { id: string }
  version: number
  data: T
}

interface MockSocketClient {
  connection: WebSocketHandlerConnection
  socket: ReturnType<typeof toSocketIo>
  nftIds: Set<string>
  orderIds: Set<string>
}

const socketLinks: WebSocketLink[] = [
  ws.link(/^wss?:\/\/[^/]+\/$/),
]
const clients = new Set<MockSocketClient>()
const latestNFTEvents = new Map<string, SocketEvent<{
  price?: string
  likes?: number
  stock?: number
}>>()
const acknowledgedEvents = new Set<string>()

function handleConnection(connection: WebSocketHandlerConnection) {
  if (!connection.client.url.pathname.startsWith('/socket.io/')) {
    connection.server.connect()
    return
  }

  const socket = toSocketIo(connection)
  const client: MockSocketClient = {
    connection,
    socket,
    nftIds: new Set(),
    orderIds: new Set(),
  }
  clients.add(client)
  connection.client.addEventListener('close', () => clients.delete(client))

  socket.client.on('nft:watch', (_event, nftId: string) => {
    if (typeof nftId !== 'string') return
    client.nftIds.add(nftId)
    const current = latestNFTEvents.get(nftId)
    if (current) socket.client.emit('nft.updated', current)
  })
  socket.client.on('order:watch', (_event, orderId: string) => {
    if (typeof orderId === 'string') client.orderIds.add(orderId)
  })
  socket.client.on('nft.updated:ack', (_event, eventId: string) => {
    if (typeof eventId === 'string') acknowledgedEvents.add(eventId)
  })
  socket.client.on('order.updated:ack', (_event, eventId: string) => {
    if (typeof eventId === 'string') acknowledgedEvents.add(eventId)
  })
}

const socketHandlers = socketLinks.map((link) =>
  link.addEventListener('connection', handleConnection),
)

export function publishNFTEvent(
  event: SocketEvent<{ price?: string; likes?: number; stock?: number }>,
) {
  const current = latestNFTEvents.get(event.resource.id)
  if (!current || event.version > current.version) {
    latestNFTEvents.set(event.resource.id, event)
  }
  for (const client of clients) {
    if (client.nftIds.has(event.resource.id)) {
      client.socket.client.emit('nft.updated', event)
    }
  }
}

export function publishOrderEvent(event: SocketEvent<{ status: 'pending' | 'confirmed' | 'declined' }>) {
  for (const client of clients) {
    if (client.orderIds.has(event.resource.id)) {
      client.socket.client.emit('order.updated', event)
    }
  }
}

export function getAcknowledgedSocketEvents() {
  return [...acknowledgedEvents]
}

export function getSocketMockState() {
  return {
    clients: [...clients].map(({ nftIds, orderIds }) => ({
      nftIds: [...nftIds],
      orderIds: [...orderIds],
    })),
    acknowledgedEvents: [...acknowledgedEvents],
  }
}

export function resetSocketMocks() {
  acknowledgedEvents.clear()
  latestNFTEvents.clear()
}

export function dropMockSocketConnections() {
  for (const client of clients) client.connection.client.close(1001, 'Simulated connection drop')
  clients.clear()
}

export const socketBindingHandlers = socketHandlers
