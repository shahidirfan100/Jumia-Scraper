## API Discovery

Target domain: `www.jumia.com.ng`
Target path tested: `/android-phones/`

### API Discovery Results

**All HTTP-based API approaches blocked by Cloudflare (403).**
Tested: `gotScraping` with desktop, iOS Safari, Android app headers, all returning Cloudflare JS challenge.

**URLScan.io** scans also return 403 (Cloudflare blocks scanning).

**Final approach: Patchright Chrome (non-headless) with `window.__STORE__.products` extraction.**

### Browser Stealth Evaluation

| Approach | Result |
|----------|--------|
| `gotScraping` (any headers) | 403 Cloudflare |
| Playwright Firefox (headless) | 403 Cloudflare |
| Playwright Firefox (non-headless) | 403 Cloudflare |
| Patchright Chrome (headless) | 403 Cloudflare |
| **Patchright Chrome (non-headless, `channel: 'chrome'`)** | **✅ Bypassed Cloudflare** |

### Existing Actor Audit
Current output fields (after rewrite - 24 fields):

- `name`, `sku`, `brand`, `seller_id`
- `price`, `price_formatted`, `old_price`, `old_price_formatted`
- `discount`, `discount_formatted`, `rating`, `reviews_count`
- `url`, `image_url`
- `is_official_store`, `has_express_shipping`, `is_sponsored`, `is_buyable`
- `selected_variation`, `category_key`, `brand_key`
- `campaign_name`, `campaign_tag`, `last_modified`

Missing high-value fields (from `__STORE__` but not in current data):

- `discount_message` (`product.discounts.cpr.name`) - not present in scraped products

### Selected Extraction Method

- **Method**: Patchright Chrome browser automation (non-headless)
- **Docker image**: `apify/actor-node-playwright-chrome:22`
- **Data source**: `window.__STORE__.products` embedded JSON
- **Fallback**: Cheerio HTML parsing from `article.prd` elements
- **Pagination**: `?page=N` query parameter
- **Fields extracted**: 24 (vs 14 originally)
- **Anti-bot**: Patchright C++ level stealth patches + non-headless Chrome + `channel: 'chrome'` (real Chrome binary)
