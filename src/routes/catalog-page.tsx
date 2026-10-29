import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search, ShoppingCart } from 'lucide-react'
import { useCart } from '../cart/cart-provider'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { FavoriteButton } from '../components/favorite-button'
import { Skeleton } from '../components/ui/skeleton'
import { api } from '../lib/axios'
import { formatPrice } from '../lib/format-price'
import { rootRoute } from '../root-route'
import type { NFT, NFTPage } from '../types/nft'

const pageSize = 12

type CatalogSearch = {
  q: string
  sort: 'newest' | 'price-asc' | 'price-desc'
  page: number
  collection?: string
  blockchain?: string
  category?: string
  rarity?: string
  availability?: string
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
    collection: typeof search.collection === 'string' ? search.collection : undefined,
    blockchain: typeof search.blockchain === 'string' ? search.blockchain : undefined,
    category: typeof search.category === 'string' ? search.category : undefined,
    rarity: typeof search.rarity === 'string' ? search.rarity : undefined,
    availability: typeof search.availability === 'string' ? search.availability : undefined,
  }),
  component: CatalogPage,
})

async function getNFTs(search: CatalogSearch) {
  const { data } = await api.get<unknown>('/nfts', {
    params: {
      q: search.q,
      collection: search.collection ?? '',
      blockchain: search.blockchain ?? '',
      category: search.category ?? '',
      rarity: search.rarity ?? '',
      availability: search.availability ?? '',
      sort: search.sort,
      page: search.page,
      limit: pageSize,
    },
  })

  if (!isNFTPage(data)) {
    throw new Error('A resposta do catálogo não está no formato esperado.')
  }

  return data
}

function isNFTPage(value: unknown): value is NFTPage {
  if (typeof value !== 'object' || value === null) return false
  if (!('items' in value) || !Array.isArray(value.items) || !value.items.every(isNFT)) return false
  return (
    'total' in value && typeof value.total === 'number' && Number.isFinite(value.total) &&
    'page' in value && typeof value.page === 'number' && Number.isFinite(value.page) &&
    'pageSize' in value && typeof value.pageSize === 'number' && Number.isFinite(value.pageSize) &&
    'totalPages' in value && typeof value.totalPages === 'number' && Number.isFinite(value.totalPages)
  )
}

function isNFT(value: unknown): value is NFT {
  if (typeof value !== 'object' || value === null) return false
  if (!('creator' in value) || typeof value.creator !== 'object' || value.creator === null) return false
  if (!('name' in value.creator) || typeof value.creator.name !== 'string') return false
  if (!('username' in value.creator) || typeof value.creator.username !== 'string') return false
  return (
    'id' in value && typeof value.id === 'string' &&
    'name' in value && typeof value.name === 'string' &&
    'description' in value && typeof value.description === 'string' &&
    'image' in value && typeof value.image === 'string' &&
    'imageAlt' in value && typeof value.imageAlt === 'string' &&
    'price' in value && typeof value.price === 'string' && Number.isFinite(Number(value.price)) &&
    'currency' in value && ['ETH', 'SOL', 'MATIC'].includes(String(value.currency)) &&
    'category' in value && typeof value.category === 'string' &&
    'rarity' in value && ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário'].includes(String(value.rarity)) &&
    'stock' in value && typeof value.stock === 'number' &&
    'collection' in value && typeof value.collection === 'string' &&
    'blockchain' in value && ['Ethereum', 'Solana', 'Polygon'].includes(String(value.blockchain)) &&
    'tokenId' in value && typeof value.tokenId === 'string' &&
    'likes' in value && typeof value.likes === 'number' &&
    'createdAt' in value && typeof value.createdAt === 'string'
  )
}

function CatalogPage() {
  const search = catalogRoute.useSearch()
  const navigate = useNavigate({ from: catalogRoute.fullPath })
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['nfts', search],
    queryFn: () => getNFTs(search),
    retry: false,
  })

  function updateSearch(next: Partial<CatalogSearch>, replace = false) {
    void navigate({
      search: (previous) => ({ ...previous, ...next }),
      replace,
    })
  }

  const filters = [
    {
      key: 'collection' as const,
      label: 'Filtrar por coleção',
      options: ['Tesouros do Convés', 'Navegantes da Selva', 'Relíquias da Maré', 'Cartografia Perdida', 'Tesouros do Abismo', 'Relíquias do Convés'],
    },
    {
      key: 'blockchain' as const,
      label: 'Filtrar por blockchain',
      options: ['Ethereum', 'Solana', 'Polygon'],
    },
    {
      key: 'category' as const,
      label: 'Filtrar por categoria',
      options: ['Tesouro', 'Criatura', 'Relíquia', 'Navegação', 'Cartografia', 'Equipamento', 'Embarcação'],
    },
    {
      key: 'rarity' as const,
      label: 'Filtrar por raridade',
      options: ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário'],
    },
    {
      key: 'availability' as const,
      label: 'Filtrar por disponibilidade',
      options: [
        { value: 'available', label: 'Disponível' },
        { value: 'low-stock', label: 'Últimas unidades' },
        { value: 'sold-out', label: 'Esgotado' },
      ],
    },
  ]

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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {filters.map(({ key, label, options }) => (
          <label key={key} className="text-sm">
            <span className="sr-only">{label}</span>
            <select
              aria-label={label}
              value={search[key] ?? ''}
              onChange={(event) => updateSearch({ [key]: event.target.value || undefined, page: 1 })}
              className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-violet-700"
            >
              <option value="">Todas</option>
              {options.map((option) => typeof option === 'string'
                ? <option key={option} value={option}>{option}</option>
                : <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}
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
            : data?.items?.map((nft) => <NFTCard key={nft.id} nft={nft} />)}
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
    <Card className="relative overflow-hidden p-0 transition-shadow hover:shadow-lg">
      <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="block">
        <img
          src={nft.image}
          alt={nft.imageAlt}
          width={600}
          height={600}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      </Link>
      <div className="absolute right-3 top-3">
        <FavoriteButton nftId={nft.id} />
      </div>
      <CardHeader>
        <CardTitle>
          <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="rounded-sm focus-visible:outline-2 focus-visible:outline-violet-700">
            {nft.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-sm text-neutral-500">{nft.collection} · {nft.category} · {nft.rarity}</p>
        <p className="font-semibold">
          {formatPrice(nft.price)} {nft.currency}
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          {nft.stock === 0 ? 'Esgotado' : nft.stock <= 3 ? `Últimas unidades: ${nft.stock}` : `Disponível: ${nft.stock}`}
        </p>
        <Button
          type="button"
          disabled={nft.stock === 0}
          onClick={() => {
            add(nft)
            setAdded(true)
          }}
          className="mt-4 h-11 w-full rounded-xl bg-[#191816] text-white hover:bg-neutral-700"
        >
          <ShoppingCart aria-hidden="true" />
          {nft.stock === 0 ? 'Esgotado' : added ? 'Adicionado ao carrinho' : 'Adicionar ao carrinho'}
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
