import { createRootRoute } from '@tanstack/react-router'
import { AppLayout } from './components/app-layout'

export const rootRoute = createRootRoute({
  component: AppLayout,
})
