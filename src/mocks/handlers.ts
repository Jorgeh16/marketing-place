import { http, HttpResponse } from 'msw'
import type { NFT, Order, User } from '../types/nft'
import { nfts } from './data/nfts'

const orders = new Map<string, Order>()
const users = new Map<string, { user: User; password: string }>([
  ['demo@example.com', {
    user: { id: 'user-demo', name: 'NFT Collector', email: 'demo@example.com' },
    password: 'demo123',
  }],
  ['collector@example.com', {
    user: { id: 'user-collector', name: 'Alex Morgan', email: 'collector@example.com' },
    password: 'collect123',
  }],
])
const demoUser = users.get('demo@example.com')!.user
const revokedSessions = new Set<string>()
const orderOwners = new Map<string, string>()
const idempotentOrders = new Map<string, { fingerprint: string; order: Order }>()
let orderCount = 0

function resetMockState() {
  orders.clear()
  orderOwners.clear()
  idempotentOrders.clear()
  revokedSessions.clear()
  orderCount = 0
  users.clear()
  users.set('demo@example.com', {
    user: { id: 'user-demo', name: 'NFT Collector', email: 'demo@example.com' },
    password: 'demo123',
  })
  users.set('collector@example.com', {
    user: { id: 'user-collector', name: 'Alex Morgan', email: 'collector@example.com' },
    password: 'collect123',
  })
}

function getAuthenticatedUser(request: Request): User | null {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const token = authorization.slice('Bearer '.length)
  if (revokedSessions.has(token)) return null
  const [, payload] = token.split('.')
  if (!payload) return null

  try {
    const user: unknown = JSON.parse(decodeURIComponent(atob(payload)))
    if (
      typeof user === 'object' &&
      user !== null &&
      'id' in user &&
      typeof user.id === 'string' &&
      'name' in user &&
      typeof user.name === 'string' &&
      'email' in user &&
      typeof user.email === 'string'
    ) {
      return { id: user.id, name: user.name, email: user.email }
    }
  } catch {
    return null
  }

  return null
}

function createSession(user: User) {
  const payload = btoa(encodeURIComponent(JSON.stringify(user)))
  const token = `mock-session-${crypto.randomUUID()}.${payload}`
  return { user, token }
}

export const handlers = [
  http.post('*/api/test/reset', () => {
    resetMockState()
    return HttpResponse.json({ reset: true })
  }),
  http.get('*/api/test/state', () => HttpResponse.json({ orderCount })),
  http.post('*/api/test/reset', () => {
    resetMockState()
    return HttpResponse.json({ reset: true })
  }),
  http.get('*/api/test/state', () => HttpResponse.json({ orderCount })),
  http.get('*/api/nfts', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q')?.trim().toLocaleLowerCase() ?? ''
    const collection = url.searchParams.get('collection') ?? ''
    const blockchain = url.searchParams.get('blockchain') ?? ''
    const category = url.searchParams.get('category') ?? ''
    const rarity = url.searchParams.get('rarity') ?? ''
    const availability = url.searchParams.get('availability') ?? ''
    const sort = url.searchParams.get('sort') ?? 'newest'
    const page = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1))
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(url.searchParams.get('limit')) || 12)))

    const filtered = nfts
      .filter((nft) => {
        const matchesQuery =
            !query || nft.name.toLocaleLowerCase().includes(query)
        return (
          matchesQuery &&
          (!collection || nft.collection === collection) &&
          (!blockchain || nft.blockchain === blockchain) &&
          (!category || nft.category === category) &&
          (!rarity || nft.rarity === rarity) &&
          (!availability ||
            (availability === 'sold-out' && nft.stock === 0) ||
            (availability === 'low-stock' && nft.stock > 0 && nft.stock <= 3) ||
            (availability === 'available' && nft.stock > 3))
        )
      })
      .sort((first, second) => {
        if (sort === 'price-asc') return Number(first.price) - Number(second.price)
        if (sort === 'price-desc') return Number(second.price) - Number(first.price)
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
    const email = body.email?.trim().toLocaleLowerCase() ?? ''
    const account = users.get(email)
    if (!account || account.password !== body.password) {
      return HttpResponse.json({ message: 'E-mail ou senha inválidos' }, { status: 401 })
    }

    return HttpResponse.json(createSession(account.user))
  }),
  http.post('*/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as { name?: string; email?: string; password?: string }
    const name = body.name?.trim() ?? ''
    const email = body.email?.trim().toLocaleLowerCase() ?? ''
    const password = body.password
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 8) {
      return HttpResponse.json({ message: 'Confira os dados informados.' }, { status: 400 })
    }
    if (users.has(email)) {
      return HttpResponse.json({ message: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }

    const user: User = { id: `user-${crypto.randomUUID()}`, name, email }
    users.set(email, { user, password })
    return HttpResponse.json(createSession(user), { status: 201 })
  }),
  http.get('*/api/session', ({ request }) => {
    const user = getAuthenticatedUser(request)
    return user
      ? HttpResponse.json(user)
      : HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
  }),
  http.post('*/api/auth/logout', ({ request }) => {
    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    }
    revokedSessions.add(authorization.slice('Bearer '.length))
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('*/api/orders', async ({ request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })

    const idempotencyKey = request.headers.get('idempotency-key')
    if (!idempotencyKey) {
      return HttpResponse.json({ message: 'Idempotency-Key é obrigatório.' }, { status: 400 })
    }

    const body = (await request.json()) as {
      items?: Array<{ nftId: string; quantity: number }>
    }
    const requestItems = body.items ?? []
    if (
      requestItems.length === 0 ||
      requestItems.some(({ nftId, quantity }) =>
        !nfts.some((nft) => nft.id === nftId && nft.stock >= quantity) ||
        !Number.isInteger(quantity) ||
        quantity < 1,
      )
    ) {
      return HttpResponse.json({ message: 'O pedido contém itens inválidos.' }, { status: 400 })
    }

    const fingerprint = JSON.stringify({
      userId: user.id,
      items: [...requestItems].sort((first, second) => first.nftId.localeCompare(second.nftId)),
    })
    const previous = idempotentOrders.get(idempotencyKey)
    if (previous) {
      return previous.fingerprint === fingerprint
        ? HttpResponse.json(previous.order)
        : HttpResponse.json(
            { message: 'Esta chave de idempotência já foi usada com outro conteúdo.' },
            { status: 409 },
          )
    }

    const items = requestItems.map(({ nftId, quantity }) => ({
      nft: nfts.find((nft) => nft.id === nftId)!,
      quantity,
    }))
    const totals = items.reduce((result, item) => {
      result.set(
        item.nft.currency,
        (result.get(item.nft.currency) ?? 0) + Number(item.nft.price) * item.quantity,
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
    orderOwners.set(order.id, user.id)
    idempotentOrders.set(idempotencyKey, { fingerprint, order })
    orderCount += 1
    return HttpResponse.json(order, { status: 201 })
  }),
  http.get('*/api/orders/:id', ({ params, request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })

    const id = String(params.id)
    const order = orders.get(id)
    return order && orderOwners.get(id) === user.id
      ? HttpResponse.json(order)
      : HttpResponse.json({ message: 'Pedido não encontrado' }, { status: 404 })
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
        (result.get(item.nft.currency) ?? 0) + Number(item.nft.price) * item.quantity,
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