import { http, HttpResponse } from 'msw'
import Decimal from 'decimal.js'
import type { Order, OrderQuote, User } from '../types/nft'
import { nfts } from './data/nfts'
import {
  dropMockSocketConnections,
  getAcknowledgedSocketEvents,
  getSocketMockState,
  publishNFTEvent,
  publishOrderEvent,
  resetSocketMocks,
  setSocketAuthorization,
  socketBindingHandlers,
} from './socket-binding'

const persistedStateKey = 'forma-mock-state-v1'
const orders = new Map<string, Order>()
const orderOwners = new Map<string, string>()
const idempotentOrders = new Map<string, { fingerprint: string; order: Order }>()
const pendingDecisions = new Map<string, 'confirm' | 'decline'>()
const pendingDueAt = new Map<string, number>()
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
const revokedSessions = new Set<string>()
const sessionOwners = new Map<string, string>()
const favoritesByUser = new Map<string, Set<string>>()
const nftEventIds = new Set<string>()
const profiles = new Map<string, User & { avatar?: string }>()
const walletsByUser = new Map<string, Array<{
  id: string
  name: string
  address: string
  network: string
  primary: boolean
}>>()
const initialStocks = new Map(nfts.map((nft) => [nft.id, nft.stock]))
const initialPrices = new Map(nfts.map((nft) => [nft.id, nft.price]))
const initialVersions = new Map(nfts.map((nft) => [nft.id, nft.version]))
let orderCount = 0
let activeScenario = 'default'
let favoriteFailureNext = false
let mockGeneration = 0

interface PersistedMockState {
  version: 1
  orders: Array<[string, Order]>
  orderOwners: Array<[string, string]>
  idempotentOrders: Array<[string, { fingerprint: string; order: Order }]>
  pendingDecisions: Array<[string, 'confirm' | 'decline']>
  pendingDueAt: Array<[string, number]>
  stocks: Array<[string, number]>
  orderCount: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOrder(value: unknown): value is Order {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    (value.status === 'pending' || value.status === 'confirmed' || value.status === 'declined') &&
    typeof value.version === 'number' &&
    Array.isArray(value.items) &&
    isRecord(value.receipt)
  )
}

function isOrderStatus(value: unknown): value is Order['status'] {
  return value === 'pending' || value === 'confirmed' || value === 'declined'
}

function isPersistedMockState(value: unknown): value is PersistedMockState {
  if (!isRecord(value) || value.version !== 1 || typeof value.orderCount !== 'number') return false
  return (
    Array.isArray(value.orders) &&
    value.orders.every((entry) => Array.isArray(entry) && typeof entry[0] === 'string' && isOrder(entry[1])) &&
    Array.isArray(value.orderOwners) &&
    value.orderOwners.every((entry) => Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'string') &&
    Array.isArray(value.idempotentOrders) &&
    value.idempotentOrders.every((entry) =>
      Array.isArray(entry) &&
      typeof entry[0] === 'string' &&
      isRecord(entry[1]) &&
      typeof entry[1].fingerprint === 'string' &&
      isOrder(entry[1].order),
    ) &&
    Array.isArray(value.pendingDecisions) &&
    value.pendingDecisions.every((entry) =>
      Array.isArray(entry) &&
      typeof entry[0] === 'string' &&
      (entry[1] === 'confirm' || entry[1] === 'decline'),
    ) &&
    Array.isArray(value.pendingDueAt) &&
    value.pendingDueAt.every((entry) =>
      Array.isArray(entry) &&
      typeof entry[0] === 'string' &&
      typeof entry[1] === 'number' &&
      Number.isFinite(entry[1]),
    ) &&
    Array.isArray(value.stocks) &&
    value.stocks.every((entry) =>
      Array.isArray(entry) &&
      typeof entry[0] === 'string' &&
      typeof entry[1] === 'number' &&
      Number.isFinite(entry[1]) &&
      entry[1] >= 0,
    )
  )
}

function persistMockState() {
  const state: PersistedMockState = {
    version: 1,
    orders: [...orders],
    orderOwners: [...orderOwners],
    idempotentOrders: [...idempotentOrders],
    pendingDecisions: [...pendingDecisions],
    pendingDueAt: [...pendingDueAt],
    stocks: nfts.map(({ id, stock }) => [id, stock]),
    orderCount,
  }
  localStorage.setItem(persistedStateKey, JSON.stringify(state))
}

function completePendingOrder(orderId: string, generation: number) {
  const order = orders.get(orderId)
  const decision = pendingDecisions.get(orderId)
  if (generation !== mockGeneration || !order || order.status !== 'pending' || !decision) return

  order.status = decision === 'confirm' ? 'confirmed' : 'declined'
  order.version += 1
  order.updatedAt = new Date().toISOString()
  pendingDecisions.delete(orderId)
  pendingDueAt.delete(orderId)
  if (decision === 'decline') {
    for (const { nftId, quantity } of order.quote.items) {
      const nft = nfts.find(({ id }) => id === nftId)
      if (nft) nft.stock += quantity
    }
  }
  persistMockState()
  const ownerId = orderOwners.get(order.id)
  if (ownerId) {
    publishOrderEvent({
      eventId: `order-${order.id}-version-${order.version}`,
      resource: { id: order.id },
      version: order.version,
      data: { status: order.status },
    }, ownerId)
  }
}

function scheduleOrderCompletion(orderId: string) {
  const generation = mockGeneration
  const dueAt = pendingDueAt.get(orderId) ?? Date.now() + 500
  setTimeout(() => completePendingOrder(orderId, generation), Math.max(0, dueAt - Date.now()))
}

function restoreMockState() {
  const serialized = localStorage.getItem(persistedStateKey)
  if (!serialized) return
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (!isPersistedMockState(parsed)) {
      throw new Error('O estado persistido do mock possui formato inválido.')
    }
    orders.clear()
    for (const [id, order] of parsed.orders) orders.set(id, order)
    orderOwners.clear()
    for (const [id, ownerId] of parsed.orderOwners) orderOwners.set(id, ownerId)
    idempotentOrders.clear()
    for (const [key, entry] of parsed.idempotentOrders) {
      idempotentOrders.set(key, {
        fingerprint: entry.fingerprint,
        order: orders.get(entry.order.id) ?? entry.order,
      })
    }
    pendingDecisions.clear()
    for (const [id, decision] of parsed.pendingDecisions) pendingDecisions.set(id, decision)
    pendingDueAt.clear()
    for (const [id, dueAt] of parsed.pendingDueAt) pendingDueAt.set(id, dueAt)
    for (const [id, stock] of parsed.stocks) {
      const nft = nfts.find((item) => item.id === id)
      if (nft) nft.stock = stock
    }
    orderCount = parsed.orderCount
    for (const [id] of pendingDecisions) scheduleOrderCompletion(id)
  } catch (error) {
    console.error('Não foi possível restaurar o estado do marketplace simulado.', error)
    localStorage.removeItem(persistedStateKey)
  }
}

function resetScenarioChanges() {
  for (const nft of nfts) {
    nft.price = initialPrices.get(nft.id) ?? nft.price
    nft.stock = initialStocks.get(nft.id) ?? nft.stock
    nft.version = initialVersions.get(nft.id)
  }
}

function normalizeDecimal(value: Decimal) {
  return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '') || '0'
}

function createQuote(
  items: Array<{ nftId: string; quantity: number }>,
  coupon?: string,
): OrderQuote | string {
  const quantities = new Map<string, number>()
  for (const { nftId, quantity } of items) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return 'A quantidade dos itens é inválida.'
    }
    quantities.set(nftId, (quantities.get(nftId) ?? 0) + quantity)
  }
  const normalizedItems = Array.from(quantities, ([nftId, quantity]) => ({ nftId, quantity }))
  if (
    normalizedItems.length === 0 ||
    normalizedItems.some(({ nftId, quantity }) =>
      !nfts.some((nft) => nft.id === nftId && nft.stock >= quantity),
    )
  ) {
    return 'Um ou mais itens estão indisponíveis ou sem estoque suficiente.'
  }

  const subtotal = normalizedItems.reduce((sum, item) => {
    const nft = nfts.find(({ id }) => id === item.nftId)!
    return sum.plus(new Decimal(nft.price).mul(item.quantity))
  }, new Decimal(0))

  let discount = new Decimal(0)
  const normalizedCoupon = coupon?.trim().toUpperCase()
  if (normalizedCoupon === 'MARE20') return 'Este cupom expirou.'
  if (normalizedCoupon && activeScenario === 'coupon-invalid') return 'Cupom inválido.'
  if (normalizedCoupon) {
    if (normalizedCoupon !== 'TESOURO10') return 'Cupom inválido.'
    discount = subtotal.mul('0.10')
  }

  const networkFee = new Decimal('0.005')
  const total = Decimal.max(0, subtotal.minus(discount)).plus(networkFee)
  return {
    items: normalizedItems.map(({ nftId, quantity }) => ({
      nftId,
      quantity,
      unitPrice: nfts.find(({ id }) => id === nftId)!.price,
    })),
    ...(normalizedCoupon ? { coupon: normalizedCoupon } : {}),
    subtotal: normalizeDecimal(subtotal),
    discount: normalizeDecimal(discount),
    networkFee: normalizeDecimal(networkFee),
    total: normalizeDecimal(total),
    currency: 'ETH',
  }
}

function resetMockState() {
  mockGeneration += 1
  localStorage.removeItem(persistedStateKey)
  orders.clear()
  orderOwners.clear()
  idempotentOrders.clear()
  pendingDecisions.clear()
  pendingDueAt.clear()
  revokedSessions.clear()
  sessionOwners.clear()
  favoritesByUser.clear()
  nftEventIds.clear()
  profiles.clear()
  walletsByUser.clear()
  resetScenarioChanges()
  orderCount = 0
  activeScenario = 'default'
  favoriteFailureNext = false
  resetSocketMocks()
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
  const sessionUser = getSessionUser(token)
  if (!sessionUser) return null
  const account = Array.from(users.values()).find(({ user }) => user.id === sessionUser.id)
  return account?.user ?? sessionUser
}

function getSessionUser(token: string): User | null {
  if (activeScenario === 'expired-session' || revokedSessions.has(token)) return null
  const sessionUserId = sessionOwners.get(token)
  const [, payload] = token.split('.')
  if (!payload || !token.startsWith('mock-session-')) return null

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
      && (!sessionUserId || user.id === sessionUserId)
    ) {
      return { id: user.id, name: user.name, email: user.email }
    }
  } catch {
    return null
  }

  return null
}

setSocketAuthorization(
  (token) => getSessionUser(token)?.id ?? null,
  (orderId, userId) => orderOwners.get(orderId) === userId,
)

function createSession(user: User) {
  const payload = btoa(encodeURIComponent(JSON.stringify(user)))
  const token = `mock-session-${crypto.randomUUID()}.${payload}`
  sessionOwners.set(token, user.id)
  return { user, token }
}

function getUserProfile(user: User) {
  return profiles.get(user.id) ?? { ...user }
}

function getUserWallets(user: User) {
  return walletsByUser.get(user.id) ?? [
    {
      id: `${user.id}-wallet-primary`,
      name: 'Carteira principal',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'Ethereum',
      primary: true,
    },
    {
      id: `${user.id}-wallet-secondary`,
      name: 'Carteira secundária',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      network: 'Polygon',
      primary: false,
    },
  ]
}

restoreMockState()

export const handlers = [
  ...socketBindingHandlers,
  http.post('*/api/test/reset', () => {
    resetMockState()
    return HttpResponse.json({ reset: true })
  }),
  http.get('*/api/test/state', () => HttpResponse.json({
    orderCount,
    scenario: activeScenario,
    favoriteFailureNext,
    acknowledgedEvents: getAcknowledgedSocketEvents(),
    socket: getSocketMockState(),
  })),
  http.post('*/api/test/scenario', async ({ request }) => {
    const body = await request.json() as { scenario?: string }
    resetScenarioChanges()
    activeScenario = body.scenario ?? 'default'
    if (activeScenario === 'price-changed') {
      const nft = nfts.find(({ id }) => id === 'nft-001')
      if (nft) {
        nft.price = '0.5'
        nft.version = (nft.version ?? 1) + 1
      }
    }
    if (activeScenario === 'sold-out') {
      const nft = nfts.find(({ id }) => id === 'nft-001')
      if (nft) nft.stock = 0
    }
    if (activeScenario === 'connection-drop') dropMockSocketConnections()
    if (activeScenario === 'price-changed') {
      publishNFTEvent({
        eventId: `scenario-price-${crypto.randomUUID()}`,
        resource: { id: 'nft-001' },
        version: 2,
        data: { price: '0.5' },
      })
    }
    return HttpResponse.json({ scenario: activeScenario })
  }),
  http.post('*/api/test/favorites/fail-next', () => {
    favoriteFailureNext = true
    return HttpResponse.json({ armed: true })
  }),
  http.get('*/api/nfts', async ({ request }) => {
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
    if (activeScenario === 'timeout') return HttpResponse.error()
    if (activeScenario === 'error-4xx') {
      return HttpResponse.json({ message: 'Cenário reproduzível: erro de validação.' }, { status: 400 })
    }
    if (activeScenario === 'error-5xx') {
      return HttpResponse.json({ message: 'Cenário reproduzível: serviço indisponível.' }, { status: 503 })
    }
    if (activeScenario === 'slow') await new Promise((resolve) => setTimeout(resolve, 1500))
    if (activeScenario === 'variable-latency') {
      await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 1400))
    }
    if (activeScenario === 'out-of-order') {
      await new Promise((resolve) => setTimeout(resolve, page === 1 ? 1200 : 100))
    }

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
    if (activeScenario === 'timeout') return HttpResponse.error()
    if (activeScenario === 'error-4xx') {
      return HttpResponse.json({ message: 'Cenário reproduzível: NFT inválido.' }, { status: 400 })
    }
    const nft = nfts.find((item) => item.id === params.id)
    return nft
      ? HttpResponse.json(nft)
      : HttpResponse.json({ message: 'NFT não encontrado' }, { status: 404 })
  }),
  http.post('*/api/test/nfts/:id/events', async ({ params, request }) => {
    const nft = nfts.find(({ id }) => id === params.id)
    if (!nft) return HttpResponse.json({ message: 'NFT não encontrado' }, { status: 404 })
    const body = await request.json() as {
      eventId?: string
      version?: number
      price?: string
      stock?: number
    }
    if (
      typeof body.eventId !== 'string' ||
      typeof body.version !== 'number' ||
      !Number.isInteger(body.version) ||
      (body.price === undefined && body.stock === undefined) ||
      (body.price !== undefined &&
        (typeof body.price !== 'string' || !Number.isFinite(Number(body.price)) || Number(body.price) <= 0)) ||
      (body.stock !== undefined &&
        (typeof body.stock !== 'number' || !Number.isInteger(body.stock) || body.stock < 0))
    ) {
      return HttpResponse.json({ message: 'Evento NFT inválido.' }, { status: 400 })
    }
    if (nftEventIds.has(body.eventId)) return HttpResponse.json({ accepted: true, duplicate: true }, { status: 202 })
    nftEventIds.add(body.eventId)
    if ((body.version ?? 0) > (nft.version ?? 1)) {
      nft.version = body.version
      if (body.price !== undefined) nft.price = body.price
      if (body.stock !== undefined) nft.stock = body.stock
    }
    publishNFTEvent({
      eventId: body.eventId,
      resource: { id: nft.id },
      version: body.version,
      data: {
        ...(body.price === undefined ? {} : { price: body.price }),
        ...(body.stock === undefined ? {} : { stock: body.stock }),
      },
    })
    return HttpResponse.json({ accepted: true }, { status: 202 })
  }),
  http.post('*/api/test/orders/:id/events', async ({ params, request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    const orderId = String(params.id)
    if (orderOwners.get(orderId) !== user.id) {
      return HttpResponse.json({ message: 'Pedido não encontrado' }, { status: 404 })
    }

    const body = await request.json() as {
      eventId?: string
      version?: number
      status?: Order['status']
    }
    if (
      typeof body.eventId !== 'string' ||
      typeof body.version !== 'number' ||
      !Number.isInteger(body.version) ||
      !isOrderStatus(body.status)
    ) {
      return HttpResponse.json({ message: 'Evento de pedido inválido.' }, { status: 400 })
    }
    const { eventId, version, status } = body
    const order = orders.get(orderId)
    if (!order || version <= order.version) {
      return HttpResponse.json({ accepted: false }, { status: 200 })
    }
    const accepted = publishOrderEvent({
      eventId,
      resource: { id: orderId },
      version,
      data: { status },
    }, user.id, () => {
      order.status = status
      order.version = version
      order.updatedAt = new Date().toISOString()
      pendingDecisions.delete(orderId)
      pendingDueAt.delete(orderId)
      persistMockState()
    })
    return HttpResponse.json({ accepted }, { status: accepted ? 202 : 200 })
  }),
  http.get('*/api/favorites', ({ request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    return HttpResponse.json({ items: [...(favoritesByUser.get(user.id) ?? [])] })
  }),
  http.post('*/api/favorites', async ({ request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    if (favoriteFailureNext || activeScenario === 'favorite-failure') {
      favoriteFailureNext = false
      return HttpResponse.json({ message: 'Falha simulada ao salvar favorito.' }, { status: 503 })
    }

    const body = await request.json() as { nftId?: string }
    if (!body.nftId || !nfts.some(({ id }) => id === body.nftId)) {
      return HttpResponse.json({ message: 'NFT inválido.' }, { status: 404 })
    }
    const favorites = favoritesByUser.get(user.id) ?? new Set<string>()
    favorites.add(body.nftId)
    favoritesByUser.set(user.id, favorites)
    return HttpResponse.json({ items: [...favorites] }, { status: 201 })
  }),
  http.delete('*/api/favorites/:nftId', ({ params, request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    if (favoriteFailureNext || activeScenario === 'favorite-failure') {
      favoriteFailureNext = false
      return HttpResponse.json({ message: 'Falha simulada ao remover favorito.' }, { status: 503 })
    }
    favoritesByUser.get(user.id)?.delete(String(params.nftId))
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('*/api/quote', async ({ request }) => {
    if (activeScenario === 'timeout') return HttpResponse.error()
    if (activeScenario === 'error-5xx') {
      return HttpResponse.json({ message: 'Cenário reproduzível: cotação indisponível.' }, { status: 503 })
    }
    const body = await request.json() as {
      items?: Array<{ nftId: string; quantity: number }>
      coupon?: string
    }
    if (!body.items) {
      return HttpResponse.json({ message: 'Informe os itens da cotação.' }, { status: 400 })
    }
    const quote = createQuote(body.items, body.coupon)
    return typeof quote === 'string'
      ? HttpResponse.json({ message: quote }, { status: 422 })
      : HttpResponse.json(quote)
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
    if (activeScenario === 'registration-conflict') {
      return HttpResponse.json({ message: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }
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
  http.get('*/api/profile', ({ request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    return HttpResponse.json(getUserProfile(user))
  }),
  http.put('*/api/profile', async ({ request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    const body = await request.json() as { name?: string; email?: string; avatar?: string }
    const name = body.name?.trim() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return HttpResponse.json({ message: 'Informe um nome e e-mail válidos.' }, { status: 400 })
    }
    const accountWithEmail = users.get(email)
    if (accountWithEmail && accountWithEmail.user.id !== user.id) {
      return HttpResponse.json({ message: 'Este e-mail já está em uso.' }, { status: 409 })
    }
    const account = users.get(user.email.toLowerCase())
    if (account) users.delete(user.email.toLowerCase())
    const updatedUser = { ...user, name, email }
    if (account) users.set(email, { ...account, user: updatedUser })
    const profile = { ...updatedUser, ...(body.avatar ? { avatar: body.avatar } : {}) }
    profiles.set(user.id, profile)
    return HttpResponse.json(profile)
  }),
  http.put('*/api/profile/password', async ({ request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    const body = await request.json() as { currentPassword?: string; newPassword?: string }
    const account = users.get(user.email.toLowerCase())
    if (!account || account.password !== body.currentPassword) {
      return HttpResponse.json({ message: 'A senha atual está incorreta.' }, { status: 400 })
    }
    if (!body.newPassword || body.newPassword.length < 8) {
      return HttpResponse.json({ message: 'A nova senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
    }
    users.set(user.email.toLowerCase(), { ...account, password: body.newPassword })
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('*/api/wallets', ({ request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    return HttpResponse.json({ items: getUserWallets(user) })
  }),
  http.put('*/api/wallets', async ({ request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    const body = await request.json() as {
      id?: string
      name?: string
      address?: string
      network?: string
      primary?: boolean
    }
    if (
      !body.name?.trim() ||
      !/^0x[a-fA-F0-9]{40}$/.test(body.address ?? '') ||
      !['Ethereum', 'Polygon'].includes(body.network ?? '') ||
      typeof body.primary !== 'boolean'
    ) {
      return HttpResponse.json({ message: 'Confira os dados da carteira.' }, { status: 400 })
    }
    const wallets = getUserWallets(user).map((wallet) => ({
      ...wallet,
      primary: body.primary ? false : wallet.primary,
    }))
    const id = body.id ?? `${user.id}-wallet-${crypto.randomUUID()}`
    const saved = {
      id,
      name: body.name.trim(),
      address: body.address!,
      network: body.network!,
      primary: body.primary,
    }
    const existingIndex = wallets.findIndex((wallet) => wallet.id === id)
    if (existingIndex < 0 && wallets.length >= 2) {
      return HttpResponse.json({ message: 'O perfil aceita até duas carteiras.' }, { status: 409 })
    }
    if (existingIndex < 0) wallets.push(saved)
    else wallets[existingIndex] = saved
    if (!wallets.some(({ primary }) => primary)) wallets[0].primary = true
    walletsByUser.set(user.id, wallets)
    return HttpResponse.json(saved)
  }),
  http.post('*/api/orders', async ({ request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })

    const idempotencyKey = request.headers.get('idempotency-key')
    if (!idempotencyKey) {
      return HttpResponse.json({ message: 'Idempotency-Key é obrigatório.' }, { status: 400 })
    }

    const body = await request.json() as {
      items?: Array<{ nftId: string; quantity: number }>
      quote?: OrderQuote
      coupon?: string
      collector?: { name?: string; email?: string }
      walletId?: string
      network?: string
      decision?: 'confirm' | 'decline'
    }
    const requestItems = body.items ?? []
    const collector = {
      name: body.collector?.name?.trim() || user.name,
      email: body.collector?.email?.trim() || user.email,
    }
    const decision = activeScenario === 'payment-declined'
      ? 'decline'
      : activeScenario === 'payment-confirmed'
        ? 'confirm'
        : body.decision === 'decline'
          ? 'decline'
          : 'confirm'
    const fingerprint = JSON.stringify({
      userId: user.id,
      items: [...requestItems].sort((first, second) => first.nftId.localeCompare(second.nftId)),
      coupon: body.coupon?.trim().toUpperCase() ?? null,
      quote: body.quote ?? null,
      collector,
      walletId: body.walletId ?? 'demo-wallet',
      network: body.network ?? 'Ethereum',
      decision,
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

    const quoteResult = createQuote(requestItems, body.coupon)
    if (typeof quoteResult === 'string') {
      return HttpResponse.json({ message: quoteResult }, { status: 409 })
    }
    if (body.quote && JSON.stringify(body.quote) !== JSON.stringify(quoteResult)) {
      return HttpResponse.json({ message: 'A cotação mudou. Revise os valores antes de confirmar.' }, { status: 409 })
    }

    const items = quoteResult.items.map(({ nftId, quantity }) => ({
      nft: structuredClone(nfts.find((nft) => nft.id === nftId)!),
      quantity,
    }))
    const now = new Date().toISOString()
    const order: Order = {
      id: `ord-${crypto.randomUUID()}`,
      items,
      total: [{ currency: 'ETH', amount: Number(quoteResult.total) }],
      quote: structuredClone(quoteResult),
      status: 'pending',
      version: 1,
      createdAt: now,
      updatedAt: now,
      receipt: {
        items: structuredClone(items),
        subtotal: quoteResult.subtotal,
        discount: quoteResult.discount,
        networkFee: quoteResult.networkFee,
        total: quoteResult.total,
        currency: quoteResult.currency,
        ...(quoteResult.coupon ? { coupon: quoteResult.coupon } : {}),
      },
    }
    orders.set(order.id, order)
    orderOwners.set(order.id, user.id)
    idempotentOrders.set(idempotencyKey, { fingerprint, order })
    pendingDecisions.set(order.id, decision)
    pendingDueAt.set(
      order.id,
      Date.now() + (
        activeScenario === 'order-timeout-after-create' || activeScenario === 'order-pending'
          ? 10_000
          : 500
      ),
    )
    orderCount += 1
    for (const { nftId, quantity } of quoteResult.items) {
      const nft = nfts.find(({ id }) => id === nftId)!
      nft.stock -= quantity
    }
    persistMockState()
    scheduleOrderCompletion(order.id)
    if (activeScenario === 'order-timeout-after-create') return HttpResponse.error()
    return HttpResponse.json(order, { status: 201 })
  }),
  http.get('*/api/orders/pending', ({ request }) => {
    const user = getAuthenticatedUser(request)
    if (!user) return HttpResponse.json({ message: 'Não autenticado' }, { status: 401 })
    const pending = Array.from(orders.values()).find(
      (order) => orderOwners.get(order.id) === user.id && order.status === 'pending',
    )
    return HttpResponse.json(pending ?? null)
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
]