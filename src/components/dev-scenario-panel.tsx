import { useEffect, useState } from 'react'

const scenarios = [
  ['default', 'Estado padrão'],
  ['slow', 'Resposta lenta'],
  ['variable-latency', 'Latência variável'],
  ['out-of-order', 'Respostas fora de ordem'],
  ['timeout', 'Timeout de API'],
  ['connection-drop', 'Queda de conexão Socket.IO'],
  ['error-4xx', 'Erro HTTP 4xx'],
  ['error-5xx', 'Erro HTTP 5xx'],
  ['expired-session', 'Sessão expirada'],
  ['registration-conflict', 'Conflito de cadastro'],
  ['coupon-invalid', 'Cupom inválido'],
  ['price-changed', 'Preço alterado'],
  ['sold-out', 'Edição esgotada'],
  ['order-timeout-after-create', 'Timeout após criar pedido'],
  ['payment-confirmed', 'Pagamento confirmado'],
  ['payment-declined', 'Pagamento recusado'],
  ['favorite-failure', 'Falha ao salvar favorito'],
] as const

type Scenario = typeof scenarios[number][0]

export function DevScenarioPanel() {
  const [scenario, setScenario] = useState<Scenario>('default')

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('scenario')
    if (!scenarios.some(([value]) => value === requested)) return
    void activate(requested as Scenario, false)
  }, [])

  async function activate(nextScenario: Scenario, reload = true) {
    const response = await fetch('/api/test/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: nextScenario }),
    })
    if (!response.ok) throw new Error(`Não foi possível ativar o cenário ${nextScenario}.`)
    setScenario(nextScenario)
    const url = new URL(window.location.href)
    url.searchParams.set('scenario', nextScenario)
    window.history.replaceState(null, '', url)

    if (reload) window.location.reload()
  }

  async function reset() {
    const response = await fetch('/api/test/reset', { method: 'POST' })
    if (!response.ok) throw new Error('Não foi possível restaurar o estado mock.')
    localStorage.clear()
    setScenario('default')
    const url = new URL(window.location.href)
    url.searchParams.delete('scenario')
    window.history.replaceState(null, '', url)
    window.location.reload()
  }

  if (!import.meta.env.DEV) return null

  return (
    <details className="fixed bottom-3 right-3 z-50 max-w-[calc(100vw-1.5rem)] rounded-xl border border-black/15 bg-white p-3 text-sm shadow-xl">
      <summary className="cursor-pointer font-semibold">Cenários MSW</summary>
      <label className="mt-3 block text-xs font-medium">
        Cenário reproduzível
        <select
          aria-label="Cenário de desenvolvimento"
          value={scenario}
          onChange={(event) => void activate(event.target.value as Scenario)}
          className="mt-1 w-full rounded-lg border border-black/15 px-2 py-2"
        >
          {scenarios.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => void reset()} className="mt-3 w-full rounded-lg bg-[#191816] px-3 py-2 text-white">
        Resetar cenário
      </button>
    </details>
  )
}
