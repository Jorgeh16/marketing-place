import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { rootRoute } from '../root-route'
import { changePassword, getProfile, getWallets, saveWallet, updateProfile, type Wallet } from '../lib/api'
import { getApiErrorMessage, getApiErrorStatus, getSession, sessionQueryKey } from '../lib/session'
import { queryClient } from '../lib/query-client'

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData({
      queryKey: sessionQueryKey,
      queryFn: getSession,
    })
    if (!user) throw redirect({ to: '/login', search: { redirect: '/' } })
  },
  component: ProfilePage,
})

const emptyWallet = { name: '', address: '', network: 'Ethereum', primary: false }

function ProfilePage() {
  const cache = useQueryClient()
  const profile = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const wallets = useQuery({ queryKey: ['wallets'], queryFn: getWallets })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [walletDraft, setWalletDraft] = useState(emptyWallet)
  const [editingWalletId, setEditingWalletId] = useState<string | undefined>()
  const [addingWallet, setAddingWallet] = useState(false)

  useEffect(() => {
    if (!profile.data) return
    setName(profile.data.name)
    setEmail(profile.data.email)
    setAvatar(profile.data.avatar ?? '')
  }, [profile.data])

  const profileMutation = useMutation({
    mutationFn: () => updateProfile({ name, email, ...(avatar ? { avatar } : {}) }),
    onSuccess: async (updated) => {
      cache.setQueryData(['profile'], updated)
      cache.setQueryData(sessionQueryKey, updated)
      await cache.invalidateQueries({ queryKey: sessionQueryKey })
    },
  })
  const passwordMutation = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
    },
  })
  const walletMutation = useMutation({
    mutationFn: () => saveWallet({ ...walletDraft, ...(editingWalletId ? { id: editingWalletId } : {}) }),
    onSuccess: async () => {
      setWalletDraft(emptyWallet)
      setEditingWalletId(undefined)
      setAddingWallet(false)
      await cache.invalidateQueries({ queryKey: ['wallets'] })
    },
  })

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    profileMutation.mutate()
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    passwordMutation.mutate()
  }

  function submitWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    walletMutation.mutate()
  }

  function editWallet(wallet: Wallet) {
    setEditingWalletId(wallet.id)
    setAddingWallet(false)
    setWalletDraft({
      name: wallet.name,
      address: wallet.address,
      network: wallet.network,
      primary: wallet.primary,
    })
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Perfil e carteiras</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/5 bg-white p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Dados do perfil</h2>
          <form onSubmit={submitProfile} className="mt-5 space-y-4">
            <label className="block text-sm font-medium">Nome
              <input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5" />
            </label>
            <label className="block text-sm font-medium">E-mail
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5" />
            </label>
            <label className="block text-sm font-medium">URL do avatar
              <input type="url" value={avatar} onChange={(event) => setAvatar(event.target.value)} className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5" />
            </label>
            {avatar && <img src={avatar} alt="Prévia do avatar" className="size-16 rounded-full object-cover" />}
            {profileMutation.isError && <p role="alert" className="text-sm text-red-700">{getApiErrorMessage(profileMutation.error, 'Não foi possível salvar o perfil.')}</p>}
            {getApiErrorStatus(profileMutation.error) === 409 && <p role="alert" className="text-sm text-red-700">Este e-mail já está em uso.</p>}
            <button type="submit" disabled={profileMutation.isPending} className="rounded-xl bg-[#191816] px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
              {profileMutation.isPending ? 'Salvando…' : 'Salvar perfil'}
            </button>
          </form>

          <h2 className="mt-10 text-xl font-semibold">Alterar senha</h2>
          <form onSubmit={submitPassword} className="mt-5 space-y-4">
            <label className="block text-sm font-medium">Senha atual
              <input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5" />
            </label>
            <label className="block text-sm font-medium">Nova senha
              <input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5" />
            </label>
            {passwordMutation.isError && <p role="alert" className="text-sm text-red-700">{getApiErrorMessage(passwordMutation.error, 'Não foi possível alterar a senha.')}</p>}
            <button type="submit" disabled={passwordMutation.isPending} className="rounded-xl border border-black/15 px-5 py-3 text-sm font-medium disabled:opacity-60">
              Alterar senha
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Carteiras</h2>
          <ul className="mt-5 space-y-3">
            {(wallets.data ?? []).map((wallet) => (
              <li key={wallet.id} className="flex items-start justify-between gap-3 rounded-xl bg-neutral-50 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{wallet.name}{wallet.primary ? ' · Principal' : ' · Secundária'}</p>
                  <p className="mt-1 break-all text-xs text-neutral-500">{wallet.address}</p>
                  <p className="mt-1 text-xs text-neutral-500">{wallet.network}</p>
                </div>
                <button type="button" onClick={() => editWallet(wallet)} className="shrink-0 text-sm font-medium text-violet-800 underline">Editar</button>
              </li>
            ))}
          </ul>
          {(wallets.data?.length ?? 0) < 2 && !editingWalletId && (
            <button type="button" onClick={() => { setAddingWallet(true); setWalletDraft({ ...emptyWallet, primary: (wallets.data?.length ?? 0) === 0 }) }} className="mt-4 text-sm font-medium text-violet-800 underline">Cadastrar carteira</button>
          )}
          {(addingWallet || editingWalletId) && (
            <form onSubmit={submitWallet} className="mt-6 space-y-4 border-t border-black/5 pt-5">
              <h3 className="font-semibold">{editingWalletId ? 'Editar carteira' : 'Nova carteira'}</h3>
              <label className="block text-sm font-medium">Nome
                <input required value={walletDraft.name} onChange={(event) => setWalletDraft((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5" />
              </label>
              <label className="block text-sm font-medium">Endereço
                <input required pattern="0x[a-fA-F0-9]{40}" value={walletDraft.address} onChange={(event) => setWalletDraft((current) => ({ ...current, address: event.target.value }))} className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5" />
              </label>
              <label className="block text-sm font-medium">Rede
                <select value={walletDraft.network} onChange={(event) => setWalletDraft((current) => ({ ...current, network: event.target.value }))} className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2.5">
                  <option>Ethereum</option><option>Polygon</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={walletDraft.primary} onChange={(event) => setWalletDraft((current) => ({ ...current, primary: event.target.checked }))} /> Definir como principal</label>
              {walletMutation.isError && <p role="alert" className="text-sm text-red-700">{getApiErrorMessage(walletMutation.error, 'Não foi possível salvar a carteira.')}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={walletMutation.isPending} className="rounded-xl bg-[#191816] px-5 py-3 text-sm font-medium text-white disabled:opacity-60">Salvar carteira</button>
                <button type="button" onClick={() => { setAddingWallet(false); setEditingWalletId(undefined); setWalletDraft(emptyWallet) }} className="rounded-xl border border-black/15 px-5 py-3 text-sm">Cancelar</button>
              </div>
            </form>
          )}
          {walletsQueryError(wallets.error) && <p role="alert" className="mt-4 text-sm text-red-700">{getApiErrorMessage(wallets.error, 'Não foi possível carregar carteiras.')}</p>}
        </section>
      </div>
    </div>
  )
}

function walletsQueryError(error: unknown) {
  return Boolean(error)
}
