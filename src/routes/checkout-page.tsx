import { useMutation } from '@tanstack/react-query'
import { createRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useRef } from 'react'
import { rootRoute } from '../router'
import { useCart } from '../cart/cart-provider'
import { createOrder } from '../lib/api'
import { getApiErrorMessage, getSession, sessionQueryKey } from '../lib/session'
import { queryClient } from '../lib/query-client'

export const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData({
      queryKey: sessionQueryKey,
      queryFn: getSession,
    })
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: '/checkout' } })
    }
  },
  component: CheckoutPage,
})

function CheckoutPage() {
  const navigate = useNavigate()
  const { items, totals, removePurchased } = useCart()
  const idempotency = useRef<{ fingerprint: string; key: string } | null>(null)
  const mutation = useMutation({
    mutationFn: ({ purchased, key }: { purchased: Array<{ nftId: string; quantity: number }>; key: string }) =>
      createOrder(purchased, key),
    onSuccess: (order) => {
      removePurchased(order.items.map(({ nft, quantity }) => ({ nftId: nft.id, quantity })))
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
  })

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-3xl font-semibold">Seu carrinho está vazio</h1>
        <Link to="/" search={{ q: '', sort: 'newest', page: 1 }} className="mt-6 inline-flex text-violet-800 underline">
          Voltar ao catálogo
        </Link>
      </div>
    )
  }

  function submitOrder() {
    const purchased = items.map(({ nft, quantity }) => ({ nftId: nft.id, quantity }))
    const fingerprint = JSON.stringify(purchased)
    if (idempotency.current?.fingerprint !== fingerprint) {
      idempotency.current = { fingerprint, key: crypto.randomUUID() }
    }
    const key = idempotency.current.key
    mutation.mutate({ purchased, key })
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-800">Última etapa</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Confirmar pedido</h1>
      <div className="mt-8 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white px-5">
        {items.map(({ nft, quantity }) => (
          <div key={nft.id} className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <img src={nft.image} alt="" className="size-14 rounded-lg object-cover" />
              <div><p className="font-medium">{nft.name}</p><p className="text-sm text-neutral-500">Quantidade: {quantity}</p></div>
            </div>
            <span className="shrink-0 text-sm font-medium">
              {(nft.price * quantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {nft.currency}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-5">
        <span className="text-neutral-500">Total estimado</span>
        <span className="text-right text-xl font-semibold">
          {totals.map(({ currency, amount }) => (
            <span key={currency} className="ml-2 whitespace-nowrap">
              {amount.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {currency}
            </span>
          ))}
        </span>
      </div>
      {mutation.isError && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {getApiErrorMessage(mutation.error, 'Não foi possível criar o pedido.')}
        </p>
      )}
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={submitOrder}
        className="mt-8 w-full rounded-xl bg-[#191816] px-6 py-4 font-medium text-white disabled:opacity-60"
      >
        {mutation.isPending ? 'Criando pedido…' : 'Confirmar pedido'}
      </button>
      <p className="mt-3 text-center text-xs text-neutral-500">
        Nenhuma cobrança real é feita neste ambiente de demonstração.
      </p>
    </div>
  )
}
