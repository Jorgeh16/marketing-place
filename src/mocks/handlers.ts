import { http, HttpResponse } from 'msw'
import { nfts } from './data/nfts'

export const handlers = [
  http.get('/api/nfts', () => HttpResponse.json(nfts)),
  http.get('/api/nfts/:id', ({ params }) => {
    const nft = nfts.find((item) => item.id === params.id)

    if (!nft) {
      return HttpResponse.json({ message: 'NFT not found' }, { status: 404 })
    }

    return HttpResponse.json(nft)
  }),
]
