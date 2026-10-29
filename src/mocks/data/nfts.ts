import type { NFT } from '../../types/nft'

type Artwork = {
  name: string
  slug: string
  description: string
  category: string
  rarity: NFT['rarity']
  stock: number
  price: string
  collection: string
  alt: string
}

const artworks: Artwork[] = [
  { name: 'Baú do Capitão', slug: 'bau-do-capitao', description: 'Um baú de madeira guarda moedas sob folhas de palmeira.', category: 'Tesouro', rarity: 'Lendário', stock: 10, price: '0.223', collection: 'Tesouros do Convés', alt: 'Baú dourado aberto entre folhas de palmeira' },
  { name: 'Papagaio Dourado', slug: 'papagaio-dourado', description: 'Uma ave dourada observa o horizonte sobre o mar.', category: 'Criatura', rarity: 'Épico', stock: 10, price: '0.314', collection: 'Navegantes da Selva', alt: 'Papagaio dourado pousado em um galho tropical' },
  { name: 'Caveira da Maré', slug: 'caveira-da-mare', description: 'Uma caveira antiga repousa entre corais e conchas.', category: 'Relíquia', rarity: 'Raro', stock: 10, price: '0.187', collection: 'Relíquias da Maré', alt: 'Caveira de osso decorada com conchas e coral' },
  { name: 'Bússola de Jade', slug: 'bussola-de-jade', description: 'Uma bússola verde aponta para uma rota esquecida.', category: 'Navegação', rarity: 'Incomum', stock: 10, price: '0.095', collection: 'Cartografia Perdida', alt: 'Bússola de jade com agulha dourada' },
  { name: 'Mapa das Brumas', slug: 'mapa-das-brumas', description: 'Um mapa gasto revela ilhas escondidas na neblina.', category: 'Cartografia', rarity: 'Raro', stock: 10, price: '0.421', collection: 'Cartografia Perdida', alt: 'Mapa antigo com ilhas, trilhas e uma rosa dos ventos' },
  { name: 'Moedas da Maré', slug: 'moedas-da-mare', description: 'Moedas antigas brilham com reflexos azul-petróleo.', category: 'Tesouro', rarity: 'Comum', stock: 10, price: '0.062', collection: 'Tesouros do Abismo', alt: 'Moedas douradas antigas empilhadas sobre areia' },
  { name: 'Gancho do Corsário', slug: 'gancho-do-corsario', description: 'Um gancho de bronze marcado por longas viagens.', category: 'Equipamento', rarity: 'Incomum', stock: 10, price: '0.276', collection: 'Relíquias do Convés', alt: 'Gancho de bronze polido sobre fundo de madeira' },
  { name: 'Navio Vento Sul', slug: 'navio-vento-sul', description: 'Um veleiro atravessa águas tranquilas rumo à selva.', category: 'Embarcação', rarity: 'Lendário', stock: 10, price: '0.918', collection: 'Navegantes da Selva', alt: 'Navio à vela navegando em mar azul diante de ilhas verdes' },
  { name: 'Espada do Recife', slug: 'espada-do-recife', description: 'Uma lâmina curva carrega as cores do recife.', category: 'Equipamento', rarity: 'Raro', stock: 10, price: '0.358', collection: 'Relíquias da Maré', alt: 'Espada curva com cabo de madeira e detalhes marinhos' },
  { name: 'Luneta do Vigia', slug: 'luneta-do-vigia', description: 'Uma luneta de latão amplia os sinais no horizonte.', category: 'Navegação', rarity: 'Comum', stock: 10, price: '0.128', collection: 'Relíquias do Convés', alt: 'Luneta de latão aberta sobre um mapa náutico' },
  { name: 'Âncora de Coral', slug: 'ancora-de-coral', description: 'Uma pequena âncora coberta por coral colorido.', category: 'Relíquia', rarity: 'Incomum', stock: 10, price: '0.244', collection: 'Relíquias da Maré', alt: 'Âncora de ferro entre ramos de coral' },
  { name: 'Garrafa do Convés', slug: 'garrafa-do-conves', description: 'Uma garrafa de vidro verde guarda uma mensagem enrolada.', category: 'Relíquia', rarity: 'Comum', stock: 10, price: '0.073', collection: 'Tesouros do Convés', alt: 'Garrafa verde com uma mensagem sobre areia tropical' },
  { name: 'Pérola da Lagoa', slug: 'perola-da-lagoa', description: 'Uma pérola luminosa encontrada numa lagoa escondida.', category: 'Tesouro', rarity: 'Épico', stock: 10, price: '0.687', collection: 'Tesouros do Abismo', alt: 'Pérola iridescente em uma concha azul' },
  { name: 'Lanterna do Convés', slug: 'lanterna-do-conves', description: 'Uma lanterna antiga ilumina a noite entre as palmeiras.', category: 'Equipamento', rarity: 'Incomum', stock: 10, price: '0.156', collection: 'Relíquias do Convés', alt: 'Lanterna dourada acesa diante de folhas escuras' },
  { name: 'Chave do Cofre', slug: 'chave-do-cofre', description: 'Uma chave ornamentada abre um cofre esquecido.', category: 'Relíquia', rarity: 'Raro', stock: 10, price: '0.509', collection: 'Tesouros do Convés', alt: 'Chave antiga de bronze com dentes ornamentados' },
  { name: 'Concha de Maré', slug: 'concha-de-mare', description: 'Uma concha rosada ecoa o som das ondas.', category: 'Relíquia', rarity: 'Comum', stock: 10, price: '0.084', collection: 'Relíquias da Maré', alt: 'Concha rosada sobre uma praia de areia dourada' },
  { name: 'Bandeira da Enseada', slug: 'bandeira-da-enseada', description: 'Uma bandeira de tecido marca uma enseada protegida.', category: 'Navegação', rarity: 'Épico', stock: 10, price: '0.743', collection: 'Navegantes da Selva', alt: 'Bandeira verde presa a um mastro em uma enseada' },
  { name: 'Timão de Ébano', slug: 'timao-de-ebano', description: 'Um timão escuro leva o navio por águas desconhecidas.', category: 'Embarcação', rarity: 'Raro', stock: 10, price: '0.392', collection: 'Navegantes da Selva', alt: 'Timão de madeira escura com centro dourado' },
  { name: 'Mapa Rasgado', slug: 'mapa-rasgado', description: 'Um fragmento de mapa guarda pistas de um tesouro.', category: 'Cartografia', rarity: 'Incomum', stock: 10, price: '0.119', collection: 'Cartografia Perdida', alt: 'Fragmento rasgado de mapa com rota pontilhada' },
  { name: 'Baú de Esmeraldas', slug: 'bau-de-esmeraldas', description: 'Esmeraldas e moedas repousam em um baú de madeira.', category: 'Tesouro', rarity: 'Lendário', stock: 10, price: '0.832', collection: 'Tesouros do Abismo', alt: 'Baú aberto repleto de gemas verdes e moedas' },
  { name: 'Ave das Copas', slug: 'ave-das-copas', description: 'Uma ave colorida vigia a trilha do alto das árvores.', category: 'Criatura', rarity: 'Raro', stock: 10, price: '0.327', collection: 'Navegantes da Selva', alt: 'Ave tropical colorida entre folhas verdes' },
  { name: 'Dente do Abismo', slug: 'dente-do-abismo', description: 'Um dente fossilizado foi encontrado no fundo do mar.', category: 'Relíquia', rarity: 'Épico', stock: 10, price: '0.591', collection: 'Tesouros do Abismo', alt: 'Dente fossilizado envolto por algas e coral' },
  { name: 'Rosa dos Ventos', slug: 'rosa-dos-ventos', description: 'Uma rosa dos ventos dourada orienta antigas rotas.', category: 'Navegação', rarity: 'Incomum', stock: 10, price: '0.205', collection: 'Cartografia Perdida', alt: 'Rosa dos ventos dourada gravada em madeira' },
  { name: 'Ampulheta Azul', slug: 'ampulheta-azul', description: 'Areia azul escorre lentamente por uma ampulheta de vidro.', category: 'Relíquia', rarity: 'Lendário', stock: 10, price: '1.125', collection: 'Relíquias da Maré', alt: 'Ampulheta de vidro azul sobre pedras costeiras' },
  { name: 'Coroa do Capitão', slug: 'coroa-do-capitao', description: 'Uma coroa de bronze guarda uma gema verde no centro.', category: 'Tesouro', rarity: 'Épico', stock: 10, price: '0.654', collection: 'Tesouros do Convés', alt: 'Coroa de bronze com uma gema verde central' },
  { name: 'Barril do Porto', slug: 'barril-do-porto', description: 'Um barril marcado por sal e sol repousa no cais.', category: 'Equipamento', rarity: 'Comum', stock: 10, price: '0.048', collection: 'Relíquias do Convés', alt: 'Barril de madeira com aros de metal junto ao cais' },
  { name: 'Botas do Marinheiro', slug: 'botas-do-marinheiro', description: 'Botas resistentes prontas para uma longa travessia.', category: 'Equipamento', rarity: 'Incomum', stock: 10, price: '0.172', collection: 'Navegantes da Selva', alt: 'Par de botas de couro marrom sobre tábuas do convés' },
  { name: 'Arpão de Jade', slug: 'arpao-de-jade', description: 'Um arpão esculpido em jade repousa entre conchas.', category: 'Equipamento', rarity: 'Raro', stock: 10, price: '0.468', collection: 'Relíquias da Maré', alt: 'Arpão verde de jade com ponta de metal dourado' },
  { name: 'Farol Esquecido', slug: 'farol-esquecido', description: 'Um farol antigo resiste entre a selva e o mar.', category: 'Embarcação', rarity: 'Épico', stock: 10, price: '0.779', collection: 'Navegantes da Selva', alt: 'Farol de pedra em uma ilha tropical ao entardecer' },
  { name: 'Tesouro da Ilha Verde', slug: 'tesouro-da-ilha-verde', description: 'Moedas antigas apontam para uma ilha coberta de palmeiras.', category: 'Tesouro', rarity: 'Lendário', stock: 10, price: '0.967', collection: 'Tesouros do Abismo', alt: 'Moedas douradas diante de uma ilha tropical' },
] as const

const creators = [
  { name: 'Alex Morgan', username: 'alexmorgan' },
  { name: 'Luna Park', username: 'lunapark' },
  { name: 'Kai Rivera', username: 'kairivera' },
  { name: 'Sofia Chen', username: 'sofiachen' },
  { name: 'Noah Williams', username: 'noahw' },
] as const

const blockchains = ['Ethereum', 'Solana', 'Polygon'] as const

export const nfts: NFT[] = artworks.map((artwork, index) => {
  const number = index + 1
  const id = `nft-${String(number).padStart(3, '0')}`

  return {
    id,
    name: artwork.name,
    description: artwork.description,
    image: `/nfts/${artwork.slug}.svg`,
    imageAlt: artwork.alt,
    price: artwork.price,
    currency: 'ETH',
    category: artwork.category,
    rarity: artwork.rarity,
    stock: artwork.stock,
    creator: creators[index % creators.length],
    collection: artwork.collection,
    blockchain: blockchains[index % blockchains.length],
    tokenId: String(1000 + number),
    likes: (number * 37) % 1200,
    createdAt: new Date(Date.UTC(2025, index % 12, (index % 28) + 1)).toISOString(),
  }
})