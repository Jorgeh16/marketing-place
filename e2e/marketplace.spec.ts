import { expect, test } from '@playwright/test'

test('catalog lists NFTs and supports URL-backed search, sorting and pagination', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'NFTs' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Sapphire Weather' })).toBeVisible()
  await expect(page.getByText('Página 1 de 3')).toBeVisible()

  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText('Página 2 de 3')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Buscar por nome' }).fill('Astral Bloom')
  await expect(page).toHaveURL(/q=Astral\+Bloom.*page=1/)
  await expect(page.getByRole('img', { name: 'Astral Bloom' })).toBeVisible()

  await page.getByLabel('Ordenar por').selectOption('price-asc')
  await expect(page).toHaveURL(/sort=price-asc.*page=1/)
  await expect(page.getByRole('img', { name: 'Astral Bloom' })).toBeVisible()

  await page.getByRole('searchbox', { name: 'Buscar por nome' }).fill('no NFT has this name')
  await expect(page.getByRole('status')).toHaveText('Nenhum NFT encontrado. Tente buscar por outro nome.')
})

test('catalog restores search, sorting and page from the URL after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox', { name: 'Buscar por nome' }).fill('a')
  await expect(page).toHaveURL(/q=a.*page=1/)

  await page.getByRole('combobox', { name: 'Ordenar por' }).selectOption('price-desc')
  await expect(page).toHaveURL(/sort=price-desc.*page=1/)

  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page).toHaveURL(/q=a.*sort=price-desc.*page=2/)
  await expect(page.getByText(/Página 2 de/)).toBeVisible()

  const catalogUrl = page.url()
  await page.reload({ waitUntil: 'domcontentloaded' })

  await expect(page).toHaveURL(catalogUrl)
  await expect(page.getByRole('searchbox', { name: 'Buscar por nome' })).toHaveValue('a')
  await expect(page.getByRole('combobox', { name: 'Ordenar por' })).toHaveValue('price-desc')
  await expect(page.getByText(/Página 2 de/)).toBeVisible()
})

test('visitor can add an NFT to the cart from the catalog', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox', { name: 'Buscar por nome' }).fill('Astral Bloom')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()

  await expect(page.getByRole('button', { name: 'Adicionado ao carrinho' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Carrinho (1)' })).toBeVisible()
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Astral Bloom' })).toBeVisible()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('1')
})

test('cart quantity and total persist after reload', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Astral Bloom' })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()

  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
  await page.getByRole('button', { name: 'Aumentar quantidade de Astral Bloom' }).click()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('2')
  await expect(page.getByText('0,446 ETH', { exact: true })).toBeVisible()

  await page.reload()

  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Astral Bloom' })).toBeVisible()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('2')
  await expect(page.getByText('0,446 ETH', { exact: true })).toBeVisible()
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
