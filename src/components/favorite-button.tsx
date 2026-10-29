import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { addFavorite, getFavorites, removeFavorite } from '../lib/api'
import { getSession, sessionQueryKey } from '../lib/session'

export function favoritesQueryKey(userId: string) {
  return ['favorites', userId] as const
}

export function FavoriteButton({ nftId }: { nftId: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data: user, isPending: sessionPending } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
    retry: false,
  })
  const favoriteKey = favoritesQueryKey(user?.id ?? '')
  const { data: favorites = [] } = useQuery({
    queryKey: favoriteKey,
    queryFn: getFavorites,
    enabled: Boolean(user),
  })
  const mutation = useMutation({
    mutationFn: (nextFavorite: boolean) =>
      nextFavorite ? addFavorite(nftId) : removeFavorite(nftId),
    onMutate: async (nextFavorite) => {
      if (!user) return { previous: undefined }
      await queryClient.cancelQueries({ queryKey: favoriteKey })
      const previous = queryClient.getQueryData<string[]>(favoriteKey) ?? []
      queryClient.setQueryData<string[]>(
        favoriteKey,
        nextFavorite
          ? Array.from(new Set([...previous, nftId]))
          : previous.filter((id) => id !== nftId),
      )
      return { previous }
    },
    onError: (_error, _nextFavorite, context) => {
      if (user && context?.previous) {
        queryClient.setQueryData(favoriteKey, context.previous)
      }
    },
    onSettled: async () => {
      if (!user) return
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: favoriteKey }),
        queryClient.invalidateQueries({ queryKey: ['nfts'] }),
        queryClient.invalidateQueries({ queryKey: ['nft', nftId] }),
      ])
    },
  })
  const isFavorite = favorites.includes(nftId)

  return (
    <span className="inline-flex flex-col items-center">
      <button
        type="button"
        aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        aria-pressed={isFavorite}
        disabled={sessionPending || mutation.isPending}
        onClick={(event) => {
          event.stopPropagation()
          if (!user) {
            void navigate({
              to: '/login',
              search: { redirect: pathname === '/checkout' ? '/checkout' : '/' },
            })
            return
          }
          mutation.mutate(!isFavorite)
        }}
        className="inline-flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-neutral-700 shadow-sm transition hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:opacity-50"
      >
        <Heart aria-hidden="true" className={`size-5 ${isFavorite ? 'fill-rose-600 text-rose-600' : ''}`} />
      </button>
      {mutation.isError && (
        <span role="alert" className="absolute mt-11 rounded bg-white px-2 py-1 text-xs text-red-700 shadow">
          Não foi possível atualizar favoritos.
        </span>
      )}
    </span>
  )
}
