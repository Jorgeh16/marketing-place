# NFT Marketplace

Base do projeto criada com Vite, React e TypeScript, com Tailwind CSS e shadcn/ui.

## Executar

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env` e ajuste `VITE_API_URL` para apontar para a API.

## Stack configurada

- TanStack Router para rotas
- TanStack Query para estado assíncrono
- Axios em `src/lib/axios.ts`
- Tailwind CSS v4 e shadcn/ui

O projeto está apenas configurado; nenhuma tela ou rota de aplicação foi criada.

## Testes E2E

Os testes Playwright sobem o app com `npm run dev:e2e` na porta `4175` e ativam o MSW
no navegador para usar os dados simulados.

```bash
npm run test:e2e
```
