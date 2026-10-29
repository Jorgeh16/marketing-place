# Architecture decisions

## NFT artwork assets

No Figma file or link was available in the workspace or shared browser session, and the project had no NFT artwork assets to reuse. The catalog therefore uses 30 original, locally hosted 600×600 SVG illustrations under `public/nfts/` instead of remote placeholder images. This is an intentional UX decision: themed artwork is available without a third-party image request, and the card layout reserves a square image area while each illustration loads.

The illustrations use a consistent jungle-and-sea palette and pirate-treasure subject matter. They are original assets and do not reproduce game logos, characters, or official artwork.

## Mock NFT inventory

The MSW NFT records retain their existing IDs and core marketplace fields. They now carry category, rarity, stock, descriptive image alt text, and decimal-string ETH prices to support the treasure catalog scenarios. All 30 NFTs currently have stock of 10. Availability filters derive from stock if the mock inventory is changed later.
