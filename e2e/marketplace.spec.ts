import { expect, test } from '@playwright/test'

test('catalog lists NFT names, images and prices', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'NFTs' })).toBeVisible()
  await expect(page.locator('[data-slot="card"]')).toHaveCount(30)
  await expect(page.getByRole('img', { name: 'Astral Bloom' })).toBeVisible()
  await expect(page.getByText('Astral Bloom')).toBeVisible()
  await expect(page.getByText('0,223 ETH')).toBeVisible()
})

test('visitor can add an NFT to the cart from the catalog', async ({ page }) => {
  await page.goto('/')
  const nftCard = page.locator('[data-slot="card"]').filter({ hasText: 'Astral Bloom' })
  await nftCard.getByRole('button', { name: 'Adicionar ao carrinho' }).click()

  await expect(nftCard.getByRole('button', { name: 'Adicionado ao carrinho' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Carrinho (1)' })).toBeVisible()
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Astral Bloom' })).toBeVisible()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('1')
})

test('NFT detail handles missing items and applies nft.updated events', async ({ page }) => {
  await page.goto('/nfts/does-not-exist')
  await expect(page.getByRole('heading', { name: 'Não foi possível encontrar esta obra' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao catálogo' }).click()

  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Astral Bloom' })).toBeVisible()
  await expect(page.getByText('37', { exact: true })).toBeVisible()
  await expect(page.getByText('38', { exact: true })).toBeVisible({ timeout: 10000 })
})

test('visitor can add an NFT, log in, create an order and receive live updates', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Astral Bloom' })).toBeVisible()

  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByRole('button', { name: 'Adicionado ao carrinho' })).toBeVisible()
  await page.getByRole('link', { name: /Carrinho/ }).click()
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Astral Bloom' })).toBeVisible()
  await page.getByRole('button', { name: 'Aumentar quantidade de Astral Bloom' }).click()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('2')
  await page.getByRole('button', { name: 'Diminuir quantidade de Astral Bloom' }).click()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('1')

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
