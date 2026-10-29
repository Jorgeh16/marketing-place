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

Para ver as decisões de arquitetura, contratos REST/eventos e limites do mock,
consulte [ARCHITECTURE.md](./ARCHITECTURE.md).

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
npm run typecheck
npm run lint
npm run build
npm run preview
npm run test:e2e
npm run test:e2e:visual
npm run lighthouse
```

`npm run test:e2e` inicia o app na porta `4175`, ativa o MSW e usa Chromium. Os
testes funcionais rodam no desktop; as baselines visuais rodam nos projetos
desktop (1440 px), tablet (768 px) e mobile (390 px). Para executar partes da
suíte:

```bash
npx playwright test e2e/marketplace.spec.ts --project=chromium-desktop
npx playwright test e2e/responsive-visual.spec.ts
npm run test:e2e:update-snapshots
```

Em uma falha, o Playwright retém o trace e gera o relatório HTML:

```bash
npx playwright show-report
```

Instale o Chromium uma vez por ambiente com `npx playwright install chromium`.
Os testes resetam o estado MSW antes de cada caso. Durante `npm run dev`, use o
painel **Cenários MSW** para ativar falhas e latência e **Resetar cenário** para
restaurar os mocks. A lista dos cenários e o mapa dos 12 requisitos estão em
[docs/testing.md](./docs/testing.md); cenários são reproduzíveis também por
`?scenario=<nome>`.

`npm run lighthouse` gera o build de produção, sobe o preview local e audita
início/detalhe em mobile/desktop com três medições por combinação. Relatórios
HTML/JSON e medianas ficam em `docs/lighthouse/`.
