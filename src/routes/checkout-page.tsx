import { useMutation, useQuery } from '@tanstack/react-query'
import { createRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { rootRoute } from '../root-route'
import { useCart } from '../cart/cart-provider'
import { createOrder, getPendingOrder, getProfile, getQuote, getWallets, type Wallet } from '../lib/api'
import { getApiErrorMessage, getSession, sessionQueryKey } from '../lib/session'
import { queryClient } from '../lib/query-client'
import { formatPrice } from '../lib/format-price'
import type { OrderQuote } from '../types/nft'

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

type FieldErrors = { name?: string; email?: string }
type PaymentStage = 'details' | 'review'

function CheckoutPage() {
  const navigate = useNavigate()
  const { items } = useCart()
  const [stage, setStage] = useState<PaymentStage>('details')
  const [collectorName, setCollectorName] = useState('')
  const [collectorEmail, setCollectorEmail] = useState('')
  const [walletId, setWalletId] = useState('')
  const [network, setNetwork] = useState('Ethereum')
  const [connection, setConnection] = useState<'disconnected' | 'connected' | 'rejected'>('disconnected')
  const [decision, setDecision] = useState<'confirm' | 'decline'>('confirm')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [acceptedQuote, setAcceptedQuote] = useState<OrderQuote | null>(null)
  const [quoteChanged, setQuoteChanged] = useState(false)
  const submitLock = useRef(false)
  const idempotency = useRef<{ fingerprint: string; key: string } | null>(null)
  const coupon = localStorage.getItem('cart-coupon')?.trim() || ''
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const walletsQuery = useQuery({ queryKey: ['wallets'], queryFn: getWallets })
  const sessionQuery = useQuery({ queryKey: sessionQueryKey, queryFn: getSession, retry: false })
  const pendingOrderQuery = useQuery({
    queryKey: ['orders', 'pending', sessionQuery.data?.id],
    queryFn: getPendingOrder,
    enabled: Boolean(sessionQuery.data),
    retry: false,
  })
  const wallets = walletsQuery.data ?? []
  const hasUnacceptedPrice = items.some(({ nft, acceptedVersion }) => (nft.version ?? 1) > acceptedVersion)

  useEffect(() => {
    if (!profileQuery.data) return
    setCollectorName(profileQuery.data.name)
    setCollectorEmail(profileQuery.data.email)
  }, [profileQuery.data])

  useEffect(() => {
    if (wallets.length === 0) return
    const preferred = wallets.find(({ primary }) => primary) ?? wallets[0]
    setWalletId((current) => current || preferred.id)
    setNetwork((current) => current === 'Ethereum' ? preferred.network : current)
  }, [wallets])

  useEffect(() => {
    if (pendingOrderQuery.data?.status !== 'pending') return
    void navigate({ to: '/orders/$orderId', params: { orderId: pendingOrderQuery.data.id }, replace: true })
  }, [navigate, pendingOrderQuery.data])

  const quoteMutation = useMutation({
    mutationFn: () => getQuote({
      items: items.map(({ nft, quantity }) => ({ nftId: nft.id, quantity })),
      ...(coupon ? { coupon } : {}),
    }),
    onSuccess: (quote) => {
      const currentItems = new Map(items.map(({ nft }) => [nft.id, nft.price]))
      const priceChanged =
        quote.items.some(({ nftId, unitPrice }) => currentItems.get(nftId) !== unitPrice) &&
        JSON.stringify(acceptedQuote) !== JSON.stringify(quote)
      setAcceptedQuote(quote)
      setQuoteChanged(priceChanged)
      if (!priceChanged) setStage('review')
    },
  })

  const mutation = useMutation({
    mutationFn: async (accepted: OrderQuote) => {
      const currentQuote = await getQuote({
        items: items.map(({ nft, quantity }) => ({ nftId: nft.id, quantity })),
        ...(coupon ? { coupon } : {}),
      })
      if (JSON.stringify(currentQuote) !== JSON.stringify(accepted)) {
        setAcceptedQuote(currentQuote)
        setQuoteChanged(true)
        setStage('details')
        throw new Error('Os preços, o estoque ou as taxas mudaram. Confira e confirme novamente.')
      }

      const purchased = items.map(({ nft, quantity }) => ({ nftId: nft.id, quantity }))
      const payment = {
        quote: accepted,
        collector: { name: collectorName.trim(), email: collectorEmail.trim() },
        walletId,
        network,
        decision,
      }
      const fingerprint = JSON.stringify({ purchased, payment })
      if (idempotency.current?.fingerprint !== fingerprint) {
        idempotency.current = { fingerprint, key: crypto.randomUUID() }
      }
      return createOrder(purchased, idempotency.current.key, payment)
    },
    onSuccess: (order) => {
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
    onSettled: () => {
      submitLock.current = false
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

  function reviewPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: FieldErrors = {}
    if (!collectorName.trim()) errors.name = 'Informe o nome do colecionador.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collectorEmail.trim())) {
      errors.email = 'Informe um e-mail válido.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    if (hasUnacceptedPrice) return
    if (connection !== 'connected') {
      setConnection('rejected')
      return
    }
    quoteMutation.mutate()
  }

  function submitOrder() {
    if (submitLock.current || !acceptedQuote || quoteChanged || connection !== 'connected') return
    submitLock.current = true
    mutation.mutate(acceptedQuote)
  }

  const selectedWallet = wallets.find((wallet) => wallet.id === walletId)

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-800">Pagamento simulado</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {stage === 'review' ? 'Revisar pagamento' : 'Dados do colecionador'}
      </h1>

      {stage === 'details' ? (
        <form noValidate onSubmit={reviewPayment} className="mt-8 space-y-6">
          {hasUnacceptedPrice && (
            <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
              Há preços atualizados que precisam ser aceitos no carrinho antes de confirmar.
              <Link to="/cart" className="ml-1 font-semibold underline">Revisar carrinho</Link>
            </p>
          )}
          <section className="space-y-4 rounded-2xl border border-black/5 bg-white p-5">
            <h2 className="font-semibold">Seus dados</h2>
            <label className="block text-sm font-medium">
              Nome do colecionador
              <input
                value={collectorName}
                onChange={(event) => setCollectorName(event.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'collector-name-error' : undefined}
                autoComplete="name"
                className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-violet-700"
              />
              {fieldErrors.name && <span id="collector-name-error" role="alert" className="mt-1 block text-sm text-red-700">{fieldErrors.name}</span>}
            </label>
            <label className="block text-sm font-medium">
              E-mail
              <input
                type="email"
                value={collectorEmail}
                onChange={(event) => setCollectorEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'collector-email-error' : undefined}
                autoComplete="email"
                className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-violet-700"
              />
              {fieldErrors.email && <span id="collector-email-error" role="alert" className="mt-1 block text-sm text-red-700">{fieldErrors.email}</span>}
            </label>
          </section>

          <section className="space-y-4 rounded-2xl border border-black/5 bg-white p-5">
            <h2 className="font-semibold">Carteira e rede</h2>
            <label className="block text-sm font-medium">
              Carteira cadastrada
              <select value={walletId} onChange={(event) => setWalletId(event.target.value)} className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5">
                {wallets.map((wallet: Wallet) => (
                  <option key={wallet.id} value={wallet.id}>{wallet.name} · {wallet.address.slice(0, 8)}…</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Rede
              <select value={network} onChange={(event) => setNetwork(event.target.value)} className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5">
                <option value="Ethereum">Ethereum</option>
                <option value="Polygon">Polygon</option>
              </select>
            </label>
            {selectedWallet && <p className="break-all text-xs text-neutral-500">{selectedWallet.address}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setConnection('connected')} className="rounded-lg bg-[#191816] px-4 py-2 text-sm text-white">Conectar carteira</button>
              <button type="button" onClick={() => setConnection('rejected')} className="rounded-lg border border-black/10 px-4 py-2 text-sm">Simular recusa</button>
              {connection === 'connected' && <button type="button" onClick={() => setConnection('disconnected')} className="rounded-lg border border-black/10 px-4 py-2 text-sm">Desconectar</button>}
            </div>
            <p aria-live="polite" className={`text-sm ${connection === 'rejected' ? 'text-red-700' : 'text-neutral-600'}`}>
              {connection === 'connected' ? 'Carteira conectada.' : connection === 'rejected' ? 'Conexão recusada. Conecte a carteira para continuar.' : 'Carteira desconectada.'}
            </p>
          </section>

          <label className="block text-sm font-medium">
            Resultado simulado do pagamento
            <select value={decision} onChange={(event) => setDecision(event.target.value as 'confirm' | 'decline')} className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5">
              <option value="confirm">Confirmar pagamento</option>
              <option value="decline">Recusar pagamento</option>
            </select>
          </label>

          {quoteChanged && (
            <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Os valores foram atualizados. Confira a nova cotação e confirme novamente.
              <button type="button" onClick={() => { setQuoteChanged(false); setStage('review') }} className="ml-2 font-semibold underline">Aceitar nova cotação</button>
            </div>
          )}
          {quoteMutation.isError && <p role="alert" className="text-sm text-red-700">{getApiErrorMessage(quoteMutation.error, 'Não foi possível calcular a cotação.')}</p>}
          <button type="submit" disabled={quoteMutation.isPending || walletsQuery.isPending || hasUnacceptedPrice} className="w-full rounded-xl bg-[#191816] px-6 py-4 font-medium text-white disabled:opacity-60">
            {quoteMutation.isPending ? 'Revalidando cotação…' : 'Revisar pagamento'}
          </button>
        </form>
      ) : (
        <div className="mt-8">
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <h2 className="font-semibold">Revisão do pedido</h2>
            <p className="mt-3 text-sm text-neutral-600">{collectorName} · {collectorEmail}</p>
            <p className="text-sm text-neutral-600">{selectedWallet?.name} · {network}</p>
            <ul className="mt-5 divide-y divide-black/5">
              {items.map(({ nft, quantity }) => (
                <li key={nft.id} className="flex justify-between gap-4 py-3 text-sm">
                  <span>{nft.name} × {quantity}</span>
                  <span className="shrink-0">
                    {formatPrice(String(Number(acceptedQuote?.items.find((item) => item.nftId === nft.id)?.unitPrice ?? nft.price) * quantity))} ETH
                  </span>
                </li>
              ))}
            </ul>
            {acceptedQuote && (
              <dl className="mt-4 space-y-2 border-t border-black/10 pt-4 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(acceptedQuote.subtotal)} ETH</dd></div>
                <div className="flex justify-between"><dt>Desconto</dt><dd>{formatPrice(acceptedQuote.discount)} ETH</dd></div>
                <div className="flex justify-between"><dt>Taxa de rede</dt><dd>{formatPrice(acceptedQuote.networkFee)} ETH</dd></div>
                <div className="flex justify-between border-t border-black/5 pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(acceptedQuote.total)} ETH</dd></div>
              </dl>
            )}
          </div>
          {mutation.isError && <p role="alert" className="mt-4 text-sm text-red-700">{getApiErrorMessage(mutation.error, 'Não foi possível criar o pedido.')}</p>}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setStage('details')} className="rounded-xl border border-black/10 px-5 py-3.5 font-medium">Voltar e editar</button>
            <button type="button" disabled={mutation.isPending || connection !== 'connected'} onClick={submitOrder} className="flex-1 rounded-xl bg-[#191816] px-6 py-4 font-medium text-white disabled:opacity-60">
              {mutation.isPending ? 'Enviando pedido…' : 'Confirmar pedido'}
            </button>
          </div>
        </div>
      )}
      <p className="mt-5 text-center text-xs text-neutral-500">Nenhuma cobrança real é feita neste ambiente de demonstração.</p>
    </div>
  )
}
