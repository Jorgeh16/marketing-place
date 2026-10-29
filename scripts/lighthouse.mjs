import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { generateReport } from 'lighthouse'

const root = fileURLToPath(new URL('../', import.meta.url))
const reportsDirectory = fileURLToPath(new URL('../docs/lighthouse/', import.meta.url))
const previewUrl = 'http://127.0.0.1:4176'
const previewEntry = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const lighthouseCli = fileURLToPath(new URL('../node_modules/lighthouse/cli/index.js', import.meta.url))
const measurements = 3
const targets = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
const cases = [
  { page: 'home', path: '/', viewport: 'mobile', width: 390, height: 844, deviceScaleFactor: 3 },
  { page: 'home', path: '/', viewport: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
  { page: 'nft-detail', path: '/nfts/nft-001', viewport: 'mobile', width: 390, height: 844, deviceScaleFactor: 3 },
  { page: 'nft-detail', path: '/nfts/nft-001', viewport: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
]

function median(values) {
  const sorted = [...values].sort((first, second) => first - second)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function summarize(result) {
  const userAgent = result.environment?.networkUserAgent ?? result.environment?.hostUserAgent
  const browser = typeof userAgent === 'string' ? userAgent.match(/Chrome\/[\d.]+/)?.[0] : undefined
  if (!browser) throw new Error('Lighthouse não retornou a versão do Chromium no user agent.')
  const categories = Object.fromEntries(
    Object.keys(targets).map((category) => {
      const score = result.categories[category]?.score
      if (typeof score !== 'number') throw new Error(`Lighthouse não retornou a categoria ${category}.`)
      return [category, Math.round(score * 100)]
    }),
  )
  const metrics = Object.fromEntries(
    [
      ['lcpMs', 'largest-contentful-paint'],
      ['cls', 'cumulative-layout-shift'],
      ['tbtMs', 'total-blocking-time'],
    ].map(([name, auditId]) => {
      const value = result.audits[auditId]?.numericValue
      if (typeof value !== 'number') throw new Error(`Lighthouse não retornou a métrica ${auditId}.`)
      return [name, value]
    }),
  )
  return { browser, categories, metrics }
}

async function waitForPreview(server) {
  const timeoutAt = Date.now() + 60_000
  let lastError
  while (Date.now() < timeoutAt) {
    if (server.exitCode !== null) {
      throw new Error(`O preview encerrou antes de ficar disponível (exit code ${server.exitCode}).`)
    }
    try {
      const response = await fetch(previewUrl)
      if (response.ok) return
      lastError = new Error(`Preview retornou HTTP ${response.status}.`)
    } catch (error) {
      lastError = error
    }
    await delay(500)
  }
  throw new Error(`O preview não iniciou em 60 segundos: ${String(lastError)}`)
}

function runLighthouse(auditCase) {
  const screenEmulation = [
    `--screenEmulation.mobile=${auditCase.viewport === 'mobile'}`,
    `--screenEmulation.width=${auditCase.width}`,
    `--screenEmulation.height=${auditCase.height}`,
    `--screenEmulation.deviceScaleFactor=${auditCase.deviceScaleFactor}`,
  ]
  const profile = auditCase.viewport === 'desktop'
    ? ['--preset=desktop', ...screenEmulation]
    : ['--form-factor=mobile', ...screenEmulation]
  const result = spawnSync(process.execPath, [
    lighthouseCli,
    `${previewUrl}${auditCase.path}`,
    '--quiet',
    '--output=json',
    '--output-path=stdout',
    '--port=0',
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
    ...profile,
  ], {
    cwd: root,
    env: { ...process.env, CHROME_PATH: chromePath },
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
    timeout: 300_000,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`Lighthouse falhou em ${auditCase.page}/${auditCase.viewport}: ${result.stderr || result.stdout}`)
  }
  try {
    return JSON.parse(result.stdout)
  } catch (error) {
    throw new Error(`A saída JSON de Lighthouse é inválida para ${auditCase.page}/${auditCase.viewport}.`, { cause: error })
  }
}

const lighthousePackage = JSON.parse(
  await readFile(new URL('../node_modules/lighthouse/package.json', import.meta.url), 'utf8'),
)
const chromePath = process.env.CHROME_PATH || (await import('@playwright/test')).chromium.executablePath()

await mkdir(reportsDirectory, { recursive: true })
const preview = spawn(process.execPath, [
  previewEntry,
  'preview',
  '--host',
  '127.0.0.1',
  '--port',
  '4176',
  '--strictPort',
], {
  cwd: root,
  env: { ...process.env, VITE_ENABLE_MSW: 'true' },
  stdio: 'inherit',
})

try {
  await waitForPreview(preview)
  const summaries = []

  for (const auditCase of cases) {
    const runs = []
    let finalResult
    for (let run = 1; run <= measurements; run += 1) {
      finalResult = runLighthouse(auditCase)
      runs.push(summarize(finalResult))
      console.log(`${auditCase.page}/${auditCase.viewport}: medição ${run}/${measurements}`)
    }

    const categoryMedians = Object.fromEntries(
      Object.keys(targets).map((category) => [
        category,
        median(runs.map((run) => run.categories[category])),
      ]),
    )
    const metricMedians = Object.fromEntries(
      Object.keys(runs[0].metrics).map((metric) => [
        metric,
        median(runs.map((run) => run.metrics[metric])),
      ]),
    )
    const baseName = `${auditCase.page}-${auditCase.viewport}`
    await writeFile(`${reportsDirectory}${baseName}.html`, generateReport(finalResult, 'html'))
    await writeFile(`${reportsDirectory}${baseName}.json`, generateReport(finalResult, 'json'))
    summaries.push({
      page: auditCase.page,
      path: auditCase.path,
      viewport: auditCase.viewport,
      viewportSize: `${auditCase.width}x${auditCase.height}`,
      runs,
      median: { categories: categoryMedians, metrics: metricMedians },
      targets,
    })
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      release: process.release.name,
      lighthouse: lighthousePackage.version,
      chromium: summaries[0].runs[0].browser,
      previewUrl,
      build: 'npm run build',
      mockScenario: 'default (MSW enabled)',
      measurementsPerPageAndViewport: measurements,
    },
    audits: summaries,
  }
  await writeFile(`${reportsDirectory}summary.json`, `${JSON.stringify(summary, null, 2)}\n`)

  for (const audit of summaries) {
    console.log(`${audit.page}/${audit.viewport} medians: ${JSON.stringify(audit.median.categories)}`)
    const belowTarget = Object.entries(audit.median.categories)
      .filter(([category, score]) => score < targets[category])
    if (belowTarget.length) {
      console.warn(`Abaixo da meta ${audit.page}/${audit.viewport}: ${JSON.stringify(belowTarget)}`)
    }
  }
} finally {
  const previewExit = preview.exitCode === null ? once(preview, 'exit') : undefined
  preview.kill()
  if (previewExit) await previewExit
}
