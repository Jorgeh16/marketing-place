import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'NFTs' })).toBeVisible({ timeout: 15_000 })
  await page.evaluate(async () => {
    await fetch('/api/test/reset', { method: 'POST' })
    localStorage.clear()
  })
})

async function hideScenarioPanel(page: Page) {
  const panel = page.locator('details').filter({ hasText: 'Cenários MSW' })
  await panel.evaluate((element) => { element.style.display = 'none' })
}

async function capture(page: Page, name: string) {
  await hideScenarioPanel(page)
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  })
}

test('visual baseline: home', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'NFTs' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('img').first()).toBeVisible({ timeout: 15_000 })
  await capture(page, 'home')
})

test('visual baseline: NFT detail', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Baú do Capitão' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('img', { name: 'Baú dourado aberto entre folhas de palmeira' })).toBeVisible({ timeout: 15_000 })
  await capture(page, 'detail')
})

test('visual baseline: cart', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Carrinho', exact: true })).toBeVisible()
  await capture(page, 'cart')
})

test('visual baseline: payment review', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Dados do colecionador' })).toBeVisible()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Revisar pagamento' }).click()
  await expect(page.getByRole('heading', { name: 'Revisar pagamento' })).toBeVisible()
  await capture(page, 'payment')
})
