import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Gem } from 'lucide-react'
import { rootRoute } from '../router'
import { login } from '../lib/api'
import { getApiErrorMessage, getApiErrorStatus, sessionQueryKey } from '../lib/session'
import { queryClient } from '../lib/query-client'

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: search.redirect === '/checkout' ? '/checkout' as const : '/' as const,
  }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = loginRoute.useSearch()
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('demo123')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const mutation = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: ({ token, user }) => {
      localStorage.setItem('auth-token', token)
      queryClient.setQueryData(sessionQueryKey, user)
      void navigate({ to: redirectTo })
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: typeof fieldErrors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Informe um e-mail válido.'
    }
    if (!password) errors.password = 'Informe sua senha.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
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
        <Link to="/" search={{ q: '', sort: 'newest', page: 1 }} className="inline-flex items-center gap-2 text-sm text-neutral-500">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar ao catálogo
        </Link>
        <h2 className="mt-8 text-3xl font-semibold tracking-tight">Boas-vindas</h2>
        <p className="mt-2 text-sm text-neutral-500">Acesse sua conta para concluir o pedido.</p>
        <form noValidate onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">
            E-mail
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setFieldErrors((current) => ({ ...current, email: undefined }))
                mutation.reset()
              }}
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-violet-700/30"
            />
            {fieldErrors.email && <span id="login-email-error" role="alert" className="mt-1 block text-sm text-red-700">{fieldErrors.email}</span>}
          </label>
          <label className="block text-sm font-medium">
            Senha
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(fieldErrors.password || (mutation.isError && getApiErrorStatus(mutation.error) === 401))}
              aria-describedby={fieldErrors.password || (mutation.isError && getApiErrorStatus(mutation.error) === 401) ? 'login-password-error' : undefined}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setFieldErrors((current) => ({ ...current, password: undefined }))
                mutation.reset()
              }}
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-violet-700/30"
            />
            {(fieldErrors.password || (mutation.isError && getApiErrorStatus(mutation.error) === 401)) && (
              <span id="login-password-error" role="alert" className="mt-1 block text-sm text-red-700">
                {fieldErrors.password ?? getApiErrorMessage(mutation.error, 'Não foi possível entrar.')}
              </span>
            )}
          </label>
          {mutation.isError && getApiErrorStatus(mutation.error) !== 401 && (
            <p role="alert" className="text-sm text-red-700">{getApiErrorMessage(mutation.error, 'Não foi possível entrar.')}</p>
          )}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-xl bg-[#191816] px-5 py-3.5 font-medium text-white disabled:opacity-60"
          >
            {mutation.isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="mt-5 rounded-xl bg-neutral-100 p-4 text-xs leading-5 text-neutral-600">
          Acessos de demonstração: <strong>demo@example.com / demo123</strong> ou{' '}
          <strong>collector@example.com / collect123</strong>
        </p>
        <p className="mt-5 text-center text-sm text-neutral-600">
          Ainda não tem conta?{' '}
          <Link to="/register" search={{ redirect: redirectTo }} className="font-medium text-violet-800 underline">
            Criar conta
          </Link>
        </p>
      </section>
    </div>
  )
}
