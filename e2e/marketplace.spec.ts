import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'NFTs' })).toBeVisible()

  const reset = await page.evaluate(async () => {
    const response = await fetch('/api/test/reset', { method: 'POST' })
    localStorage.clear()
    return response.status
  })
  expect(reset).toBe(200)

  const socketReset = await page.request.post('http://127.0.0.1:3001/__test/reset')
  expect(socketReset.status()).toBe(204)
})

async function addNFTToCartAndSignIn(page: Page) {
  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Baú do Capitão' })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByRole('heading', { name: 'Confirmar pedido' })).toBeVisible()
}

async function postNFTUpdate(
  page: Page,
  eventId: string,
  version: number,
  price: number,
) {
  const response = await page.request.post(
    'http://127.0.0.1:3001/__test/nfts/nft-001/events',
    {
      headers: { 'x-event-id': eventId },
      data: { version, price },
    },
  )
  expect(response.status()).toBe(202)
  await expect.poll(async () => {
    const stateResponse = await page.request.get('http://127.0.0.1:3001/__test/state')
    const state = await stateResponse.json() as { acknowledgedEvents: string[] }
    return state.acknowledgedEvents.includes(eventId)
  }, { timeout: 10000 }).toBe(true)
}

test('catalog lists NFTs and supports URL-backed search, sorting and pagination', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'NFTs' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Ampulheta de vidro azul sobre pedras costeiras' })).toBeVisible()
  await expect(page.getByText('Disponível: 10', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Página 1 de 3')).toBeVisible()

  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText('Página 2 de 3')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Buscar por nome' }).fill('Baú do Capitão')
  await expect(page).toHaveURL(/q=Ba%C3%BA\+do\+Capit%C3%A3o.*page=1/)
  await expect(page.getByRole('img', { name: 'Baú dourado aberto entre folhas de palmeira' })).toBeVisible()

  await page.getByLabel('Ordenar por').selectOption('price-asc')
  await expect(page).toHaveURL(/sort=price-asc.*page=1/)
  await expect(page.getByRole('img', { name: 'Baú dourado aberto entre folhas de palmeira' })).toBeVisible()

  await page.getByRole('searchbox', { name: 'Buscar por nome' }).fill('no NFT has this name')
  await expect(page.getByRole('status')).toHaveText('Nenhum NFT encontrado. Tente buscar por outro nome.')
})

test('pirate NFT mocks expose local artwork and varied inventory metadata', async ({ page }) => {
  await page.goto('/')

  let totalImages = 0
  let soldOutItems = 0
  let inStockItems = 0
  let shipAvailable = false
  let mapAvailable = false
  for (let pageNumber = 1; pageNumber <= 3; pageNumber += 1) {
    await expect(page.getByText(`Página ${pageNumber} de 3`)).toBeVisible()
    if (await page.getByText('Navio Vento Sul', { exact: true }).count()) {
      await expect(page.getByText('Disponível: 10', { exact: true }).first()).toBeVisible()
      shipAvailable = true
    }
    if (await page.getByText('Mapa Rasgado', { exact: true }).count()) {
      await expect(page.getByText('Disponível: 10', { exact: true }).first()).toBeVisible()
      mapAvailable = true
    }
    const imageResults = await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll<HTMLImageElement>(
        'img[width="600"][height="600"][loading="lazy"]',
      ))
      return await Promise.all(images.map(async (image) => {
        image.loading = 'eager'
        try {
          await image.decode()
          return { src: new URL(image.currentSrc).pathname, width: image.naturalWidth }
        } catch {
          return { src: new URL(image.src).pathname, width: 0 }
        }
      }))
    })
    totalImages += imageResults.length
    soldOutItems += await page.getByRole('button', { name: 'Esgotado', exact: true }).count()
    inStockItems += await page.getByText('Disponível: 10', { exact: true }).count()
    expect(imageResults.every(({ src, width }) => /^\/nfts\/[\w-]+\.svg$/.test(src) && width === 600)).toBe(true)
    if (pageNumber < 3) await page.getByRole('button', { name: 'Próxima' }).click()
  }

  expect(totalImages).toBe(30)
  expect(soldOutItems).toBe(0)
  expect(inStockItems).toBe(30)
  expect(shipAvailable).toBe(true)
  expect(mapAvailable).toBe(true)
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

  await page.goto('/?q=&sort=newest&page=3')
  await expect(page.getByText('Página 3 de 3')).toBeVisible()
  const firstThirdPageImage = await page.locator('img[width="600"][height="600"]').first().getAttribute('src')
  expect(firstThirdPageImage).toMatch(/^\/nfts\/[\w-]+\.svg$/)
  const thirdPageUrl = page.url()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(thirdPageUrl)
  await expect(page.getByRole('heading', { name: 'NFTs' })).toBeVisible()
  await expect(page.getByText('Página 3 de 3')).toBeVisible()
  await expect(page.locator('img[width="600"][height="600"]').first()).toHaveAttribute('src', String(firstThirdPageImage))
})

test('visitor can add an NFT to the cart from the catalog', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox', { name: 'Buscar por nome' }).fill('Baú do Capitão')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()

  await expect(page.getByRole('button', { name: 'Adicionado ao carrinho' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Carrinho (1)' })).toBeVisible()
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Baú do Capitão' })).toBeVisible()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('1')
})

test('cart quantity and total persist after reload', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Baú do Capitão' })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()

  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
  await page.getByRole('button', { name: 'Aumentar quantidade de Baú do Capitão' }).click()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('2')
  await expect(page.getByText('0,446 ETH', { exact: true })).toBeVisible()

  await page.reload()

  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Baú do Capitão' })).toBeVisible()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('2')
  await expect(page.getByText('0,446 ETH', { exact: true })).toBeVisible()
})

test('checkout redirects to login and restores the session after reload', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  await expect(page.getByRole('heading', { name: 'Boas-vindas' })).toBeVisible()
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  const storedAuth = await page.evaluate(() => ({
    keys: Object.keys(localStorage),
    values: Object.values(localStorage),
  }))
  expect(storedAuth.keys).toContain('auth-token')
  expect(storedAuth.keys).not.toContain('auth-user')
  expect(storedAuth.values).not.toContain('demo123')

  await page.reload()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})

test('registration validates fields and reports an already registered email', async ({ page }) => {
  await page.goto('/register')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Informe seu nome.' })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Informe um e-mail válido.' })).toBeVisible()

  await page.getByLabel(/Nome/).fill('Another Collector')
  await page.getByLabel(/E-mail/).fill('demo@example.com')
  await page.getByLabel(/Senha/).fill('longpassword')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Este e-mail já está cadastrado.' })).toBeVisible()
})

test('registration creates a session and logout protects checkout again', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Nome', { exact: true }).fill('New Collector')
  await page.getByLabel('E-mail', { exact: true }).fill(`collector-${Date.now()}@example.com`)
  await page.getByLabel('Senha', { exact: true }).fill('newpassword123')
  await page.getByRole('button', { name: 'Criar conta' }).click()

  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await expect(page).toHaveURL(/\/\?q=&sort=newest&page=1/)
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
})

test('login validates fields and accepts the second mock user', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/E-mail/).fill('not-an-email')
  await page.getByLabel(/Senha/).fill('')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Informe um e-mail válido.' })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Informe sua senha.' })).toBeVisible()

  await page.getByLabel(/E-mail/).fill('collector@example.com')
  await page.getByLabel(/Senha/).fill('wrong-password')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'E-mail ou senha inválidos' })).toBeVisible()

  await page.getByLabel(/Senha/).fill('collect123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await expect(page.getByText('Alex Morgan')).toBeVisible()
})

test('order idempotency returns the same order and rejects changed content', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  const result = await page.evaluate(async () => {
    const token = localStorage.getItem('auth-token')
    const key = crypto.randomUUID()
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': key,
    }
    const first = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: [{ nftId: 'nft-001', quantity: 1 }] }),
    })
    const firstOrder = await first.json() as { id: string }
    const replay = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: [{ nftId: 'nft-001', quantity: 1 }] }),
    })
    const replayOrder = await replay.json() as { id: string }
    const conflict = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: [{ nftId: 'nft-001', quantity: 2 }] }),
    })
    return {
      firstStatus: first.status,
      replayStatus: replay.status,
      firstId: firstOrder.id,
      replayId: replayOrder.id,
      conflictStatus: conflict.status,
    }
  })

  expect(result.firstStatus).toBe(201)
  expect(result.replayStatus).toBe(200)
  expect(result.replayId).toBe(result.firstId)
  expect(result.conflictStatus).toBe(409)
})

test('checkout preserves the cart when order creation fails', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Confirmar pedido' })).toBeVisible()

  await page.evaluate(() => localStorage.setItem('auth-token', 'invalid-session-token'))
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page.getByRole('alert')).toContainText('Não autenticado')
  await expect(page.getByRole('heading', { name: 'Confirmar pedido' })).toBeVisible()
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Baú do Capitão' })).toBeVisible()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('1')
  await expect(page.getByRole('complementary').getByText('0,223 ETH', { exact: true })).toBeVisible()
})

test('complete login and purchase from the catalog shows an itemized receipt', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox', { name: 'Buscar por nome' }).fill('Baú do Capitão')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Confirmar pedido' })).toBeVisible()
  await expect(page.getByText('0,223 ETH', { exact: true }).last()).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()

  await expect(page).toHaveURL(/\/orders\/ord-/)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
  await expect(page.getByText('Baú do Capitão × 1')).toBeVisible()
  await expect(page.getByText('0,223 ETH', { exact: true }).last()).toBeVisible()
})

test('repeated confirmation clicks create only one order', async ({ page }) => {
  await addNFTToCartAndSignIn(page)
  await page.getByRole('button', { name: 'Confirmar pedido' }).dblclick()
  await expect(page).toHaveURL(/\/orders\/ord-/)

  await expect.poll(async () => {
    const response = await page.evaluate(async () => {
      const state = await fetch('/api/test/state')
      return await state.json() as { orderCount: number }
    })
    return response.orderCount
  }).toBe(1)
})

test('live NFT price updates notify cart and block checkout until accepted', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Baú do Capitão' })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
  await page.getByRole('link', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Boas-vindas' })).toBeVisible()
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()

  await postNFTUpdate(page, 'price-update-v2', 2, 0.5)
  await expect(page.getByRole('alert')).toContainText('O preço de Baú do Capitão foi atualizado.')
  await expect(page.getByRole('alert')).toContainText('Novo preço: 0,5 ETH')
  await expect(page.getByRole('link', { name: 'Continuar para pagamento' })).toHaveAttribute('aria-disabled', 'true')

  await page.goto('/checkout')
  await expect(page.getByRole('alert')).toContainText('Há preços atualizados que precisam ser aceitos')
  await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled()

  await page.getByRole('link', { name: 'Revisar carrinho' }).click()
  await page.getByRole('button', { name: 'Aceitar novo preço' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeEnabled()
})

test('duplicate and stale NFT events do not change the accepted latest price', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Baú do Capitão' })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()

  await postNFTUpdate(page, 'price-update-v10', 10, 0.5)
  await expect(page.getByRole('alert')).toContainText('Novo preço: 0,5 ETH')

  await postNFTUpdate(page, 'price-update-v10-duplicate', 10, 0.75)
  await expect(page.getByRole('alert')).toContainText('Novo preço: 0,5 ETH')
  await expect(page.getByRole('alert')).not.toContainText('0,75 ETH')

  await postNFTUpdate(page, 'price-update-v9-stale', 9, 0.2)
  await expect(page.getByRole('alert')).toContainText('Novo preço: 0,5 ETH')
  await expect(page.getByRole('alert')).not.toContainText('0,2 ETH')
})

test('protected checkout redirects without login and logout clears authentication data', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  await expect(page.getByRole('heading', { name: 'Boas-vindas' })).toBeVisible()
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()

  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
  const storedKeys = await page.evaluate(() => Object.keys(localStorage))
  expect(storedKeys).not.toContain('auth-token')
  expect(storedKeys).not.toContain('auth-user')
  const sessionStatus = await page.evaluate(async () => (await fetch('/api/session')).status)
  expect(sessionStatus).toBe(401)

  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
})

test('NFT detail handles missing items and applies nft.updated events', async ({ page }) => {
  await page.goto('/nfts/does-not-exist')
  await expect(page.getByRole('heading', { name: 'Não foi possível encontrar esta obra' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao catálogo' }).click()

  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Baú do Capitão' })).toBeVisible()
  await expect(page.getByText('38', { exact: true })).toBeVisible({ timeout: 10000 })
})

test('visitor can add an NFT, log in, create an order and receive live updates', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Baú do Capitão' })).toBeVisible()

  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByRole('button', { name: 'Adicionado ao carrinho' })).toBeVisible()
  await page.getByRole('link', { name: /Carrinho/ }).click()
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Baú do Capitão' })).toBeVisible()
  await page.getByRole('button', { name: 'Aumentar quantidade de Baú do Capitão' }).click()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('2')
  await page.getByRole('button', { name: 'Diminuir quantidade de Baú do Capitão' }).click()
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveText('1')

  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  await expect(page.getByRole('heading', { name: 'Boas-vindas' })).toBeVisible()
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Confirmar pedido' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page).toHaveURL(/\/orders\/ord-/)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
  await expect(page.getByText('Baú do Capitão × 1')).toBeVisible()
  await expect(page.getByText('0,223 ETH', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Carrinho' })).toBeVisible()
  await expect(page.getByText('Pedido criado')).toBeVisible()
  await expect(page.getByText('A transação foi confirmada na rede.')).toBeVisible({ timeout: 10000 })
})
