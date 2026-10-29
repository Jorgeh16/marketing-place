import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { nfts } from './data/nfts'

type NFTUpdate = { id: string; version: number; price: string; likes?: number }

const currentUpdates = new Map<string, NFTUpdate>()
const acknowledgedEvents = new Set<string>()
let connectedClients = 0
const httpServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  if (request.method === 'POST' && url.pathname === '/__test/reset') {
    currentUpdates.clear()
    acknowledgedEvents.clear()
    response.writeHead(204).end()
    return
  }
  if (request.method === 'GET' && url.pathname === '/__test/state') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ connectedClients, acknowledgedEvents: [...acknowledgedEvents] }))
    return
  }

  const match = url.pathname.match(/^\/__test\/nfts\/([^/]+)\/events$/)
  if (request.method !== 'POST' || !match) {
    response.writeHead(404).end()
    return
  }

  const nftId = decodeURIComponent(match[1])
  const nft = nfts.find((item) => item.id === nftId)
  if (!nft) {
    response.writeHead(404).end()
    return
  }

  try {
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(Buffer.from(chunk))
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      version?: number
      price?: number
      likes?: number
    }
    if (
      !Number.isInteger(body.version) ||
      typeof body.version !== 'number' ||
      typeof body.price !== 'number' ||
      !Number.isFinite(body.price) ||
      body.price <= 0 ||
      (body.likes !== undefined && (!Number.isInteger(body.likes) || body.likes < 0))
    ) {
      response.writeHead(400).end()
      return
    }

    const eventId = request.headers['x-event-id']
    const update: NFTUpdate & { eventId?: string } = {
      id: nftId,
      version: body.version,
      price: String(body.price),
      ...(body.likes === undefined ? {} : { likes: body.likes }),
      ...(typeof eventId === 'string' ? { eventId } : {}),
    }
    const current = currentUpdates.get(nftId)
    if (!current || update.version > current.version) currentUpdates.set(nftId, update)
    io.emit('nft.updated', update)
    response.writeHead(202, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ accepted: true }))
  } catch {
    response.writeHead(400).end()
  }
})
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:4175',
    ],
  },
})

io.on('connection', (socket) => {
  connectedClients += 1
  socket.on('disconnect', () => {
    connectedClients -= 1
  })
  socket.on('nft.updated:ack', (eventId: string) => {
    if (typeof eventId === 'string') acknowledgedEvents.add(eventId)
  })

  socket.on('nft:watch', (nftId: string) => {
    const nft = nfts.find((item) => item.id === nftId)
    if (!nft) return

    setTimeout(() => {
      const current = currentUpdates.get(nftId) ?? {
        id: nft.id,
        version: 1,
        price: nft.price,
        likes: nft.likes,
      }
      const update = {
        ...current,
        version: current.version + 1,
        likes: (current.likes ?? nft.likes) + 1,
      }
      currentUpdates.set(nftId, update)
      socket.emit('nft.updated', update)
    }, 1000)
  })

  socket.on('order:watch', (orderId: string) => {
    if (!orderId) return

    const room = `order:${orderId}`
    socket.join(room)
    const statuses = ['confirmed', 'completed'] as const

    statuses.forEach((status, index) => {
      setTimeout(() => {
        io.to(room).emit('order:update', { orderId, status })
      }, (index + 1) * 3000)
    })
  })
})

const port = Number(process.env.SOCKET_PORT) || 3001
httpServer.listen(port, '127.0.0.1', () => {
  console.log(`Mock Socket.IO server listening on port ${port}`)
})
