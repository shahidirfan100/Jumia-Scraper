# Jumia Nigeria Products Scraper

Extract comprehensive product data from Jumia Nigeria, Africa's largest e-commerce platform. Collect prices, ratings, reviews, discounts, brands, seller information, and images at scale. Perfect for market research, price monitoring, and competitive analysis.

## Features

- **Richer Product Data** — Extract 24+ fields including seller info, campaign badges, and stock status
- **Price Tracking** — Get current prices, old prices, and discount percentages
- **Seller & Brand Intelligence** — Identify sellers, brands, and official store badges
- **Campaign Detection** — Capture promotional campaigns and discount messages
- **Automatic Pagination** — Seamlessly collect data across multiple pages
- **Flexible Input** — Scrape any Jumia Nigeria category or search results
- **Anti-Block Technology** — Built-in stealth measures for reliable data collection

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
| `seller_id` | String | Seller/merchant identifier |
| `price` | Number | Current price in NGN |
| `price_formatted` | String | Formatted price with currency symbol |
| `old_price` | Number | Original price before discount |
| `old_price_formatted` | String | Formatted old price |
| `discount` | Number | Discount percentage |
| `discount_formatted` | String | Formatted discount with % symbol |
| `rating` | Number | Product rating (1-5 scale) |
| `reviews_count` | Number | Total number of reviews |
| `url` | String | Direct link to product page |
| `image_url` | String | Product image URL |
| `is_official_store` | Boolean | Whether sold by official store |
| `has_express_shipping` | Boolean | Express shipping availability |
| `is_sponsored` | Boolean | Whether product is a sponsored listing |
| `is_buyable` | Boolean | Whether product is available for purchase |
| `selected_variation` | String | Selected product variation ID |
| `category_key` | String | Category identifier |
| `brand_key` | String | Normalized brand key |
| `campaign_name` | String | Active campaign/promotion name |
| `campaign_tag` | String | Campaign type tag |
| `last_modified` | String | Last modification timestamp |

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
    "name": "Samsung Galaxy A06 6.7\" 4GB RAM/64GB ROM Android 14 - Black",
    "sku": "SA948MP7KVUNENAFAMZ",
    "brand": "Samsung",
    "seller_id": "339709",
    "price": 118960,
    "price_formatted": "₦ 118,960",
    "old_price": 127518,
    "old_price_formatted": "₦ 127,518",
    "discount": 7,
    "discount_formatted": "7%",
    "rating": 4.1,
    "reviews_count": 404,
    "url": "https://www.jumia.com.ng/samsung-galaxy-a06-6.7-4gb-ram64gb-rom-android-14-black-401614385.html",
    "image_url": "https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/58/3416104/1.jpg?8232",
    "is_official_store": true,
    "has_express_shipping": true,
    "is_sponsored": false,
    "is_buyable": true,
    "selected_variation": "SA948MP7KVUNENAFAMZ-701044225",
    "category_key": "android-phones",
    "brand_key": "samsung",
    "last_modified": "1778588310"
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