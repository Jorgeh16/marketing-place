import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createRoute, useNavigate } from '@tanstack/react-router'
import { ArrowDownWideNarrow, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { rootRoute } from '../router'
import { NFTCard } from '../components/nft-card'
import { NFTCardSkeleton } from '../components/nft-card-skeleton'
import { getNFTs } from '../lib/api'

const collections = ['Otherworlds', 'New Dimensions', 'Garden State', 'Future Relics', 'Soft Machines']
const blockchains = ['Ethereum', 'Solana', 'Polygon']

function parseCatalogSearch(search: Record<string, unknown>) {
  const parsedPage = Number(search.page)
  return {
    q: typeof search.q === 'string' ? search.q : '',
    collection: typeof search.collection === 'string' ? search.collection : '',
    blockchain: typeof search.blockchain === 'string' ? search.blockchain : '',
    sort:
      search.sort === 'price-asc' || search.sort === 'price-desc' ? search.sort : 'newest',
    page: Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1,
  }
}

export const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: parseCatalogSearch,
  component: CatalogPage,
})

function CatalogPage() {
  const search = catalogRoute.useSearch()
  const navigate = useNavigate({ from: catalogRoute.fullPath })
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['nfts', search],
    queryFn: () => getNFTs({ ...search, limit: 12 }),
  })

  useEffect(() => {
    if (data && data.totalPages > 0 && search.page > data.totalPages) {
      navigate({
        search: (previous) => ({ ...previous, page: 1 }),
        replace: true,
      })
    }
  }, [data, navigate, search.page])

  function updateSearch(next: Partial<typeof search>) {
    navigate({
      search: (previous) => ({ ...previous, ...next }),
      replace: true,
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-16">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#eee9e1] px-6 py-10 sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute -right-10 -top-24 size-72 rounded-full bg-violet-300/40 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-violet-800">
          Curadoria digital
        </p>
        <h1 className="relative mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-6xl">
          Arte que existe
          <br />
          <span className="font-serif font-normal italic">além do físico.</span>
        </h1>
        <p className="relative mt-5 max-w-lg text-sm leading-6 text-neutral-600 sm:text-base">
          Descubra peças digitais únicas de artistas independentes e encontre a próxima obra da sua
          coleção.
        </p>
        <div className="relative mt-8 flex max-w-xl items-center gap-3 rounded-xl border border-black/10 bg-white p-2 pl-4 shadow-sm focus-within:ring-2 focus-within:ring-violet-700/30">
          <Search aria-hidden="true" className="size-5 shrink-0 text-neutral-400" />
          <input
            type="search"
            value={search.q}
            onChange={(event) => {
              const value = event.target.value
              updateSearch({ q: value, page: 1 })
            }}
            placeholder="Busque obras, artistas ou coleções"
            aria-label="Buscar obras, artistas ou coleções"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-neutral-400"
          />
          <span className="hidden rounded-lg bg-neutral-100 px-2 py-1 text-xs text-neutral-500 sm:block">
            {data?.total ?? '—'} obras
          </span>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="catalog-heading">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-800">
              Marketplace
            </p>
            <h2 id="catalog-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Explore as obras
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="collection-filter">Filtrar por coleção</label>
            <select
              id="collection-filter"
              value={search.collection}
              onChange={(event) => updateSearch({ collection: event.target.value, page: 1 })}
              className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-700/30"
            >
              <option value="">Todas as coleções</option>
              {collections.map((collection) => <option key={collection}>{collection}</option>)}
            </select>
            <label className="sr-only" htmlFor="blockchain-filter">Filtrar por blockchain</label>
            <select
              id="blockchain-filter"
              value={search.blockchain}
              onChange={(event) => updateSearch({ blockchain: event.target.value, page: 1 })}
              className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-700/30"
            >
              <option value="">Todas as redes</option>
              {blockchains.map((blockchain) => <option key={blockchain}>{blockchain}</option>)}
            </select>
            <label className="sr-only" htmlFor="sort-filter">Ordenar obras</label>
            <span className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3">
              <ArrowDownWideNarrow aria-hidden="true" className="size-4 text-neutral-500" />
              <select
                id="sort-filter"
                value={search.sort}
                onChange={(event) => updateSearch({ sort: event.target.value, page: 1 })}
                className="bg-transparent py-2.5 text-sm outline-none"
              >
                <option value="newest">Mais recentes</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </span>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between border-b border-black/10 pb-3 text-sm text-neutral-500">
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            {data ? `${data.total} ${data.total === 1 ? 'obra encontrada' : 'obras encontradas'}` : 'Carregando obras'}
          </span>
          <span>{data ? `Página ${search.page} de ${Math.max(data.totalPages, 1)}` : ''}</span>
        </div>

        {isError ? (
          <div role="alert" className="my-12 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium">Não foi possível carregar as obras.</p>
            <p className="mt-1 text-sm text-neutral-600">{error.message}</p>
            <button type="button" onClick={() => void refetch()} className="mt-4 font-medium text-violet-800 underline">
              Tentar novamente
            </button>
          </div>
        ) : data?.items.length === 0 ? (
          <div className="my-12 rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center">
            <h3 className="font-semibold">Nenhuma obra encontrada</h3>
            <p className="mt-2 text-sm text-neutral-500">Tente mudar a busca ou remover alguns filtros.</p>
            <button
              type="button"
              onClick={() => {
                updateSearch({ q: '', collection: '', blockchain: '', page: 1 })
              }}
              className="mt-4 text-sm font-medium text-violet-800 underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div aria-busy={isPending} className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isPending
              ? Array.from({ length: 8 }, (_, index) => <NFTCardSkeleton key={index} />)
              : data?.items.map((nft) => <NFTCard key={nft.id} nft={nft} />)}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <nav aria-label="Paginação do catálogo" className="mt-10 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={search.page <= 1}
              onClick={() => updateSearch({ page: search.page - 1 })}
              className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              Anterior
            </button>
            <span aria-live="polite" className="min-w-20 text-center text-sm text-neutral-500">
              {search.page} / {data.totalPages}
            </span>
            <button
              type="button"
              disabled={search.page >= data.totalPages}
              onClick={() => updateSearch({ page: search.page + 1 })}
              className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </nav>
        )}
      </section>
    </div>
  )
}
