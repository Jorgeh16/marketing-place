export function formatPrice(price: string) {
  const amount = Number(price)
  if (!Number.isFinite(amount)) throw new Error(`Preço inválido: ${price}`)
  return amount.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}
