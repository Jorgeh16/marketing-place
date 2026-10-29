import { createRouter } from '@tanstack/react-router'
import { catalogRoute } from './routes/catalog-page'
import { nftDetailRoute } from './routes/nft-detail-page'
import { cartRoute } from './routes/cart-page'
import { checkoutRoute } from './routes/checkout-page'
import { loginRoute } from './routes/login-page'
import { orderRoute } from './routes/order-page'
import { registerRoute } from './routes/register-page'
import { profileRoute } from './routes/profile-page'
import { rootRoute } from './root-route'

const routeTree = rootRoute.addChildren([
  catalogRoute,
  nftDetailRoute,
  cartRoute,
  checkoutRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  orderRoute,
])

export const router = createRouter({ routeTree })

export { rootRoute }

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
