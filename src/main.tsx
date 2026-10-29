import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

async function startApplication() {
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  const { default: App } = await import('./App.tsx')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

startApplication().catch((error: unknown) => {
  console.error('Failed to start the application.', error)
  throw error
})
