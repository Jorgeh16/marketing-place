import { createRoute, Link } from '@tanstack/react-router'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { rootRoute } from '../root-route'
import { useCart } from '../cart/cart-provider'
import { formatPrice } from '../lib/format-price'

export const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: CartPage,
})

function CartPage() {
  const { items, totals, remove, setQuantity, acceptPrice } = useCart()
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
            <div className="mt-5 flex justify-between border-t border-black/5 pt-4 text-sm">
              <span className="text-neutral-500">Subtotal</span>
              <span className="text-right font-semibold">
                {totals.map(({ currency, amount }) => (
                  <span key={currency} className="ml-2 whitespace-nowrap">
                    {amount.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {currency}
                  </span>
                ))}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-neutral-500">
              Os preços e o resumo são exibidos nas moedas originais de cada rede.
            </p>
            <Link
              to="/checkout"
              aria-disabled={hasUnacceptedPrice}
              onClick={(event) => {
                if (hasUnacceptedPrice) event.preventDefault()
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
