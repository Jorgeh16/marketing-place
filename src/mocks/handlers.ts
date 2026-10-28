import { http, HttpResponse } from 'msw'
import type { NFT, Order, User } from '../types/nft'
import { nfts } from './data/nfts'

const orders = new Map<string, Order>()
const demoUser: User = {
  id: 'user-demo',
  name: 'NFT Collector',
  email: 'demo@example.com',
}

export const handlers = [
  http.get('*/api/nfts', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')?.trim().toLocaleLowerCase() ?? ''
    const collection = url.searchParams.get('collection') ?? ''
    const blockchain = url.searchParams.get('blockchain') ?? ''
    const sort = url.searchParams.get('sort') ?? 'newest'
    const page = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1))
    const pageSize = Math.min(24, Math.max(1, Math.floor(Number(url.searchParams.get('limit')) || 12)))

    const filtered = nfts
      .filter((nft) => {
        const matchesQuery =
          !query ||
          `${nft.name} ${nft.creator.name} ${nft.collection}`.toLocaleLowerCase().includes(query)
        return (
          matchesQuery &&
          (!collection || nft.collection === collection) &&
          (!blockchain || nft.blockchain === blockchain)
        )
      })
      .sort((first, second) => {
        if (sort === 'price-asc') return first.price - second.price
        if (sort === 'price-desc') return second.price - first.price
        return second.createdAt.localeCompare(first.createdAt)
      })

    const start = (page - 1) * pageSize
    return HttpResponse.json({
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    })
  }),
  http.get('*/api/nfts/:id', ({ params }) => {
    const nft = nfts.find((item) => item.id === params.id)
    return nft
      ? HttpResponse.json(nft)
      : HttpResponse.json({ message: 'NFT não encontrado' }, { status: 404 })
  }),
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string }
    if (body.email !== demoUser.email || body.password !== 'demo123') {
      return HttpResponse.json({ message: 'E-mail ou senha inválidos' }, { status: 401 })
    }

    return HttpResponse.json({ user: demoUser, token: 'demo-token' })
  }),
  http.get('*/api/auth/me', ({ request }) => {
    return request.headers.get('authorization') === 'Bearer demo-token'
      ? HttpResponse.json(demoUser)
      : HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
  }),
  http.post('*/api/orders', async ({ request }) => {
    if (request.headers.get('authorization') !== 'Bearer demo-token') {
      return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    }

    const body = (await request.json()) as {
      items?: Array<{ nftId: string; quantity: number }>
    }
    const items = (body.items ?? [])
      .map(({ nftId, quantity }) => ({
        nft: nfts.find((nft) => nft.id === nftId),
        quantity: Math.max(1, Math.floor(quantity)),
      }))
      .filter((item): item is { nft: NFT; quantity: number } => item.nft !== undefined)

    if (items.length === 0) {
      return HttpResponse.json({ message: 'O pedido precisa ter pelo menos um item' }, { status: 400 })
    }

    const totals = items.reduce((result, item) => {
      result.set(
        item.nft.currency,
        (result.get(item.nft.currency) ?? 0) + item.nft.price * item.quantity,
      )
      return result
    }, new Map<NFT['currency'], number>())
    const order: Order = {
      id: `ord-${crypto.randomUUID()}`,
      items,
      total: Array.from(totals, ([currency, amount]) => ({
        currency,
        amount: Number(amount.toFixed(3)),
      })),
      status: 'processing',
      createdAt: new Date().toISOString(),
    }
    orders.set(order.id, order)
    return HttpResponse.json(order, { status: 201 })
  }),
  http.get('*/api/orders/:id', ({ params, request }) => {
    if (request.headers.get('authorization') !== 'Bearer demo-token') {
      return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    }

    const order = orders.get(String(params.id))
    return order
      ? HttpResponse.json(order)
      : HttpResponse.json({ message: 'Pedido não encontrado' }, { status: 404 })
  }),
]