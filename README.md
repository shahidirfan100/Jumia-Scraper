# Jumia Nigeria Products Scraper

Extract comprehensive product data from Jumia Nigeria, Africa's largest e-commerce platform. Collect prices, ratings, reviews, discounts, brands, and images at scale. Perfect for market research, price monitoring, and competitive analysis.

## Features

- **Complete Product Data** — Extract names, prices, ratings, reviews, and images
- **Price Tracking** — Get current prices, old prices, and discount percentages
- **Brand Information** — Identify product brands and official store badges
- **Automatic Pagination** — Seamlessly collect data across multiple pages
- **Flexible Input** — Scrape any Jumia Nigeria category or search results
- **Fast & Reliable** — Automated data collection with built-in error handling

## Use Cases

### Price Monitoring
Track product prices over time for competitive intelligence. Set up scheduled runs to monitor pricing trends and identify the best times to make purchasing decisions.

### Market Research
Analyze pricing strategies and product offerings across categories. Understand market positioning, popular price points, and brand presence on Nigeria's largest e-commerce platform.

### E-commerce Analytics
Study customer ratings and review patterns to understand product quality signals. Identify top-rated products and analyze customer feedback trends.

### Competitor Analysis
Compare prices, discounts, and product offerings across different sellers. Monitor how competitors position their products and pricing strategies.

### Inventory Intelligence
Track product availability and catalog changes. Monitor new product launches and identify trending items in specific categories.

---

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_url` | String | Yes | — | Jumia Nigeria category or search URL |
| `results_wanted` | Integer | No | `20` | Maximum number of products to extract |
| `proxyConfiguration` | Object | No | Residential | Proxy settings for reliable scraping |

---

## Output Data

Each item in the dataset contains:

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Product name and title |
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

### Basic Category Extraction

Extract products from a category page:

```json
{
    "start_url": "https://www.jumia.com.ng/android-phones/",
    "results_wanted": 50
}
```

### Large-Scale Collection

Collect extensive product data for analysis:

```json
{
    "start_url": "https://www.jumia.com.ng/laptops/",
    "results_wanted": 500
}
```

### Search Results Extraction

Extract products from search queries:

```json
{
    "start_url": "https://www.jumia.com.ng/catalog/?q=samsung+galaxy",
    "results_wanted": 100
}
```

### With Proxy Configuration

For reliable results with residential proxies:

```json
{
    "start_url": "https://www.jumia.com.ng/electronics/",
    "results_wanted": 200,
    "proxyConfiguration": {
        "useApifyProxy": true,
        "apifyProxyGroups": ["RESIDENTIAL"]
    }
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

### Choose Working URLs
- Verify URLs are accessible before running
- Start with popular category pages
- Test with different product categories

### Optimize Collection Size
- Start small for testing (20-50 products)
- Increase gradually for production runs
- Balance collection time vs. data quantity

### Use Appropriate Proxies
- Residential proxies recommended for best results
- Enable proxy rotation for large collections
- Monitor success rates and adjust as needed

---

## Integrations

Connect your data with:

- **Google Sheets** — Export directly to spreadsheets for analysis
- **Airtable** — Build searchable product databases
- **Slack** — Get notifications when runs complete
- **Webhooks** — Send data to custom endpoints
- **Make** — Create automated data workflows
- **Zapier** — Trigger actions based on scraped data

### Export Formats

Download data in multiple formats:

- **JSON** — For developers and API integrations
- **CSV** — For spreadsheet analysis and reporting
- **Excel** — For business intelligence tools
- **XML** — For enterprise system integrations

---

## Frequently Asked Questions

### What regions does this scraper support?
This scraper is optimized for Jumia Nigeria (jumia.com.ng). Other Jumia regions may require URL adjustments to match their domain structure.

### How many products can I collect?
You can collect all available products in a category. The practical limit depends on the category size and your desired results count.

### Can I scrape multiple categories at once?
Run multiple instances with different category URLs to collect data from various product categories simultaneously.

### Why are some fields null?
Some fields may be empty if the source doesn't provide that information. Not all products have ratings, reviews, or discounts.

### How often can I run this scraper?
You can run it as often as needed. Consider using scheduled runs for regular price monitoring and trend analysis.

### Can I scrape product detail pages?
Currently, the scraper extracts data from listing pages. Use the product URLs in the output to access detailed specifications.

---

## Support

For issues or feature requests, contact support through the Apify Console.

### Resources

- [Apify Documentation](https://docs.apify.com/)
- [API Reference](https://docs.apify.com/api/v2)
- [Scheduling Runs](https://docs.apify.com/schedules)

---

## Legal Notice

This actor is designed for legitimate data collection purposes. Users are responsible for ensuring compliance with Jumia's Terms of Service and applicable laws. Use data responsibly and respect rate limits.