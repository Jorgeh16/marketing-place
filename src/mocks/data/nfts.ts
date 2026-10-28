import type { NFT } from '../../types/nft'

const artworks = [
  'Astral Bloom',
  'Neon Reverie',
  'Quiet Orbit',
  'Velvet Horizon',
  'Digital Eden',
  'Moonlit Circuit',
  'Infinite Garden',
  'Prism Dreams',
  'Echoes of Tomorrow',
  'Golden Frequency',
  'Cloud Cathedral',
  'Synthetic Soul',
  'Parallel Skies',
  'Midnight Botanica',
  'Chromatic Tide',
  'Lucid Machine',
  'Soft Infinity',
  'Electric Daydream',
  'Celestial Archive',
  'Bloom Protocol',
  'Afterglow Engine',
  'Tender Geometry',
  'Future Fossil',
  'Sapphire Weather',
  'Dreams in Orbit',
  'Pixel Wilds',
  'Solar Whispers',
  'The Last Algorithm',
  'Digital Wildflower',
  'Aether Study',
] as const

const collections = [
  'Otherworlds',
  'New Dimensions',
  'Garden State',
  'Future Relics',
  'Soft Machines',
] as const

const creators = [
  { name: 'Alex Morgan', username: 'alexmorgan' },
  { name: 'Luna Park', username: 'lunapark' },
  { name: 'Kai Rivera', username: 'kairivera' },
  { name: 'Sofia Chen', username: 'sofiachen' },
  { name: 'Noah Williams', username: 'noahw' },
] as const

const blockchains = ['Ethereum', 'Solana', 'Polygon'] as const
const currencies = ['ETH', 'SOL', 'MATIC'] as const

export const nfts: NFT[] = artworks.map((name, index) => {
  const number = index + 1
  const id = `nft-${String(number).padStart(3, '0')}`

  return {
    id,
    name,
    description: `${name} is a one-of-a-kind digital artwork exploring the meeting point of nature, imagination, and technology.`,
    image: `https://picsum.photos/seed/${id}/800/800`,
    price: Number((0.15 + number * 0.073).toFixed(3)),
    currency: currencies[index % currencies.length],
    creator: creators[index % creators.length],
    collection: collections[index % collections.length],
    blockchain: blockchains[index % blockchains.length],
    tokenId: String(1000 + number),
    likes: (number * 37) % 1200,
    createdAt: new Date(Date.UTC(2025, index % 12, (index % 28) + 1)).toISOString(),
  }
})