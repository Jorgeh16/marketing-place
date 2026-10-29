import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { rootRoute } from '../root-route'
import { register } from '../lib/api'
import { getApiErrorMessage, getApiErrorStatus, sessionQueryKey } from '../lib/session'
import { queryClient } from '../lib/query-client'

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: search.redirect === '/checkout' ? '/checkout' as const : '/' as const,
  }),
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = registerRoute.useSearch()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({})
  const mutation = useMutation({
    mutationFn: () => register({ name, email, password }),
    onSuccess: ({ token, user }) => {
      localStorage.setItem('auth-token', token)
      queryClient.setQueryData(sessionQueryKey, user)
      void navigate({ to: redirectTo })
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: typeof fieldErrors = {}
    if (!name.trim()) errors.name = 'Informe seu nome.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Informe um e-mail válido.'
    }
    if (password.length < 8) errors.password = 'A senha deve ter pelo menos 8 caracteres.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    mutation.mutate()
  }

  const emailTaken = mutation.isError && getApiErrorStatus(mutation.error) === 409

  return (
    <div className="mx-auto max-w-md px-5 py-12 sm:px-8 sm:py-16">
      <Link
        to="/login"
        search={{ redirect: redirectTo }}
        className="inline-flex items-center gap-2 text-sm text-neutral-500"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar ao login
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Criar conta</h1>
      <p className="mt-2 text-sm text-neutral-500">Cadastre-se para continuar com seu pedido.</p>
      <form noValidate onSubmit={submit} className="mt-8 space-y-5">
        <label className="block text-sm font-medium">
          Nome
          <input
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setFieldErrors((current) => ({ ...current, name: undefined }))
              mutation.reset()
            }}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-violet-700/30"
          />
          {fieldErrors.name && <span id="register-name-error" role="alert" className="mt-1 block text-sm text-red-700">{fieldErrors.name}</span>}
        </label>
        <label className="block text-sm font-medium">
          E-mail
          <input
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email || emailTaken)}
            aria-describedby={fieldErrors.email || emailTaken ? 'register-email-error' : undefined}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setFieldErrors((current) => ({ ...current, email: undefined }))
              mutation.reset()
            }}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-violet-700/30"
          />
          {(fieldErrors.email || emailTaken) && (
            <span id="register-email-error" role="alert" className="mt-1 block text-sm text-red-700">
              {fieldErrors.email ?? getApiErrorMessage(mutation.error, 'Este e-mail já está cadastrado.')}
            </span>
          )}
        </label>
        <label className="block text-sm font-medium">
          Senha
          <input
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setFieldErrors((current) => ({ ...current, password: undefined }))
              mutation.reset()
            }}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-violet-700/30"
          />
          {fieldErrors.password && <span id="register-password-error" role="alert" className="mt-1 block text-sm text-red-700">{fieldErrors.password}</span>}
        </label>
        {mutation.isError && !emailTaken && (
          <p role="alert" className="text-sm text-red-700">
            {getApiErrorMessage(mutation.error, 'Não foi possível criar a conta.')}
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-xl bg-[#191816] px-5 py-3.5 font-medium text-white disabled:opacity-60"
        >
          {mutation.isPending ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>
    </div>
  )
}
