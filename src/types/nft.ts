export interface NFT {
  id: string
  name: string
  description: string
  image: string
  price: string
  version?: number
  currency: 'ETH' | 'SOL' | 'MATIC'
  category: string
  rarity: 'Comum' | 'Incomum' | 'Raro' | 'Épico' | 'Lendário'
  stock: number
  imageAlt: string
  creator: {
    name: string
    username: string
  }
  collection: string
  blockchain: 'Ethereum' | 'Solana' | 'Polygon'
  tokenId: string
  likes: number
  createdAt: string
}

export interface NFTPage {
  items: NFT[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface OrderItem {
  nft: NFT
  quantity: number
}

export type OrderStatus = 'processing' | 'confirmed' | 'completed'

export interface Order {
  id: string
  items: OrderItem[]
  total: Array<{ currency: NFT['currency']; amount: number }>
  status: OrderStatus
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
}