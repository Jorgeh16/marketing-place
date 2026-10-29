# Matriz de cenários Playwright

Os testes são executados com estado MSW isolado por teste. Os cenários de tempo real
usam o `socket.io-client` da aplicação; eventos REST de teste passam pelos handlers MSW.

| Cenário oficial | Testes que o cobrem |
| --- | --- |
| 1. Busca, filtros combinados, ordenação, paginação e histórico | `catalog lists NFTs and supports URL-backed search, sorting and pagination`; `catalog combines filters with search and restores them from the URL`; `catalog restores search, sorting and page from the URL after reload` |
| 2. Acesso direto ao detalhe e recurso inexistente | `NFT detail handles missing items and applies nft.updated events`; `visual baseline: NFT detail` |
| 3. Cadastro, login, expiração, logout e troca de usuário | `registration validates fields and reports an already registered email`; `registration creates a session and logout protects checkout again`; `login validates fields and accepts the second mock user`; `protected checkout redirects without login and logout clears authentication data`; `changing accounts removes access to the previous account order and socket subscription` |
| 4. Favoritos, falha de mutation e rollback | `favorites require a session, roll back failures, and can be removed` |
| 5. Carrinho, quantidade, cupom, persistência e login | `visitor can add an NFT to the cart from the catalog`; `cart quantity and total persist after reload`; `visitor can add an NFT, log in, create an order and receive live updates`; `visual baseline: cart` |
| 6. Compra do catálogo ao recibo confirmado | `complete login and purchase from the catalog shows an itemized receipt`; `visual baseline: payment review` |
| 7. Pagamento recusado, cliques repetidos e timeout recuperável | `declined payment keeps the cart available for another attempt`; `repeated confirmation clicks create only one order`; `a pending order is recovered after reload without creating a second order` |
| 8. Perfil, avatar, senha, carteiras e erros | `profile edits, password changes, and wallet updates work end to end` |
| 9. Preço e disponibilidade via Socket.IO durante navegação/checkout | `live NFT price updates notify cart and block checkout until accepted`; `NFT detail handles missing items and applies nft.updated events` |
| 10. Duplicatas, eventos antigos, desconexão e retomada | `duplicate and stale NFT events do not change the accepted latest price`; `order socket events apply once and ignore duplicates and stale versions`; `a pending order reconnects after a Socket.IO interruption without duplicating purchase` |
| 11. Teclado, foco e validação | `keyboard navigation reaches login fields and validation errors` |
| 12. Skeleton, carregamento lento, falha e retry | `slow loading shows skeletons and a failed request recovers on retry` |

`responsive-visual.spec.ts` registra início, detalhe, carrinho e revisão de pagamento
nos projetos Chromium desktop (1440 px), tablet (768 px) e mobile (390 px). Os PNGs
versionados ficam em `e2e/responsive-visual.spec.ts-snapshots/`.

**Limitação:** a interface não contém diálogos ou drawers; portanto, não há controle
de foco modal para testar. O fluxo de checkout não abre integração de carteira real.
