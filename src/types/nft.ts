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

export type OrderStatus = 'pending' | 'confirmed' | 'declined'

export interface Order {
  id: string
  items: OrderItem[]
  total: Array<{ currency: NFT['currency']; amount: number }>
  quote: OrderQuote
  status: OrderStatus
  version: number
  createdAt: string
  updatedAt: string
  receipt: {
    items: OrderItem[]
    subtotal: string
    discount: string
    networkFee: string
    total: string
    currency: 'ETH'
    coupon?: string
  }
}

export interface OrderQuote {
  items: Array<{ nftId: string; quantity: number; unitPrice: string }>
  coupon?: string
  subtotal: string
  discount: string
  networkFee: string
  total: string
  currency: 'ETH'
}

export interface User {
  id: string
  name: string
  email: string
}