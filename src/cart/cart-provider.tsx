import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSession, sessionQueryKey } from '../lib/session'
import { getNFT } from '../lib/api'
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

function readCart(storageKey = 'cart-items'): CartItem[] {
  const stored = localStorage.getItem(storageKey)
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

function cartStorageKey(userId: string | null) {
  return userId ? `cart-items:${userId}` : 'cart-items:guest'
}

function mergeCarts(...carts: CartItem[][]) {
  const merged = new Map<string, CartItem>()
  for (const cart of carts) {
    for (const item of cart) {
      const current = merged.get(item.nft.id)
      if (!current) {
        merged.set(item.nft.id, item)
        continue
      }
      const latest = (item.nft.version ?? 1) >= (current.nft.version ?? 1) ? item : current
      merged.set(item.nft.id, {
        ...latest,
        quantity: Math.min(latest.nft.stock, current.quantity + item.quantity),
        acceptedVersion: Math.min(current.acceptedVersion, item.acceptedVersion),
      })
    }
  }
  return [...merged.values()]
}

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<CartItem[]>(readCart)
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('auth-token'))
  const { data: user, isPending: sessionPending } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
    retry: false,
  })
  const ownerRef = useRef<string | null | undefined>(undefined)
  const skipPersistRef = useRef(false)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    function updateToken() {
      setAuthToken(localStorage.getItem('auth-token'))
    }
    function preserveCartForSessionResume() {
      localStorage.setItem('cart-items:guest', JSON.stringify(itemsRef.current))
    }
    window.addEventListener('auth:changed', updateToken)
    window.addEventListener('session:expired', preserveCartForSessionResume)
    return () => {
      window.removeEventListener('auth:changed', updateToken)
      window.removeEventListener('session:expired', preserveCartForSessionResume)
    }
  }, [])

  useEffect(() => {
    if (sessionPending) return
    const nextOwner = user?.id ?? null
    if (ownerRef.current === nextOwner) return

    skipPersistRef.current = true
    const previousOwner = ownerRef.current
    if (previousOwner !== undefined) {
      localStorage.setItem(cartStorageKey(previousOwner), JSON.stringify(items))
    }

    const scopedCart = readCart(cartStorageKey(nextOwner))
    const guestCart = readCart('cart-items:guest')
    if (nextOwner) {
      setItems(mergeCarts(scopedCart, guestCart, previousOwner === undefined ? items : []))
      localStorage.removeItem('cart-items:guest')
      localStorage.removeItem('cart-items')
    } else {
      setItems(mergeCarts(guestCart, previousOwner === undefined ? items : []))
    }
    ownerRef.current = nextOwner
  }, [items, sessionPending, user?.id])

  useEffect(() => {
    if (sessionPending || ownerRef.current !== (user?.id ?? null)) return
    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }
    localStorage.setItem(cartStorageKey(ownerRef.current), JSON.stringify(items))
  }, [items, sessionPending, user?.id])

  const trackedNFTIds = items.map(({ nft }) => nft.id).sort().join(',')
  useEffect(() => {
    if (!trackedNFTIds) return
    const nftIds = trackedNFTIds.split(',')

    const socket = connectToNFTUpdates(nftIds, (update) => {
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
    }, () => {
      nftIds.forEach((nftId) => {
        void getNFT(nftId).then((latestNFT) => {
          queryClient.setQueryData(['nft', nftId], latestNFT)
          setItems((current) => current.map((item) =>
            item.nft.id === nftId && (latestNFT.version ?? 1) > (item.nft.version ?? 1)
              ? { ...item, nft: latestNFT }
              : item,
          ))
        }, (error: unknown) => {
          console.error(`Não foi possível reconciliar o NFT ${nftId} após reconexão.`, error)
        })
      })
    })
    return () => {
      socket?.disconnect()
    }
  }, [authToken, queryClient, trackedNFTIds])

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
