# NFT Marketplace

Marketplace demonstrativo de NFTs criado com Vite, React, TypeScript, Tailwind CSS e
shadcn/ui. O catálogo, a autenticação, as carteiras e os pedidos usam dados simulados;
nenhuma compra ou cobrança real é realizada.

## Executar localmente

```bash
npm install
npm run dev
```

O MSW é ativado automaticamente durante o desenvolvimento. `.env.example` contém
valores de exemplo para `VITE_API_URL`; veja [docs/development.md](./docs/development.md)
para configurar serviços externos e deploy.

## Funcionalidades demonstrativas

- Catálogo com busca, ordenação e paginação sincronizadas com a URL
- Detalhes de NFTs, carrinho persistido no navegador e favoritos
- Cadastro, login, perfil, alteração de senha e carteiras mock
- Cotação, cupom, checkout simulado, idempotência e recibo
- Atualizações de preço e status de pedido via Socket.IO mock
- Painel de cenários para testar erros e latência durante o desenvolvimento

## Contas de demonstração

- `demo@example.com` / `demo123`
- `collector@example.com` / `collect123`

As contas, sessões e dados de API são simulados e mantidos em memória. O token de
demonstração fica no navegador; senhas não são gravadas no armazenamento local.

## Testes e validação

```bash
npm run lint
npm run build
npm run test:e2e
```

Os testes Playwright iniciam o app na porta `4175`, ativam o MSW e usam Chromium.
Instale o navegador do Playwright uma vez por ambiente com
`npx playwright install chromium`.
