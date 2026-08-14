# API Discovery

Target: `https://www.jumia.com.ng/android-phones/`

## Existing Actor Audit

The browser/HTML implementation exposed 25 possible fields:

`name`, `sku`, `brand`, `seller_id`, `price`, `price_formatted`, `old_price`,
`old_price_formatted`, `discount`, `discount_formatted`, `rating`, `reviews_count`,
`url`, `image_url`, `is_official_store`, `has_express_shipping`, `is_sponsored`,
`is_buyable`, `selected_variation`, `category_key`, `brand_key`, `campaign_name`,
`campaign_tag`, `discount_message`, and `last_modified`.

Useful fields missing from that output were product category paths, tags, image alt text,
EUR tracking values, second-chance status, variation metadata, related products, campaign
URLs, and wishlist state.

## URLScan.io

- Search endpoint: `https://urlscan.io/api/v1/search/?q=domain:www.jumia.com.ng`
- Recent Jumia scans were found, but their page status was HTTP 403.
- The full result endpoint returned `You're not logged in`, so response bodies were not
  available for candidate extraction.
- A browser network capture was therefore required after completing Jumia's Cloudflare
  verification.

## Candidate Matrix

| Candidate | Header/profile | Status/body marker | Product fields | Pagination/batch | Decision |
|---|---|---|---:|---|---|
| Category page | Desktop Chrome HTTP | 403, `Just a moment...` | 0 | `page` blocked | Rejected |
| Category page | iOS Safari 18.5 | 403, `Just a moment...` | 0 | `page` blocked | Rejected |
| Category page | Android `okhttp/4.12.0` | 403, `Just a moment...` | 0 | `page` blocked | Rejected |
| `catalog/?q=phone&ajax=true` | Desktop/iOS/Android | 403, Cloudflare HTML | 0 | Unknown | Rejected |
| `m.jumia.com.ng` / `mobile.jumia.com.ng` | All profiles | DNS host not found | 0 | Unknown | Rejected |
| `fragment/sb/catalog-page-types/category` | Solved browser session | 200, sidebar payload | 0 products | Page parameter | Rejected |
| Product fragment as HTML | Solved browser, `Accept: text/html` | 200, markup | 26 + nested | Batch size | Rejected |
| Product fragment as JSON | Solved browser, `Accept: application/json` | 200, JSON products | 26 + nested | `numberItems`, max 36 unique | Selected |

Playwright Firefox and ordinary Patchright sessions were challenged. Patchright Chrome
with persistent state and maximum-stealth launch options could pass intermittently. After a
repeat challenge, the pinned NopeCHA Chromium automation extension v0.6.1 completed the
Cloudflare Turnstile flow. The actor uses that browser only to establish the session and
discover the dynamic endpoint; extraction is then a direct JSON request.

## Selected API

- Endpoint: `https://www.jumia.com.ng/fragment/sp/products/provider/mirakl/catalog-page-types/<type>/`
- Method: `GET`
- Auth: No account authentication; a Cloudflare browser session may be required
- Required response header: `Accept: application/json`
- Dynamic parameters: `fq`, `page`, `numberItems`, `viewType`, `returnOverride`, `lang`
- Batch behavior: `numberItems` returns up to 36 unique products; higher `page` values
  repeat the same sponsored inventory and must not be used to manufacture extra results
- HTTP/2: Browser context default; no proxy-specific HTTP/2 override was required
- Proxy: Existing actor proxy input is preserved; session IDs rotate per actor run
- Usable marker: HTTP 200, JSON content type, `products` array, and
  `view: "SponsoredCatalogProducts"`

Product fields include `sku`, `name`, `displayName`, `brand`, `sellerId`,
`isShopExpress`, `categories`, `prices`, `tags`, `rating`, `image`, `imageAlt`,
`sponsored`, `isSponsored`, `lastModified`, `tracking`, `url`, `badges`, `isBuyable`,
`shopExpress`, `relatedProds`, `simples`, `selectedVariation`, `variationSelection`,
`wishlist`, and `loginUrl`. Nested pricing, rating, tracking, campaign, variation, and
related-product data add substantially more usable fields than the former HTML output.

## API Score

| Factor | Points |
|---|---:|
| Returns JSON directly | 30 |
| More than 15 unique product fields | 25 |
| No account authentication | 20 |
| Pagination support | 0 |
| Matches and extends existing fields | 10 |
| **Total** | **85** |

The 85-point score exceeds the required minimum of 50. The actor therefore stays API-based
after a one-time browser bootstrap and never parses product cards or HTML markup.
