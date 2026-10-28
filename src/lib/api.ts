import { api } from './axios'
import type { NFT, NFTPage, Order, User } from '../types/nft'

export interface CatalogParams {
  q: string
  collection: string
  blockchain: string
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

export async function getOrder(id: string) {
  const { data } = await api.get<Order>(`/orders/${id}`)
  return data
}

export async function createOrder(items: Array<{ nftId: string; quantity: number }>) {
  const { data } = await api.post<Order>('/orders', { items })
  return data
}
