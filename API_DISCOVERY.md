## API Discovery

Target domain: `www.jumia.com.ng`
Target path tested: `/android-phones/`

### Existing Actor Audit
Current output fields (before rewrite):

- `name`
- `sku`
- `brand`
- `price`
- `price_formatted`
- `old_price`
- `old_price_formatted`
- `discount`
- `rating`
- `reviews_count`
- `url`
- `image_url`
- `is_official_store`
- `has_express_shipping`

Missing high-value fields:

- `seller_id`
- `is_sponsored`
- `is_buyable`
- `category_key`
- `brand_key`
- `selected_variation`
- `campaign_name`
- `campaign_tag`
- `discount_message`
- `last_modified`

### Candidate Endpoints Found

1. `GET /fragment/sp/products/provider/mirakl/catalog-page-types/category/...`
   - No auth required
   - Has pagination params (`page`, `numberItems`)
   - Returns HTML fragment with embedded JSON in attributes
   - Limitation: returns sponsored block content and repeats items across pages, so not reliable as primary catalog source

2. `GET /android-phones/?page=<N>`
   - No auth required
   - Pagination via `page` query parameter
   - Full catalog data exposed in `window.__STORE__.products` structured JSON on each page
   - Richer and stable for complete category extraction

### Score Summary (Per Skill Rubric)

- Candidate 1 score: `45`
  - JSON directly: `0`
  - >15 fields: `+25`
  - No auth: `+20`
  - Pagination: `+15`
  - Matches/extents current fields: `+10`
  - Quality penalty (sponsored-only, repeated results): `-25`

- Candidate 2 score: `80` (structured JSON fallback path)
  - JSON directly: `0` (embedded store object, not separate JSON API)
  - >15 fields: `+25`
  - No auth: `+20`
  - Pagination: `+15`
  - Matches/extents current fields: `+10`
  - Full catalog coverage and stable extraction: `+10`

## Selected API

- Endpoint: `https://www.jumia.com.ng/<category>/?page=<N>`
- Method: `GET`
- Auth: `None`
- Pagination: `page` query parameter
- Extraction target: `window.__STORE__.products`
- Fields available: `sku`, `name`, `displayName`, `brand`, `sellerId`, `prices.*`, `rating.*`, `url`, `image`, `isSponsored`, `isShopExpress`, `selectedVariation`, `tracking.*`, `badges.*`, `discounts.*`, `lastModified`
- Fields currently missing in actor (now added): `seller_id`, `is_sponsored`, `is_buyable`, `category_key`, `brand_key`, `selected_variation`, `campaign_name`, `campaign_tag`, `discount_message`, `last_modified`
- Field count: `~24` extracted fields vs `14` previously
