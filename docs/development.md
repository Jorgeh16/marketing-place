# Desenvolvimento local

`npm run dev` inicia o Vite e o MSW, que simula os endpoints HTTP e o protocolo
Socket.IO no navegador. Esses mocks são apenas para demonstração e mantêm os dados
em memória; não substituem uma API ou um armazenamento persistente.

## Configuração de produção

O deploy da Vercel usa `vercel.json` e publica o build estático. Por padrão,
`.env.production` habilita o MSW para que a demonstração continue funcionando
publicada. Antes de conectar serviços reais, sobrescreva `VITE_ENABLE_MSW=false`
no ambiente de build e configure:

- `VITE_API_URL`: URL-base HTTPS da API persistente, incluindo o prefixo `/api`.
- `VITE_SOCKET_URL`: URL HTTPS do servidor Socket.IO (o cliente usa WebSocket).

O servidor deve implementar os endpoints usados em `src/lib/api.ts`, aceitar o
token Bearer de sessão e permitir a origem do site via CORS. O servidor Socket.IO
deve permitir a origem do site e implementar os eventos `nft:watch`,
`nft.updated`, `nft.updated:ack`, `order:watch`, `order.updated` e
`order.updated:ack`. A configuração de Vercel não cria nem hospeda esses serviços.

Não há provedor de pagamentos, API persistente, banco de dados ou servidor Socket.IO
de produção configurados neste repositório. O checkout e a conexão de carteira são
simulados; para processar pagamentos reais, integre um provedor escolhido e valide
transações no servidor, sem expor chaves privadas no frontend.

## Conta de demonstração

- E-mail: `demo@example.com`
- Senha: `demo123`

O mock disponibiliza catálogo e detalhe de NFTs, autenticação de demonstração,
perfil, carteiras, favoritos, cotações e pedidos. Os eventos mock são transmitidos
entre abas/clientes conectados ao navegador.

O painel **Cenários MSW**, visível somente em desenvolvimento, permite ativar
respostas lentas, falhas HTTP, sessões expiradas, alteração de preços, indisponibilidade
de estoque e resultados simulados de pagamento. A opção de reset restaura os dados
mock e limpa o armazenamento local do navegador.

## Testes de ponta a ponta

```bash
npm run test:e2e
```

Instale o navegador do Playwright uma vez por ambiente com
`npx playwright install chromium`.
