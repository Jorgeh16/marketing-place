import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search, ShoppingCart } from 'lucide-react'
import { useCart } from '../cart/cart-provider'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { api } from '../lib/axios'
import { rootRoute } from '../router'
import type { NFT, NFTPage } from '../types/nft'

const pageSize = 12

type CatalogSearch = {
  q: string
  sort: 'newest' | 'price-asc' | 'price-desc'
  page: number
}

export const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: typeof search.q === 'string' ? search.q.trim() : '',
    sort:
      search.sort === 'price-asc' || search.sort === 'price-desc'
        ? search.sort
        : 'newest',
    page: Math.max(1, Math.floor(Number(search.page) || 1)),
  }),
  component: CatalogPage,
})

async function getNFTs(search: CatalogSearch) {
  const { data } = await api.get<NFTPage>('/nfts', {
    params: {
      q: search.q,
      sort: search.sort,
      page: search.page,
      limit: pageSize,
    },
  })

  return data
}

function CatalogPage() {
  const search = catalogRoute.useSearch()
  const navigate = useNavigate({ from: catalogRoute.fullPath })
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['nfts', search],
    queryFn: () => getNFTs(search),
  })

  function updateSearch(next: Partial<CatalogSearch>, replace = false) {
    void navigate({
      search: (previous) => ({ ...previous, ...next }),
      replace,
    })
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">NFTs</h1>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar por nome</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={search.q}
            onChange={(event) =>
              updateSearch({ q: event.target.value, page: 1 }, true)
            }
            placeholder="Buscar por nome..."
            className="h-11 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-700"
          />
        </label>
        <label className="flex items-center gap-3 text-sm">
          <span className="shrink-0 text-neutral-600">Ordenar por</span>
          <select
            aria-label="Ordenar por"
            value={search.sort}
            onChange={(event) => {
              const sort = event.target.value
              if (sort === 'newest' || sort === 'price-asc' || sort === 'price-desc') {
                updateSearch({ sort, page: 1 })
              }
            }}
            className="h-11 min-w-48 rounded-xl border border-black/10 bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-violet-700"
          >
            <option value="newest">Mais recentes</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </label>
      </div>

      {isError ? (
        <div role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-card p-6">
          <p>Não foi possível carregar os NFTs: {error.message}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 text-sm font-medium underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : !isPending && data?.items.length === 0 ? (
        <p role="status" className="mt-8 rounded-xl border border-dashed border-black/15 bg-white px-6 py-16 text-center text-neutral-600">
            Nenhum NFT encontrado. Tente buscar por outro nome.
        </p>
      ) : (
        <div
            aria-busy={isPending}
          className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {isPending
            ? Array.from({ length: 8 }, (_, index) => <NFTCardSkeleton key={index} />)
            : data?.items.map((nft) => <NFTCard key={nft.id} nft={nft} />)}
        </div>
      )}

      {!isError && !isPending && data && data.totalPages > 0 && (
        <nav aria-label="Paginação do catálogo" className="mt-8 flex items-center justify-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => updateSearch({ page: search.page - 1 })}
            disabled={search.page <= 1}
          >
            <ChevronLeft aria-hidden="true" />
            Anterior
          </Button>
          <span aria-live="polite" className="text-sm text-neutral-600">
            Página {data.page} de {data.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => updateSearch({ page: search.page + 1 })}
            disabled={search.page >= data.totalPages}
          >
            Próxima
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
    </section>
  )
}

function NFTCard({ nft }: { nft: NFT }) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)

  return (
    <Card className="overflow-hidden p-0 transition-shadow hover:shadow-lg">
      <img
        src={nft.image}
        alt={nft.name}
        loading="lazy"
        className="aspect-square w-full object-cover"
      />
      <CardHeader>
        <CardTitle>{nft.name}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="font-semibold">
          {nft.price.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {nft.currency}
        </p>
        <Button
          type="button"
          onClick={() => {
            add(nft)
            setAdded(true)
          }}
          className="mt-4 h-11 w-full rounded-xl bg-[#191816] text-white hover:bg-neutral-700"
        >
          <ShoppingCart aria-hidden="true" />
          {added ? 'Adicionado ao carrinho' : 'Adicionar ao carrinho'}
        </Button>
      </CardContent>
    </Card>
  )
}

function NFTCardSkeleton() {
  return (
    <Card aria-hidden="true" className="overflow-hidden p-0">
      <Skeleton className="aspect-square rounded-none" />
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
      </CardHeader>
      <CardContent className="pb-4">
        <Skeleton className="h-4 w-1/3" />
      </CardContent>
    </Card>
  )
}
