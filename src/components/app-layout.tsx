import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { Gem, ShoppingBag, UserRound } from 'lucide-react'
import { useCart } from '../cart/cart-provider'
import { logout } from '../lib/api'
import { queryClient } from '../lib/query-client'
import { getSession, sessionQueryKey } from '../lib/session'
import { disconnectAuthenticatedSockets } from '../lib/order-socket'
import { useEffect } from 'react'
import { DevScenarioPanel } from './dev-scenario-panel'

export function AppLayout() {
  const { count } = useCart()
  const navigate = useNavigate()
  const { data: user, isPending: sessionPending } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
    retry: false,
  })
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      localStorage.removeItem('auth-token')
      queryClient.clear()
      window.dispatchEvent(new CustomEvent('auth:changed', { detail: { userId: null } }))
      void navigate({ to: '/', search: { q: '', sort: 'newest', page: 1 } })
    },
  })

  useEffect(() => {
    function handleAuthChange() {
      disconnectAuthenticatedSockets()
    }
    function handleExpiredSession() {
      const redirect = window.location.pathname === '/checkout' ? '/checkout' : '/'
      void navigate({ to: '/login', search: { redirect } })
    }
    window.addEventListener('auth:changed', handleAuthChange)
    window.addEventListener('session:expired', handleExpiredSession)
    return () => {
      window.removeEventListener('auth:changed', handleAuthChange)
      window.removeEventListener('session:expired', handleExpiredSession)
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#191816]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#faf9f6]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" search={{ q: '', sort: 'newest', page: 1 }} className="flex items-center gap-2 font-semibold tracking-tight">
            <Gem aria-hidden="true" className="size-5 text-violet-700" />
            <span>Forma</span>
          </Link>
          <nav aria-label="Navegação principal" className="flex items-center gap-2 sm:gap-5">
            <Link to="/" search={{ q: '', sort: 'newest', page: 1 }} className="hidden text-sm text-neutral-600 hover:text-black sm:block">
              Explorar
            </Link>
            <Link
              to="/cart"
              aria-label={`Carrinho${count > 0 ? ` (${count})` : ''}`}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-neutral-600 hover:bg-black/5 hover:text-black"
            >
              <ShoppingBag aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Carrinho{count > 0 ? ` (${count})` : ''}</span>
            </Link>
            {!sessionPending && (user ? (
              <>
                <span className="hidden text-sm text-neutral-600 md:inline">{user.name}</span>
                <Link to="/profile" className="rounded-full px-3 py-2 text-sm text-neutral-600 hover:bg-black/5 hover:text-black">
                  Perfil
                </Link>
                <button
                  type="button"
                  disabled={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                  className="inline-flex items-center gap-2 rounded-full bg-[#191816] px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
                >
                  {logoutMutation.isPending ? 'Saindo…' : 'Sair'}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                search={{ redirect: '/' }}
                aria-label="Entrar"
                className="inline-flex items-center gap-2 rounded-full bg-[#191816] px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                <UserRound aria-hidden="true" className="size-4" />
                <span>Entrar</span>
              </Link>
            ))}
          </nav>
          {logoutMutation.isError && (
            <p role="alert" className="absolute right-5 top-16 rounded-lg bg-white px-3 py-2 text-sm text-red-700 shadow">
              Não foi possível encerrar a sessão. Tente novamente.
            </p>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="mt-20 border-t border-black/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>Forma — arte digital para colecionar.</span>
          <span>Uma experiência de marketplace em ambiente de demonstração.</span>
        </div>
      </footer>
      <DevScenarioPanel />
    </div>
  )
}
