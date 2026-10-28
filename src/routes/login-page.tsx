import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Gem } from 'lucide-react'
import { rootRoute } from '../router'
import { login } from '../lib/api'

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('demo123')
  const mutation = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: ({ token, user }) => {
      localStorage.setItem('auth-token', token)
      localStorage.setItem('auth-user', JSON.stringify(user))
      void navigate({ to: '/checkout' })
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-6xl items-center gap-12 px-5 py-12 md:grid-cols-2 sm:px-8">
      <section className="hidden rounded-3xl bg-[#eee9e1] p-10 md:block">
        <Gem aria-hidden="true" className="size-8 text-violet-800" />
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">
          Uma coleção
          <br />
          <span className="font-serif font-normal italic">com a sua assinatura.</span>
        </h1>
        <p className="mt-4 max-w-sm leading-7 text-neutral-600">
          Entre para continuar sua descoberta e acompanhar suas obras favoritas.
        </p>
      </section>
      <section className="mx-auto w-full max-w-md">
        <Link to="/" search={{ q: '', collection: '', blockchain: '', sort: 'newest', page: 1 }} className="inline-flex items-center gap-2 text-sm text-neutral-500">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar ao catálogo
        </Link>
        <h2 className="mt-8 text-3xl font-semibold tracking-tight">Boas-vindas</h2>
        <p className="mt-2 text-sm text-neutral-500">Acesse sua conta para concluir o pedido.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-violet-700/30"
            />
          </label>
          <label className="block text-sm font-medium">
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-violet-700/30"
            />
          </label>
          {mutation.isError && <p role="alert" className="text-sm text-red-700">{mutation.error.message}</p>}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-xl bg-[#191816] px-5 py-3.5 font-medium text-white disabled:opacity-60"
          >
            {mutation.isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="mt-5 rounded-xl bg-neutral-100 p-4 text-xs leading-5 text-neutral-600">
          Acesso de demonstração: <strong>demo@example.com</strong> / <strong>demo123</strong>
        </p>
      </section>
    </div>
  )
}
