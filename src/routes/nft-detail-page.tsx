import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Heart, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { rootRoute } from '../router'
import { getNFT } from '../lib/api'
import { useCart } from '../cart/cart-provider'
import { connectToNFT } from '../lib/order-socket'

export const nftDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nfts/$nftId',
  component: NFTDetailPage,
})

function NFTDetailPage() {
  const { nftId } = nftDetailRoute.useParams()
  const { add } = useCart()
  const queryClient = useQueryClient()
  const [added, setAdded] = useState(false)
  const { data: nft, isPending, isError, error } = useQuery({
    queryKey: ['nft', nftId],
    queryFn: () => getNFT(nftId),
    retry: false,
  })

  useEffect(() => {
    const socket = connectToNFT(nftId, (update) => {
      queryClient.setQueryData<NonNullable<typeof nft>>(['nft', nftId], (current) =>
        current ? { ...current, ...update } : current,
      )
    })

    return () => {
      socket?.disconnect()
    }
  }, [nftId, queryClient])

  if (isPending) {
    return (
      <div aria-label="Carregando obra" aria-busy="true" className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-2 sm:px-8">
        <div className="aspect-square animate-pulse rounded-3xl bg-neutral-200" />
        <div className="space-y-5 py-8">
          <div className="h-5 w-28 animate-pulse rounded bg-neutral-200" />
          <div className="h-12 w-3/4 animate-pulse rounded bg-neutral-200" />
          <div className="h-24 animate-pulse rounded bg-neutral-100" />
        </div>
      </div>
    )
  }

  if (isError || !nft) {
    return (
      <div role="alert" className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="text-2xl font-semibold">Não foi possível encontrar esta obra</h1>
        <p className="mt-2 text-neutral-500">{error?.message ?? 'A obra pode ter sido removida.'}</p>
        <Link to="/" search={{ q: '', sort: 'newest', page: 1 }} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-violet-800">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar ao catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <Link to="/" search={{ q: '', sort: 'newest', page: 1 }} className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-black">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar ao catálogo
      </Link>
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="overflow-hidden rounded-3xl bg-neutral-100">
          <img src={nft.image} alt={nft.name} className="aspect-square size-full object-cover" />
        </div>
        <section className="flex flex-col justify-center">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-800">
            {nft.collection}
            <span className="size-1 rounded-full bg-violet-500" />
            {nft.blockchain}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{nft.name}</h1>
          <p className="mt-5 leading-7 text-neutral-600">{nft.description}</p>

          <div className="mt-8 flex items-center justify-between rounded-2xl border border-black/10 bg-white p-5">
            <div>
              <p className="text-xs text-neutral-500">Criado por</p>
              <p className="mt-1 font-medium">{nft.creator.name}</p>
              <p className="text-sm text-neutral-500">@{nft.creator.username}</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm text-neutral-500">
              <Heart aria-hidden="true" className="size-4" />
              {nft.likes}
            </span>
          </div>

          <div className="mt-4 rounded-2xl bg-[#eee9e1] p-5">
            <p className="text-xs text-neutral-500">Preço atual</p>
            <p className="mt-1 text-3xl font-semibold">
              {nft.price.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}{' '}
              <span className="text-base text-neutral-500">{nft.currency}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              add(nft)
              setAdded(true)
            }}
            className="mt-5 w-full rounded-xl bg-[#191816] px-6 py-4 font-medium text-white transition hover:bg-neutral-700"
          >
            {added ? 'Adicionado ao carrinho' : 'Adicionar ao carrinho'}
          </button>
          <p className="mt-4 inline-flex items-center justify-center gap-2 text-xs text-neutral-500">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Propriedade verificada na rede {nft.blockchain}
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-black/10 pt-5 text-sm">
            <div><dt className="text-neutral-500">Coleção</dt><dd className="mt-1 font-medium">{nft.collection}</dd></div>
            <div><dt className="text-neutral-500">Token</dt><dd className="mt-1 font-medium">#{nft.tokenId}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  )
}
