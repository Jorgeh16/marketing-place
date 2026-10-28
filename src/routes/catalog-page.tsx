import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createRoute } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '../cart/cart-provider'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { api } from '../lib/axios'
import { rootRoute } from '../router'
import type { NFT, NFTPage } from '../types/nft'

export const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CatalogPage,
})

async function getNFTs() {
  const { data } = await api.get<NFTPage>('/nfts', {
    params: { limit: 100 },
  })

  return data.items
}

function CatalogPage() {
  const { data: nfts, isPending, isError, error, refetch } = useQuery({
    queryKey: ['nfts'],
    queryFn: getNFTs,
  })

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">NFTs</h1>

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
      ) : (
        <div
          aria-busy={isPending}
          className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {isPending
            ? Array.from({ length: 8 }, (_, index) => <NFTCardSkeleton key={index} />)
            : nfts?.map((nft) => <NFTCard key={nft.id} nft={nft} />)}
        </div>
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
