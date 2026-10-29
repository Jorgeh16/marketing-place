# Architecture

## Overview and runtime

The client is a Vite-built React/TypeScript SPA. TanStack Router owns navigation,
TanStack Query manages server-shaped state, Axios sends REST requests, and MSW
intercepts those requests in development and in the published demo. The MSW
Socket.IO binding speaks to the app's real `socket.io-client`; no production API,
database, payment processor, or wallet provider is configured.

`src/main.tsx` starts MSW before rendering when `import.meta.env.DEV` is true or
`VITE_ENABLE_MSW=true`. `.env.production` enables it for the current Vercel demo.
The deployment is therefore a static client whose simulated business state lives
in the browser, not a production marketplace backend.

## REST contracts

All paths below are relative to the Axios base URL (`VITE_API_URL`, default
`/api`). Authenticated calls send the bearer token stored in `auth-token`.
Request/response TypeScript models and the mock implementations are the source
of truth in `src/lib/api.ts`, `src/types/nft.ts`, and `src/mocks/handlers.ts`.

| Method and path | Purpose |
| --- | --- |
| `GET /nfts` | Catalog search, filters, sorting, and pagination via query parameters. |
| `GET /nfts/:id` | NFT detail and current inventory. |
| `POST /auth/login`, `POST /auth/register` | Establish a mock session; return `{ user, token }`. |
| `GET /session`, `POST /auth/logout` | Resolve or end the current mock session. |
| `GET /favorites`, `POST /favorites`, `DELETE /favorites/:nftId` | Read and mutate the user's favorites. |
| `POST /quote` | Validate cart items/coupon and return itemized prices, discount, fee, and total. |
| `POST /orders` | Create an order from items and a quote; requires `Idempotency-Key`. |
| `GET /orders/pending`, `GET /orders/:id` | Recover the current user's pending order or fetch an owned order. |
| `GET /profile`, `PUT /profile`, `PUT /profile/password` | Read/update mock account details and password. |
| `GET /wallets`, `PUT /wallets` | Read and save mock wallet records. |

Errors are HTTP responses and Axios rejects them; forms display API-provided
messages where available. A `401` on an authenticated call removes the token,
clears the TanStack Query cache, emits the session-change event, and redirects
protected flows back through login. The cart has no REST resource: it is client
state persisted in local storage.

## Session, cart, cache, and persistence

- The demo token is stored in `localStorage` as `auth-token`; the mock maps it to
  a user. This is demonstration authentication, not a secure session system.
- Cart data is stored separately for guests and users (`cart-items:guest` and
  `cart-items:<userId>`). A guest cart can merge into the authenticated user's
  cart after login. Each line tracks an accepted NFT version so checkout can
  require acknowledgment when its price changes.
- Order and stock recovery state is stored in `localStorage` under
  `forma-mock-state-v1`: orders, ownership, idempotency records, pending
  decisions/deadlines, and stock. A pending order resumes after reload and uses
  the original idempotency key rather than creating a second order.
- Mock registrations, sessions, favorites, profile edits, and wallets are held in
  in-memory maps and reset on a full page reload. Do not treat these as durable
  user data.
- TanStack Query uses its library defaults globally, with explicit per-query
  settings where needed (for example, session and order queries disable retry).
  Auth changes clear cached data; private order requests are also authorized
  against their owner in the mock.

## Socket.IO events and REST reconciliation

The client sends `nft:watch(nftId, token)` and
`order:watch(orderId, token)` after connecting. The mock validates the session
and checks order ownership before registering a subscription.

Server-to-client resource events use this envelope:

```ts
{
  eventId: string
  resource: { id: string }
  version: number
  data: object
}
```

`nft.updated` carries the changed price, stock, or likes; `order.updated` carries
the new order status. The client ignores repeated `eventId`s and versions that
are not newer, then sends `nft.updated:ack` or `order.updated:ack`. On reconnect
it restores active watches and invalidates the relevant REST query. Pending
orders also poll `GET /orders/:id` every second; this is the recovery path if an
event is missed.

Authentication transitions disconnect tracked sockets. React effects disconnect
page-scoped subscriptions on unmount. The production URL has no `VITE_SOCKET_URL`
or external Socket.IO service configured, so published order status is backed by
MSW/REST polling rather than a production real-time service.

## Mock scenarios and reset

The development-only **Cenários MSW** panel activates reproducible latency,
network, auth, inventory, coupon, favorite, and payment behaviors. It can also
reset mock state and browser storage. Use `?scenario=<name>` to select a scenario
on initial load; the supported names and labels are in
`src/components/dev-scenario-panel.tsx`. E2E tests use the same test handlers
and reset state before each test.

## Visual and UX decisions

No Figma file/link or source artwork was available in the workspace. The
marketplace therefore uses 30 original locally hosted 600×600 SVG illustrations
in `public/nfts/`, with descriptive alt text and a consistent jungle-and-sea
palette. This avoids third-party image requests and reserves square artwork
space in the catalog.

Checkout and wallet connection are deliberately simulated; no real charge is
made. Dialogs/drawers are not present, so modal focus trapping is not applicable.
The visual baselines represent the implementation, not a pixel-match assertion
against unavailable Figma assets. The Lighthouse runner and targets are
documented in `docs/lighthouse/README.md`; a complete measurement set still
needs to be produced in an environment where Chromium completes all runs.
