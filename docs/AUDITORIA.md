# Auditoria do desafio — NFT Marketplace

**Atualizada:** 29/10/2026  
**Enunciado:** [`junglegaming/frontend-challenge`](https://github.com/junglegaming/frontend-challenge/blob/main/README.md)  
**Aplicação publicada:** <https://marketing-place-tset.vercel.app/>

Esta tabela resume as seções 1–12 do desafio com base no checkout atual. Um
status completo significa que há implementação/evidência local correspondente;
não equivale a uma aprovação externa. A publicação pública não foi submetida a
uma nova execução completa dos fluxos nesta atualização.

| Seção | Requisito | Status | Evidência | O que falta |
|---|---|---|---|---|
| 1 | Escopo de descoberta, compra e conta em telas responsivas | **parcial** | `src/routes/`, `src/components/`, `e2e/` | Há catálogo, detalhe, carrinho, checkout e perfil. Não há galeria/seleção de edição no detalhe; a fidelidade ao Figma não pode ser verificada sem os arquivos de design. |
| 2 | Stack React/TypeScript, roteamento, cache, REST/Axios, Socket.IO, Tailwind/shadcn, MSW, Playwright e Lighthouse | **parcial** | `package.json`, `src/router.tsx`, `src/lib/`, `src/mocks/`, `playwright.config.ts`, `scripts/lighthouse.mjs` | A stack e o runner Lighthouse estão configurados. Falta concluir uma execução Lighthouse íntegra e guardar os relatórios requeridos. |
| 3 | Fluxos e telas de catálogo, NFT, carrinho, checkout e conta | **parcial** | `src/routes/`, `src/cart/cart-provider.tsx`, `e2e/marketplace.spec.ts` | Busca, filtros combináveis, ordenação, paginação, favoritos, cupom, compra simulada e recibo existem. Faltam galeria/edição no detalhe e uma referência de transação simulada no recibo. |
| 4 | Tipagem, estados, cache, erros, sessão e proteção de rotas | **parcial** | `src/lib/api.ts`, `src/lib/session.ts`, `src/lib/axios.ts`, `src/cart/cart-provider.tsx` | Há tratamento de sessão expirada, cache e carrinho separado por usuário. O backend é simulado no navegador; dados de cadastro, favoritos, perfil e carteiras não sobrevivem a uma recarga completa. |
| 5 | Contratos REST, validação e idempotência | **parcial** | `ARCHITECTURE.md`, `src/lib/api.ts`, `src/mocks/handlers.ts`, `e2e/marketplace.spec.ts` | Os contratos implementados e a idempotência estão documentados/testados. O carrinho não possui recurso REST próprio e as respostas são mocks, não uma API persistente. |
| 6 | MSW, cenários reproduzíveis, estado coerente e reset | **parcial** | `src/mocks/handlers.ts`, `src/mocks/socket-binding.ts`, `src/components/dev-scenario-panel.tsx`, `docs/testing.md` | Os cenários e reset existem; pedidos pendentes/estoque recuperam-se via `localStorage`. Usuários, sessões, favoritos, perfil e carteiras são mapas em memória e reiniciam ao recarregar a página. |
| 7 | Socket.IO, versões, duplicatas, eventos antigos, reconexão e isolamento | **parcial** | `src/lib/order-socket.ts`, `src/mocks/socket-binding.ts`, `src/mocks/handlers.ts`, `e2e/marketplace.spec.ts` | A lógica mock deduplica e ordena eventos, valida assinaturas e reconcilia pedidos via REST. Não há serviço Socket.IO externo configurado na publicação; atualizações públicas de pedido dependem de polling REST. |
| 8 | Responsividade, acessibilidade, skeletons e regressão visual | **parcial** | `playwright.config.ts`, `e2e/responsive-visual.spec.ts`, `e2e/responsive-visual.spec.ts-snapshots/`, `src/components/` | Há baselines de início, detalhe, carrinho e revisão de pagamento em 390/768/1440 px, além de teste de teclado. Faltam auditoria completa de todas as telas/fluxos, redução de movimento e comparação com o Figma original. |
| 9 | 12 cenários Playwright, isolamento, Chromium desktop/mobile, traces e relatório | **parcial** | `e2e/marketplace.spec.ts`, `e2e/responsive-visual.spec.ts`, `docs/testing.md`, `playwright.config.ts` | Os 12 cenários estão mapeados; reporter HTML e `retain-on-failure` estão configurados. A suíte completa não foi repetida nesta finalização por solicitação do usuário; os fluxos funcionais executam no projeto desktop e as baselines, nos três viewports. |
| 10 | Lighthouse para início/detalhe, mobile/desktop, 3 medições, medianas e relatórios | **parcial** | `scripts/lighthouse.mjs`, `package.json`, `docs/lighthouse/README.md` | O runner coleta as categorias e LCP/CLS/TBT para calcular medianas. O Chromium terminou as tentativas com `TARGET_CRASHED`; os relatórios parciais foram removidos. Não há resultados completos nem justificativa baseada em uma matriz final de pontuação. |
| 11 | Evidências e avaliação dos critérios do desafio | **parcial** | `docs/testing.md`, `docs/lighthouse/README.md`, `ARCHITECTURE.md`, `e2e/` | Há mapa de cenários, decisões e limitações. Falta a evidência Lighthouse íntegra e validação final completa da suíte e do deploy após a publicação. |
| 12 | Entrega reproduzível, documentação, assets e deploy público | **parcial** | `README.md`, `ARCHITECTURE.md`, `docs/development.md`, `public/nfts/`, `vercel.json` | Build e lint passaram antes desta atualização; catálogo e detalhe público abriram. Após o push, ainda é necessário confirmar o novo deploy e executar a URL publicada em sessão limpa. |

## Lacunas priorizadas

1. **Alta — Lighthouse verificável:** executar `npm run lighthouse` em um ambiente
   estável, gerar as quatro combinações HTML/JSON e medianas; corrigir ou justificar
   qualquer pontuação abaixo das metas Performance 90, Accessibility 95, Best
   Practices 95 e SEO 90.
2. **Alta — validação E2E final:** rodar a suíte Playwright completa, incluindo
   fluxos desktop e regressão visual nos viewports desktop/tablet/mobile. Essa
   execução foi interrompida a pedido do usuário nesta sessão.
3. **Alta — confirmar a publicação:** verificar que a Vercel implantou o commit
   final e repetir catálogo, detalhe, favoritos, carrinho/cupom, login, checkout e
   pedido em sessão limpa.
4. **Média — Socket.IO externo:** configurar/fornecer um servidor real somente se
   o critério exigir atualização em tempo real fora do mock; hoje a publicação
   não configura `VITE_SOCKET_URL`.
5. **Média — completar detalhe e correspondência visual:** adicionar galeria e
   edição/quantidade no detalhe se exigidas pelo enunciado e comparar com os
   arquivos Figma quando disponíveis.
6. **Média — persistência do mock de usuário:** tornar contas de demonstração,
   favoritos, perfil e carteiras persistentes caso o avaliador exija que esses
   dados sobrevivam a reload. O comportamento atual está documentado em
   `ARCHITECTURE.md`.

## Validações desta atualização

- `npm run build`: passou.
- `npm run lint`: passou com avisos React/hooks já observados.
- `node --check scripts/lighthouse.mjs`: passou antes da tentativa de auditoria.
- Lighthouse: não concluído; o Chromium reportou `TARGET_CRASHED`. Nenhum relatório
  parcial foi mantido como se fosse evidência válida.
- Playwright completo: não executado novamente, conforme solicitação do usuário.
- URL pública: catálogo e acesso direto ao detalhe foram abertos; não foi feita
  nova execução pública de todos os fluxos.
