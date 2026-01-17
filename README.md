# Jumia Nigeria Products Scraper

Extract product data from Jumia Nigeria, Africa's largest e-commerce platform. Get comprehensive product information including prices, ratings, reviews, discounts, and more.

---

## Features

- **Complete Product Data** - Extract names, prices, ratings, reviews, and images
- **Price Tracking** - Get current prices, old prices, and discount percentages
- **Brand Information** - Identify product brands and official store badges
- **Automatic Pagination** - Seamlessly scrape across multiple pages
- **Flexible Input** - Scrape any Jumia Nigeria category or search results
- **Fast & Efficient** - Lightweight HTTP-based scraping, no browser overhead

---

## Use Cases

- **Price Monitoring** - Track product prices over time for competitive analysis
- **Market Research** - Analyze pricing trends across product categories
- **E-commerce Analytics** - Study ratings and review patterns
- **Inventory Tracking** - Monitor product availability and pricing changes
- **Competitor Analysis** - Compare prices across different sellers

---

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_url` | String | Yes | - | Jumia Nigeria category or search URL |
| `results_wanted` | Integer | No | 20 | Maximum number of products to extract |
| `proxyConfiguration` | Object | No | Residential | Proxy settings for reliable scraping |

---

## Output Data

Each product includes the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Product name/title |
| `sku` | String | Unique product identifier |
| `brand` | String | Product brand name |
| `price` | Number | Current price in NGN |
| `price_formatted` | String | Formatted price with currency symbol |
| `old_price` | Number | Original price before discount |
| `old_price_formatted` | String | Formatted old price |
| `discount` | Number | Discount percentage |
| `rating` | Number | Product rating (1-5 scale) |
| `reviews_count` | Number | Total number of reviews |
| `url` | String | Direct link to product page |
| `image_url` | String | Product image URL |
| `is_official_store` | Boolean | Whether sold by official store |
| `has_express_shipping` | Boolean | Express shipping availability |

---

## Usage Examples

### Scrape Android Phones

```json
{
  "start_url": "https://www.jumia.com.ng/android-phones/",
  "results_wanted": 50
}
```

### Scrape Laptops

```json
{
  "start_url": "https://www.jumia.com.ng/laptops/",
  "results_wanted": 100
}
```

### Scrape Search Results

```json
{
  "start_url": "https://www.jumia.com.ng/catalog/?q=samsung+galaxy",
  "results_wanted": 30
}
```

---

## Sample Output

```json
{
  "name": "XIAOMI REDMI A5 - 6.88\" 4GB RAM/128GB ROM -- BLACK",
  "sku": "XI363MP6WUM8WNAFAMZ",
  "brand": "XIAOMI",
  "price": 124926,
  "price_formatted": "₦ 124,926",
  "old_price": 131172,
  "old_price_formatted": "₦ 131,172",
  "discount": 5,
  "rating": 4.1,
  "reviews_count": 1678,
  "url": "https://www.jumia.com.ng/xiaomi-redmi-a5-408237971.html",
  "image_url": "https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/17/9732804/1.jpg",
  "is_official_store": true,
  "has_express_shipping": false
}
```

---

## Tips for Best Results

1. **Use Category URLs** - Category pages provide the most structured data
2. **Start Small** - Test with 20-50 products before scaling up
3. **Residential Proxies** - Recommended for reliable, uninterrupted scraping
4. **Respect Rate Limits** - The scraper includes built-in delays for stability

---

## Integrations

Integrate Jumia product data with your existing tools:

- **Google Sheets** - Export directly to spreadsheets
- **Zapier** - Automate workflows with scraped data
- **Webhooks** - Send data to your own endpoints
- **APIs** - Access data programmatically via Apify API

---

## Frequently Asked Questions

**Q: What regions does this scraper support?**
A: This scraper is optimized for Jumia Nigeria (jumia.com.ng). Other Jumia regions may require URL adjustments.

**Q: How often can I run this scraper?**
A: You can run it as often as needed. Consider using scheduled runs for regular price monitoring.

**Q: Why are some fields null?**
A: Not all products have ratings, reviews, or discounts. The scraper returns null for unavailable data.

**Q: Can I scrape product details pages?**
A: Currently, the scraper extracts data from listing pages. For detailed product specifications, use the product URLs in the output.

---

## Legal Notice

This scraper is designed for legitimate data collection purposes. Users are responsible for ensuring their use complies with Jumia's Terms of Service and applicable laws. Always respect robots.txt and rate limits.

---

## Support

For issues, feature requests, or questions, please open an issue on the actor's GitHub repository or contact support through Apify.