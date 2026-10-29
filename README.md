# NFT Marketplace

Marketplace de demonstração criado com Vite, React e TypeScript, com Tailwind CSS e shadcn/ui.

## Executar

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env` e ajuste `VITE_API_URL` para apontar para a API, se necessário.

## Stack configurada

- TanStack Router para rotas
- TanStack Query para estado assíncrono
- Axios em `src/lib/axios.ts`
- Tailwind CSS v4 e shadcn/ui

O MSW simula catálogo, autenticação, sessão e pedidos durante o desenvolvimento.

## Contas de demonstração

- `demo@example.com` / `demo123`
- `collector@example.com` / `collect123`

O token de sessão é salvo no navegador; a senha não é persistida. O cadastro e os pedidos
são simulados e não realizam cobranças reais.

## Testes E2E

Os testes Playwright sobem o app com `npm run dev:e2e` na porta `4175` e ativam o MSW
no navegador para usar os dados simulados.

```bash
npm run test:e2e
```
