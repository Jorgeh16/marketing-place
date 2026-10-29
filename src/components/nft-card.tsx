import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { formatPrice } from '../lib/format-price'
import type { NFT } from '../types/nft'

export function NFTCard({ nft }: { nft: NFT }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5">
      <Link
        to="/nfts/$nftId"
        params={{ nftId: nft.id }}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
      >
        <div className="relative aspect-square overflow-hidden bg-neutral-100">
          <img
            src={nft.image}
            alt={nft.imageAlt}
            width={600}
            height={600}
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-700 backdrop-blur">
            {nft.blockchain}
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-semibold">{nft.name}</h2>
              <p className="mt-1 truncate text-sm text-neutral-500">por @{nft.creator.username}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-neutral-500">
              <Heart aria-hidden="true" className="size-3.5" />
              {nft.likes}
            </span>
          </div>
          <div className="mt-5 flex items-end justify-between border-t border-black/5 pt-3">
            <span className="text-xs text-neutral-500">Preço</span>
            <span className="font-semibold">
              {formatPrice(nft.price)}{' '}
              <span className="text-xs text-neutral-500">{nft.currency}</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
