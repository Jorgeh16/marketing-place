import { createRootRoute, createRouter } from '@tanstack/react-router'
import { AppLayout } from './components/app-layout'
import { catalogRoute } from './routes/catalog-page'
import { nftDetailRoute } from './routes/nft-detail-page'
import { cartRoute } from './routes/cart-page'
import { checkoutRoute } from './routes/checkout-page'
import { loginRoute } from './routes/login-page'
import { orderRoute } from './routes/order-page'
import { registerRoute } from './routes/register-page'

export const rootRoute = createRootRoute({
  component: AppLayout,
})

const routeTree = rootRoute.addChildren([
  catalogRoute,
  nftDetailRoute,
  cartRoute,
  checkoutRoute,
  loginRoute,
  registerRoute,
  orderRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
