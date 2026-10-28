# Desenvolvimento local

`npm run dev` inicia o Vite, os endpoints HTTP simulados pelo MSW e o servidor
Socket.IO de demonstração. O MSW intercepta chamadas `/api` apenas durante o
desenvolvimento e também é habilitado em builds de produção por `.env.production`.
O site da Vercel é configurado por `vercel.json`; o arquivo
`public/mockServiceWorker.js` é incluído no build para permitir a interceptação
no navegador publicado.

O mock HTTP roda no navegador e serve para demonstração; ele não substitui uma
API persistente. O servidor Socket.IO é um processo separado de desenvolvimento
e envia o evento `nft.updated` ao abrir um detalhe, além de emitir atualizações
de status de pedidos. Ele não faz parte do deploy estático da Vercel. Para
atualizações em tempo real em produção, hospede um servidor Socket.IO e configure
`VITE_SOCKET_URL`; configure também `VITE_API_URL` para a API persistente.

## Conta de demonstração

- E-mail: `demo@example.com`
- Senha: `demo123`

O mock disponibiliza catálogo e detalhe de NFTs, autenticação de demonstração,
criação e consulta de pedidos. O servidor Socket.IO envia atualizações de estado
para o pedido aberto no navegador.

## Testes de ponta a ponta

```bash
npm run test:e2e
```

Instale o navegador do Playwright uma vez por ambiente com
`npx playwright install chromium`.
