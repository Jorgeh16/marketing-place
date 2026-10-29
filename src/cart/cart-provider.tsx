import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { NFT } from '../types/nft'
import { connectToNFTUpdates } from '../lib/order-socket'

export interface CartItem {
  nft: NFT
  quantity: number
  acceptedVersion: number
}

interface CartContextValue {
  items: CartItem[]
  count: number
  totals: Array<{ currency: NFT['currency']; amount: number }>
  add: (nft: NFT) => void
  remove: (nftId: string) => void
  setQuantity: (nftId: string, quantity: number) => void
  removePurchased: (items: Array<{ nftId: string; quantity: number }>) => void
  acceptPrice: (nftId: string) => void
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
      (typeof item.nft.price === 'number' ||
        (typeof item.nft.price === 'string' && Number.isFinite(Number(item.nft.price)))) &&
      'quantity' in item &&
      typeof item.quantity === 'number' &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0,
  ).map((item) => ({
    ...item,
    nft: {
      ...item.nft,
      price: String(item.nft.price),
      category: typeof item.nft.category === 'string' ? item.nft.category : 'Relíquia',
      rarity: item.nft.rarity ?? 'Comum',
      stock: typeof item.nft.stock === 'number' ? item.nft.stock : Math.max(1, item.quantity),
      imageAlt: typeof item.nft.imageAlt === 'string' ? item.nft.imageAlt : item.nft.name,
    },
    acceptedVersion:
      'acceptedVersion' in item && typeof item.acceptedVersion === 'number'
        ? item.acceptedVersion
        : ('version' in item.nft && typeof item.nft.version === 'number' ? item.nft.version : 1),
  }))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart)

  useEffect(() => {
    localStorage.setItem('cart-items', JSON.stringify(items))
  }, [items])

  const trackedNFTIds = items.map(({ nft }) => nft.id).sort().join(',')
  useEffect(() => {
    if (!trackedNFTIds) return

    const socket = connectToNFTUpdates((update) => {
      setItems((current) => current.map((item) => {
        if (item.nft.id !== update.id || update.version <= (item.nft.version ?? 1)) return item
        return {
          ...item,
          nft: {
            ...item.nft,
            ...update,
            price: update.price === undefined ? item.nft.price : String(update.price),
          },
        }
      }))
    })
    return () => {
      socket?.disconnect()
    }
  }, [trackedNFTIds])

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    totals: Array.from(items.reduce((totals, item) => {
      totals.set(
        item.nft.currency,
        (totals.get(item.nft.currency) ?? 0) + Number(item.nft.price) * item.quantity,
      )
      return totals
    }, new Map<NFT['currency'], number>()), ([currency, amount]) => ({ currency, amount })),
    add: (nft) => setItems((current) => {
      if (nft.stock === 0) return current
      const existing = current.find((item) => item.nft.id === nft.id)
      if (existing && existing.quantity >= nft.stock) return current
      return existing
        ? current.map((item) => item.nft.id === nft.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { nft: { ...nft, version: nft.version ?? 1 }, quantity: 1, acceptedVersion: nft.version ?? 1 }]
    }),
    remove: (nftId) => setItems((current) => current.filter((item) => item.nft.id !== nftId)),
    setQuantity: (nftId, quantity) => {
      if (quantity < 1) return
      setItems((current) => current.map((item) => {
        if (item.nft.id !== nftId) return item
        return { ...item, quantity: Math.min(quantity, item.nft.stock) }
      }))
    },
    acceptPrice: (nftId) => setItems((current) => current.map((item) =>
      item.nft.id === nftId ? { ...item, acceptedVersion: item.nft.version ?? 1 } : item,
    )),
    removePurchased: (purchased) => {
      const quantities = new Map(purchased.map(({ nftId, quantity }) => [nftId, quantity]))
      setItems((current) => current.flatMap((item) => {
        const remaining = item.quantity - (quantities.get(item.nft.id) ?? 0)
        return remaining > 0 ? [{ ...item, quantity: remaining }] : []
      }))
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
