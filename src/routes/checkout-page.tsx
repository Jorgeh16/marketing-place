import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createRoute, Link, useNavigate } from '@tanstack/react-router'
import { rootRoute } from '../router'
import { useCart } from '../cart/cart-provider'
import { createOrder } from '../lib/api'

export const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: CheckoutPage,
})

function CheckoutPage() {
  const navigate = useNavigate()
  const { items, totals, clear } = useCart()
  const [authenticated] = useState(() => Boolean(localStorage.getItem('auth-token')))
  const mutation = useMutation({
    mutationFn: () => createOrder(items.map(({ nft, quantity }) => ({ nftId: nft.id, quantity }))),
    onSuccess: (order) => {
      clear()
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
  })

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-3xl font-semibold">Entre para finalizar o pedido</h1>
        <p className="mt-3 text-neutral-500">Sua sessão é necessária para criar e acompanhar o pedido.</p>
        <Link to="/login" className="mt-6 inline-flex rounded-full bg-[#191816] px-5 py-3 text-sm font-medium text-white">
          Entrar na conta
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-3xl font-semibold">Seu carrinho está vazio</h1>
        <Link to="/" search={{ q: '', collection: '', blockchain: '', sort: 'newest', page: 1 }} className="mt-6 inline-flex text-violet-800 underline">
          Voltar ao catálogo
        </Link>
      </div>
    )
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
      {mutation.isError && <p role="alert" className="mt-4 text-sm text-red-700">{mutation.error.message}</p>}
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
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
