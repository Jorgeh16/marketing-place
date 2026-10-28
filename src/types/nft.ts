export interface NFT {
  id: string
  name: string
  description: string
  image: string
  price: number
  currency: 'ETH' | 'SOL' | 'MATIC'
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
