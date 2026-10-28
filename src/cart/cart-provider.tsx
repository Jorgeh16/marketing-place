import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { NFT } from '../types/nft'

export interface CartItem {
  nft: NFT
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  count: number
  totals: Array<{ currency: NFT['currency']; amount: number }>
  add: (nft: NFT) => void
  remove: (nftId: string) => void
  setQuantity: (nftId: string, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function readCart(): CartItem[] {
  const stored = localStorage.getItem('cart-items')
  if (!stored) return []

  const parsed: unknown = JSON.parse(stored)
  if (!Array.isArray(parsed)) throw new Error('Os dados salvos no carrinho são inválidos.')

  return parsed.filter(
    (item): item is CartItem =>
      typeof item === 'object' &&
      item !== null &&
      'nft' in item &&
      typeof item.nft === 'object' &&
      item.nft !== null &&
      'id' in item.nft &&
      typeof item.nft.id === 'string' &&
      'price' in item.nft &&
      typeof item.nft.price === 'number' &&
      'quantity' in item &&
      typeof item.quantity === 'number' &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0,
  )
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart)

  useEffect(() => {
    localStorage.setItem('cart-items', JSON.stringify(items))
  }, [items])

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    totals: Array.from(items.reduce((totals, item) => {
      totals.set(
        item.nft.currency,
        (totals.get(item.nft.currency) ?? 0) + item.nft.price * item.quantity,
      )
      return totals
    }, new Map<NFT['currency'], number>()), ([currency, amount]) => ({ currency, amount })),
    add: (nft) => setItems((current) => {
      const existing = current.find((item) => item.nft.id === nft.id)
      return existing
        ? current.map((item) => item.nft.id === nft.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { nft, quantity: 1 }]
    }),
    remove: (nftId) => setItems((current) => current.filter((item) => item.nft.id !== nftId)),
    setQuantity: (nftId, quantity) => {
      if (quantity < 1) return
      setItems((current) => current.map((item) =>
        item.nft.id === nftId ? { ...item, quantity } : item,
      ))
    },
    clear: () => setItems([]),
  }), [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const cart = useContext(CartContext)
  if (!cart) throw new Error('useCart deve ser usado dentro de CartProvider.')
  return cart
}
