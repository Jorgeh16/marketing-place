# Lighthouse

Execute `npm run lighthouse`. The script first builds the optimized application,
starts Vite preview on `127.0.0.1:4176`, and audits `/` and `/nfts/nft-001` on
mobile (390×844, DPR 3) and desktop (1440×900, DPR 1). MSW is enabled so the
detail route has the same deterministic catalog data on every run.
Lighthouse 13 requires Node.js 22.19 or newer.

Each page/viewport combination is measured three times. `summary.json` records
the tool and runtime versions, environment, all three category scores and
LCP/CLS/TBT measurements, and the median for each value. The matching HTML/JSON
reports are the full Lighthouse result from the third measurement; use the
summary for the three-run median.

Targets are Performance ≥90, Accessibility ≥95, Best Practices ≥95, and SEO
≥90. No complete report set is checked in: Chromium ended Lighthouse runs with
`TARGET_CRASHED` in this Windows environment, and the partial reports were
removed rather than presented as a valid three-run matrix. Re-run the command
in a stable Chromium environment before treating Lighthouse as complete or
certifying the hosted Vercel deployment.
