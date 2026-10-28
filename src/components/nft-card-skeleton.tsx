export function NFTCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-black/5 bg-white"
    >
      <div className="aspect-square animate-pulse bg-neutral-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100" />
        <div className="mt-5 flex justify-between border-t border-black/5 pt-3">
          <div className="h-3 w-10 animate-pulse rounded bg-neutral-100" />
          <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    </div>
  )
}
