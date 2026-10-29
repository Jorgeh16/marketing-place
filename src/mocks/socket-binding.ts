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
  sessionToken: string | null
  userId: string | null
  nftIds: Set<string>
  orderIds: Map<string, string>
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
const orderEventIds = new Set<string>()
const latestOrderVersions = new Map<string, number>()
let validateSession: ((token: string) => string | null) | null = null
let authorizeOrder: ((orderId: string, userId: string) => boolean) | null = null

export function setSocketAuthorization(
  sessionValidator: (token: string) => string | null,
  orderAuthorizer: (orderId: string, userId: string) => boolean,
) {
  validateSession = sessionValidator
  authorizeOrder = orderAuthorizer
}

function handleConnection(connection: WebSocketHandlerConnection) {
  if (!connection.client.url.pathname.startsWith('/socket.io/')) {
    connection.server.connect()
    return
  }

  const socket = toSocketIo(connection)
  const client: MockSocketClient = {
    connection,
    socket,
    sessionToken: null,
    userId: null,
    nftIds: new Set(),
    orderIds: new Map(),
  }
  clients.add(client)
  connection.client.addEventListener('close', () => clients.delete(client))

  socket.client.on('nft:watch', (_event, nftId: string, token: string) => {
    const userId = typeof token === 'string' ? validateSession?.(token) : null
    if (typeof nftId !== 'string' || !userId) return
    client.sessionToken = token
    client.userId = userId
    client.nftIds.add(nftId)
    const current = latestNFTEvents.get(nftId)
    if (current) socket.client.emit('nft.updated', current)
  })
  socket.client.on('order:watch', (_event, orderId: string, token: string) => {
    const userId = typeof token === 'string' ? validateSession?.(token) : null
    if (
      typeof orderId !== 'string' ||
      !userId ||
      !authorizeOrder?.(orderId, userId)
    ) return
    client.sessionToken = token
    client.userId = userId
    client.orderIds.set(orderId, userId)
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

export function publishOrderEvent(
  event: SocketEvent<{ status: 'pending' | 'confirmed' | 'declined' }>,
  ownerId: string,
  beforePublish?: () => void,
): boolean {
  if (
    orderEventIds.has(event.eventId) ||
    event.version <= (latestOrderVersions.get(event.resource.id) ?? 0)
  ) return false
  orderEventIds.add(event.eventId)
  latestOrderVersions.set(event.resource.id, event.version)
  beforePublish?.()
  for (const client of clients) {
    if (
      client.orderIds.get(event.resource.id) === ownerId &&
      client.userId === ownerId &&
      client.sessionToken &&
      validateSession?.(client.sessionToken) === ownerId
    ) {
      client.socket.client.emit('order.updated', event)
    }
  }
  return true
}

export function getAcknowledgedSocketEvents() {
  return [...acknowledgedEvents]
}

export function getSocketMockState() {
  return {
    clients: [...clients].map(({ nftIds, orderIds, userId }) => ({
      nftIds: [...nftIds],
      orderIds: [...orderIds.keys()],
      userId,
    })),
    acknowledgedEvents: [...acknowledgedEvents],
  }
}

export function resetSocketMocks() {
  acknowledgedEvents.clear()
  latestNFTEvents.clear()
  orderEventIds.clear()
  latestOrderVersions.clear()
  for (const client of clients) {
    client.nftIds.clear()
    client.orderIds.clear()
    client.sessionToken = null
    client.userId = null
  }
}

export function dropMockSocketConnections() {
  for (const client of clients) client.connection.client.close(1001, 'Simulated connection drop')
  clients.clear()
}

export const socketBindingHandlers = socketHandlers
