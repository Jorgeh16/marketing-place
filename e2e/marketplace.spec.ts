import { expect, test } from '@playwright/test'

test('catalog filters and pagination are reflected in the URL', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Explore as obras' })).toBeVisible()
  await expect(page.locator('article')).toHaveCount(12)

  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.locator('article')).toHaveCount(12)

  await page.getByLabel('Filtrar por coleção').selectOption('Otherworlds')
  await expect(page).toHaveURL(/collection=Otherworlds/)
  await expect(page).toHaveURL(/page=1/)
  await expect(page.locator('article')).toHaveCount(6)

  await page.getByRole('searchbox', { name: 'Buscar obras, artistas ou coleções' }).fill('Astral Bloom')
  await expect(page).toHaveURL(/q=Astral\+Bloom/)
  await expect(page.locator('article')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Astral Bloom' })).toBeVisible()
})

test('visitor can add an NFT, log in, create an order and receive live updates', async ({ page }) => {
  await page.goto('/')
  await page.locator('article').first().getByRole('link').click()
  await expect(page).toHaveURL(/\/nfts\/nft-\d+/)

  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByRole('button', { name: 'Adicionado ao carrinho' })).toBeVisible()
  await page.getByRole('link', { name: /Carrinho/ }).click()
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()

  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await page.getByRole('link', { name: 'Entrar na conta' }).click()
  await expect(page.getByRole('heading', { name: 'Boas-vindas' })).toBeVisible()
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Confirmar pedido' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page).toHaveURL(/\/orders\/ord-/)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
  await expect(page.getByText('Pedido criado')).toBeVisible()
  await expect(page.getByText('A transação foi confirmada na rede.')).toBeVisible({ timeout: 10000 })
})
