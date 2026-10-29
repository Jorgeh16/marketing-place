import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createRoute, Link } from '@tanstack/react-router'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import Decimal from 'decimal.js'
import { rootRoute } from '../root-route'
import { useCart } from '../cart/cart-provider'
import { getOrder } from '../lib/api'
import { connectToOrder } from '../lib/order-socket'
import { getSession, sessionQueryKey } from '../lib/session'
import { formatPrice } from '../lib/format-price'
import type { Order, OrderStatus } from '../types/nft'

export const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders/$orderId',
  component: OrderPage,
})

const statusCopy: Record<OrderStatus, { heading: string; description: string }> = {
  pending: {
    heading: 'Pedido pendente',
    description: 'Estamos aguardando a confirmação do pagamento.',
  },
  confirmed: {
    heading: 'Pedido confirmado',
    description: 'O pagamento foi confirmado. Este é o recibo imutável do pedido.',
  },
  declined: {
    heading: 'Pagamento recusado',
    description: 'O pagamento não foi aprovado. Seus itens continuam no carrinho.',
  },
}

function OrderPage() {
  const { orderId } = orderRoute.useParams()
  const queryClient = useQueryClient()
  const { removePurchased } = useCart()
  const processedOrder = useRef<string | null>(null)
  const { data: user } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
    retry: false,
  })
  const { data: order, isPending, isError, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    retry: false,
    refetchInterval: (query) => query.state.data?.status === 'pending' ? 1000 : false,
  })

  useEffect(() => {
    if (!user || !order) return
    const socket = connectToOrder(
      orderId,
      (status, version) => {
        queryClient.setQueryData<Order>(['order', orderId], (current) => {
          if (!current || current.status !== 'pending' || version <= current.version) return current
          return {
            ...current,
            status,
            version,
            updatedAt: new Date().toISOString(),
          }
        })
      },
      () => {
        void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      },
      order.version,
    )
    return () => {
      socket?.disconnect()
    }
  }, [order, orderId, queryClient, user])

  useEffect(() => {
    if (order?.status !== 'confirmed' || processedOrder.current === order.id) return
    processedOrder.current = order.id
    removePurchased(order.receipt.items.map(({ nft, quantity }) => ({ nftId: nft.id, quantity })))
  }, [order, removePurchased])

  if (isPending) {
    return <div aria-busy="true" aria-label="Carregando pedido" className="mx-auto my-20 h-80 max-w-3xl animate-pulse rounded-3xl bg-neutral-200" />
  }
  if (isError || !order) {
    return (
      <div role="alert" className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-2xl font-semibold">Não foi possível carregar o pedido</h1>
        <p className="mt-2 text-sm text-neutral-500">{error?.message}</p>
      </div>
    )
  }

  const copy = statusCopy[order.status]
  const StatusIcon = order.status === 'confirmed' ? CheckCircle2 : order.status === 'declined' ? XCircle : Clock3

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-800">Pedido {order.status === 'pending' ? 'em processamento' : 'finalizado'}</p>
      <div aria-live="polite" className="mt-2 flex items-center gap-3">
        <StatusIcon aria-hidden="true" className="size-7 shrink-0" />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{copy.heading}</h1>
      </div>
      <p className="mt-3 text-sm text-neutral-600">{copy.description}</p>
      <p className="mt-3 text-sm text-neutral-500">
        Código do pedido: <span className="font-mono text-neutral-700">{order.id}</span>
      </p>

      <section className="mt-8 rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="font-semibold">{order.status === 'confirmed' ? 'Recibo' : 'Resumo do pedido'}</h2>
        <div className="mt-4 divide-y divide-black/5">
          {order.items.map(({ nft, quantity }) => (
            <div key={nft.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span>{nft.name} × {quantity}</span>
              <span className="shrink-0">
                {formatPrice(new Decimal(nft.price).mul(quantity).toString())} {order.receipt.currency}
              </span>
            </div>
          ))}
        </div>
        {order.status === 'confirmed' ? (
          <dl className="mt-4 space-y-2 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{order.receipt.subtotal} ETH</dd></div>
            <div className="flex justify-between"><dt>Desconto</dt><dd>{order.receipt.discount} ETH</dd></div>
            <div className="flex justify-between"><dt>Taxa de rede</dt><dd>{order.receipt.networkFee} ETH</dd></div>
            <div className="flex justify-between border-t border-black/5 pt-3 text-base font-semibold"><dt>Total pago</dt><dd>{order.receipt.total} ETH</dd></div>
          </dl>
        ) : (
          <p className="mt-4 border-t border-black/10 pt-4 text-right font-semibold">
            Total: {order.receipt.total} ETH
          </p>
        )}
      </section>
      {order.status !== 'confirmed' && (
        <Link to="/cart" className="mt-6 inline-flex text-sm font-medium text-violet-800 underline">
          Revisar carrinho
        </Link>
      )}
      <Link to="/" search={{ q: '', sort: 'newest', page: 1 }} className="mt-6 block text-sm font-medium text-violet-800 underline">
        Continuar explorando
      </Link>
    </div>
  )
}
