import { createRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { rootRoute } from '../root-route'
import { useCart } from '../cart/cart-provider'
import { formatPrice } from '../lib/format-price'
import { getQuote } from '../lib/api'
import { getApiErrorMessage } from '../lib/session'

export const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: CartPage,
})

function CartPage() {
  const { items, remove, setQuantity, acceptPrice } = useCart()
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState('')
  const quote = useQuery({
    queryKey: ['quote', items.map(({ nft, quantity }) => ({ nftId: nft.id, quantity })), coupon],
    queryFn: () => getQuote({
      items: items.map(({ nft, quantity }) => ({ nftId: nft.id, quantity })),
      ...(coupon ? { coupon } : {}),
    }),
    enabled: items.length > 0,
    retry: false,
  })
  const hasUnacceptedPrice = items.some(({ nft, acceptedVersion }) => (nft.version ?? 1) > acceptedVersion)

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-800">Sua seleção</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Carrinho</h1>
      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-black/15 bg-white px-6 py-16 text-center">
          <ShoppingBag aria-hidden="true" className="mx-auto size-10 text-neutral-300" />
          <h2 className="mt-4 text-xl font-semibold">Seu carrinho está vazio</h2>
          <p className="mt-2 text-sm text-neutral-500">Explore o catálogo e encontre uma obra para sua coleção.</p>
          <Link
            to="/"
            search={{ q: '', sort: 'newest', page: 1 }}
            className="mt-6 inline-flex rounded-full bg-[#191816] px-5 py-3 text-sm font-medium text-white"
          >
            Explorar obras
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {items.map(({ nft, quantity, acceptedVersion }) => (
              <article key={nft.id} className="flex gap-4 rounded-2xl border border-black/5 bg-white p-4 sm:gap-6">
                <img src={nft.image} alt={nft.imageAlt} width={600} height={600} className="size-24 rounded-xl object-cover sm:size-32" />
                <div className="flex min-w-0 flex-1 flex-col justify-between sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{nft.name}</h2>
                    <p className="mt-1 text-sm text-neutral-500">@{nft.creator.username}</p>
                    <p className="mt-3 font-medium">
                      {formatPrice(nft.price)} {nft.currency}
                    </p>
                    {(nft.version ?? 1) > acceptedVersion && (
                      <div role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                        <p>O preço de {nft.name} foi atualizado.</p>
                        <p className="mt-1 font-medium">
                          Novo preço: {formatPrice(nft.price)} {nft.currency}
                        </p>
                        <button
                          type="button"
                          onClick={() => acceptPrice(nft.id)}
                          className="mt-2 font-semibold underline"
                        >
                          Aceitar novo preço
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2 sm:mt-0">
                    <button
                      type="button"
                      aria-label={`Diminuir quantidade de ${nft.name}`}
                      onClick={() => setQuantity(nft.id, quantity - 1)}
                      disabled={quantity <= 1}
                      className="rounded-full border border-black/10 p-2 disabled:opacity-30"
                    >
                      <Minus aria-hidden="true" className="size-4" />
                    </button>
                    <span aria-label="Quantidade" className="w-6 text-center text-sm">{quantity}</span>
                    <button
                      type="button"
                      aria-label={`Aumentar quantidade de ${nft.name}`}
                      onClick={() => setQuantity(nft.id, quantity + 1)}
                      disabled={quantity >= nft.stock}
                      className="rounded-full border border-black/10 p-2"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover ${nft.name}`}
                      onClick={() => remove(nft.id)}
                      className="ml-2 rounded-full p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="h-fit rounded-2xl border border-black/5 bg-white p-6">
            <h2 className="text-lg font-semibold">Resumo do pedido</h2>
            <form
              className="mt-5"
              onSubmit={(event) => {
                event.preventDefault()
                const nextCoupon = couponInput.trim()
                setCoupon(nextCoupon)
                localStorage.setItem('cart-coupon', nextCoupon)
              }}
            >
              <label htmlFor="cart-coupon" className="text-sm font-medium">Cupom de desconto</label>
              <div className="mt-2 flex gap-2">
                <input
                  id="cart-coupon"
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value)}
                  placeholder="Digite seu cupom"
                  className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-violet-700"
                />
                <button type="submit" className="rounded-lg border border-black/10 px-3 py-2 text-sm font-medium">
                  Aplicar
                </button>
              </div>
              {coupon && (
                <button
                  type="button"
                  onClick={() => {
                    setCoupon('')
                    setCouponInput('')
                    localStorage.removeItem('cart-coupon')
                  }}
                  className="mt-2 text-sm text-violet-800 underline"
                >
                  Remover cupom
                </button>
              )}
              {coupon && quote.isError && (
                <p role="alert" className="mt-2 text-sm text-red-700">
                  {getApiErrorMessage(quote.error, 'Não foi possível aplicar o cupom.')}
                </p>
              )}
            </form>
            <div className="mt-5 flex justify-between border-t border-black/5 pt-4 text-sm">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-semibold">
                {quote.data ? `${formatPrice(quote.data.subtotal)} ETH` : 'Calculando…'}
              </span>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-neutral-500">Desconto</dt><dd>{quote.data ? `${formatPrice(quote.data.discount)} ETH` : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-neutral-500">Taxa de rede</dt><dd>{quote.data ? `${formatPrice(quote.data.networkFee)} ETH` : '—'}</dd></div>
              <div className="flex justify-between gap-3 border-t border-black/5 pt-3 font-semibold"><dt>Total</dt><dd>{quote.data ? `${formatPrice(quote.data.total)} ETH` : '—'}</dd></div>
            </dl>
            <Link
              to="/checkout"
              aria-disabled={hasUnacceptedPrice || !quote.data || quote.isFetching}
              onClick={(event) => {
                if (hasUnacceptedPrice || !quote.data || quote.isFetching) event.preventDefault()
              }}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#191816] px-5 py-3.5 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Continuar para pagamento
            </Link>
          </aside>
        </div>
      )}
    </div>
  )
}
