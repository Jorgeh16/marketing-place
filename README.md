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
- MSW para simular a API durante o desenvolvimento

O projeto está apenas configurado; nenhuma tela ou rota de aplicação foi criada.

## API mockada

No desenvolvimento, o MSW inicia automaticamente e intercepta:

- `GET /api/nfts` — retorna a lista dos 30 NFTs.
- `GET /api/nfts/:id` — retorna um NFT; IDs desconhecidos respondem `404`.

Os dados e handlers estão em `src/mocks/`. O cliente Axios usa `/api` por padrão;
configure `VITE_API_URL` em `.env` se precisar apontar para outra API.
