# Desenvolvimento local

`npm run dev` inicia o Vite, os endpoints HTTP simulados pelo MSW e o servidor
Socket.IO de demonstração. O MSW intercepta chamadas `/api` apenas durante o
desenvolvimento; em produção, configure `VITE_API_URL` e `VITE_SOCKET_URL` para
os serviços reais.

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
