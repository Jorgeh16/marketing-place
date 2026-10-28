import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { nfts } from './data/nfts'

const httpServer = createServer()
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
  socket.on('nft:watch', (nftId: string) => {
    const nft = nfts.find((item) => item.id === nftId)
    if (!nft) return

    setTimeout(() => {
      socket.emit('nft.updated', { id: nft.id, likes: nft.likes + 1 })
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
