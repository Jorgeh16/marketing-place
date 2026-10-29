import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createRoute, Link } from '@tanstack/react-router'
import { Check, CircleDot, PackageCheck } from 'lucide-react'
import { rootRoute } from '../root-route'
import { getOrder } from '../lib/api'
import { connectToOrder } from '../lib/order-socket'
import type { Order, OrderStatus } from '../types/nft'

export const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders/$orderId',
  component: OrderPage,
})

const steps: Array<{ status: OrderStatus; title: string; description: string }> = [
  { status: 'processing', title: 'Pedido criado', description: 'Estamos validando os detalhes do pedido.' },
  { status: 'confirmed', title: 'Pedido confirmado', description: 'A transação foi confirmada na rede.' },
  { status: 'completed', title: 'Concluído', description: 'As obras já estão na sua coleção.' },
]

function OrderPage() {
  const { orderId } = orderRoute.useParams()
  const queryClient = useQueryClient()
  const [liveStatus, setLiveStatus] = useState<OrderStatus | null>(null)
  const { data: order, isPending, isError, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    refetchInterval: 10000,
  })
  const orderAvailable = Boolean(order)

  useEffect(() => {
    if (!orderAvailable) return
    const socket = connectToOrder(orderId, (status) => {
      setLiveStatus(status)
      queryClient.setQueryData<Order>(['order', orderId], (current) =>
        current ? { ...current, status } : current,
      )
    })
    return () => {
      socket?.disconnect()
    }
  }, [orderAvailable, orderId, queryClient])

  if (isPending) {
    return <div aria-busy="true" aria-label="Carregando pedido" className="mx-auto my-20 h-80 max-w-3xl animate-pulse rounded-3xl bg-neutral-200" />
  }
  if (isError || !order) {
    return <div role="alert" className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-2xl font-semibold">Não foi possível carregar o pedido</h1><p className="mt-2 text-sm text-neutral-500">{error?.message}</p></div>
  }

  const status = liveStatus ?? order.status
  const currentStep = steps.findIndex((step) => step.status === status)

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-800">Acompanhamento em tempo real</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Pedido confirmado</h1>
      <p className="mt-3 text-sm text-neutral-500">Código do pedido: <span className="font-mono text-neutral-700">{order.id}</span></p>
      <div aria-live="polite" className="mt-9 rounded-2xl border border-black/5 bg-white p-6">
        <ol className="space-y-7">
          {steps.map((step, index) => {
            const complete = index <= currentStep
            return (
              <li key={step.status} className="flex gap-4">
                <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-violet-800 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                  {index < currentStep ? <Check aria-hidden="true" className="size-4" /> : index === currentStep ? <CircleDot aria-hidden="true" className="size-4" /> : <PackageCheck aria-hidden="true" className="size-4" />}
                </span>
                <div><p className={`font-medium ${complete ? '' : 'text-neutral-400'}`}>{step.title}</p><p className="mt-1 text-sm text-neutral-500">{step.description}</p></div>
              </li>
            )
          })}
        </ol>
      </div>
      <div className="mt-6 rounded-2xl bg-[#eee9e1] p-5">
        <div className="flex justify-between gap-4 text-sm">
          <span>{order.items.length} {order.items.length === 1 ? 'obra' : 'obras'}</span>
          <span className="text-right font-semibold">
            {order.total.map(({ currency, amount }) => (
              <span key={currency} className="ml-2 whitespace-nowrap">
                {amount.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {currency}
              </span>
            ))}
          </span>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-neutral-600">
          {order.items.map(({ nft, quantity }) => <li key={nft.id}>{nft.name} × {quantity}</li>)}
        </ul>
      </div>
      <Link to="/" search={{ q: '', sort: 'newest', page: 1 }} className="mt-7 inline-flex text-sm font-medium text-violet-800 underline">
        Continuar explorando
      </Link>
    </div>
  )
}
