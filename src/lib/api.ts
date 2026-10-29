import { api } from './axios'
import type { NFT, NFTPage, Order, OrderQuote, User } from '../types/nft'

export interface CatalogParams {
  q: string
  collection: string
  blockchain: string
  category: string
  rarity: string
  availability: string
  sort: string
  page: number
  limit: number
}

export async function getNFTs(params: CatalogParams) {
  const { data } = await api.get<NFTPage>('/nfts', { params })
  return data
}

export async function getNFT(id: string) {
  const { data } = await api.get<NFT>(`/nfts/${id}`)
  return data
}

export async function login(credentials: { email: string; password: string }) {
  const { data } = await api.post<{ user: User; token: string }>('/auth/login', credentials)
  return data
}

export async function register(credentials: { name: string; email: string; password: string }) {
  const { data } = await api.post<{ user: User; token: string }>('/auth/register', credentials)
  return data
}

export async function logout() {
  await api.post('/auth/logout')
}

export async function getOrder(id: string) {
  const { data } = await api.get<Order>(`/orders/${id}`)
  return data
}

export async function createOrder(
  items: Array<{ nftId: string; quantity: number }>,
  idempotencyKey: string,
  payment: {
    quote: OrderQuote
    collector: { name: string; email: string }
    walletId: string
    network: string
    decision: 'confirm' | 'decline'
  },
) {
  const { data } = await api.post<Order>(
    '/orders',
    { items, coupon: payment.quote.coupon, ...payment },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
  return data
}

export async function getFavorites() {
  const { data } = await api.get<{ items: string[] }>('/favorites')
  return data.items
}

export async function addFavorite(nftId: string) {
  await api.post('/favorites', { nftId })
}

export async function removeFavorite(nftId: string) {
  await api.delete(`/favorites/${encodeURIComponent(nftId)}`)
}

export async function getQuote(input: { items: Array<{ nftId: string; quantity: number }>; coupon?: string }) {
  const { data } = await api.post<OrderQuote>('/quote', input)
  return data
}

export async function getProfile() {
  const { data } = await api.get<User & { avatar?: string }>('/profile')
  return data
}

export async function updateProfile(input: { name: string; email: string; avatar?: string }) {
  const { data } = await api.put<User & { avatar?: string }>('/profile', input)
  return data
}

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  await api.put('/profile/password', input)
}

export interface Wallet {
  id: string
  name: string
  address: string
  network: string
  primary: boolean
}

export async function getWallets() {
  const { data } = await api.get<{ items: Wallet[] }>('/wallets')
  return data.items
}

export async function saveWallet(wallet: Omit<Wallet, 'id'> & { id?: string }) {
  const { data } = await api.put<Wallet>('/wallets', wallet)
  return data
}

export async function getPendingOrder() {
  const { data } = await api.get<Order | null>('/orders/pending')
  return data
}
