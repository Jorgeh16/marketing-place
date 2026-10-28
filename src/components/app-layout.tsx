import { Link, Outlet } from '@tanstack/react-router'
import { Gem, ShoppingBag, UserRound } from 'lucide-react'
import { useCart } from '../cart/cart-provider'

export function AppLayout() {
  const { count } = useCart()

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#191816]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#faf9f6]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" search={{ q: '', collection: '', blockchain: '', sort: 'newest', page: 1 }} className="flex items-center gap-2 font-semibold tracking-tight">
            <Gem aria-hidden="true" className="size-5 text-violet-700" />
            <span>Forma</span>
          </Link>
          <nav aria-label="Navegação principal" className="flex items-center gap-2 sm:gap-5">
            <Link to="/" search={{ q: '', collection: '', blockchain: '', sort: 'newest', page: 1 }} className="hidden text-sm text-neutral-600 hover:text-black sm:block">
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
            <Link
              to="/login"
              aria-label="Entrar"
              className="inline-flex items-center gap-2 rounded-full bg-[#191816] px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              <UserRound aria-hidden="true" className="size-4" />
              <span>Entrar</span>
            </Link>
          </nav>
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
    </div>
  )
}
