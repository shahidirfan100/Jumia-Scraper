// Jumia Nigeria Products Scraper - JSON Extraction from window.__STORE__
import { Actor, log } from 'apify';
import { CheerioCrawler, Dataset } from 'crawlee';
import { HeaderGenerator } from 'header-generator';

await Actor.init();

async function main() {
    try {
        const input = (await Actor.getInput()) || {};
        const {
            start_url = 'https://www.jumia.com.ng/android-phones/',
            results_wanted: RESULTS_WANTED_RAW = 20,
            proxyConfiguration,
        } = input;

        const RESULTS_WANTED = Number.isFinite(+RESULTS_WANTED_RAW) ? Math.max(1, +RESULTS_WANTED_RAW) : 20;
        const PRODUCTS_PER_PAGE = 40;
        const maxPages = Math.ceil(RESULTS_WANTED / PRODUCTS_PER_PAGE) + 1;

        log.info(`Starting Jumia scraper: ${start_url}, results_wanted: ${RESULTS_WANTED}`);

        // Initialize header generator for stealth
        const headerGenerator = new HeaderGenerator({
            browsers: [
                { name: 'chrome', minVersion: 120, maxVersion: 130 },
                { name: 'firefox', minVersion: 115, maxVersion: 125 }
            ],
            devices: ['desktop'],
            operatingSystems: ['windows', 'macos'],
            locales: ['en-US', 'en'],
        });

        // Proxy configuration
        const proxyConf = proxyConfiguration
            ? await Actor.createProxyConfiguration({ ...proxyConfiguration })
            : undefined;

        let saved = 0;
        const seen = new Set();

        /**
         * Extract products from window.__STORE__ JSON embedded in HTML
         * This is MUCH faster and more reliable than HTML parsing
         */
        function extractProductsFromStore(html) {
            // Method 1: Look for __STORE__ assignment
            const storePatterns = [
                /window\.__STORE__\s*=\s*({.+?})\s*;?\s*<\/script>/s,
                /__STORE__\s*=\s*({.+?})\s*;?\s*<\/script>/s,
            ];

            for (const pattern of storePatterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    try {
                        const store = JSON.parse(match[1]);
                        if (store.products && Array.isArray(store.products)) {
                            log.info(`Found ${store.products.length} products in __STORE__`);
                            return store.products;
                        }
                    } catch (e) {
                        log.debug(`Failed to parse __STORE__: ${e.message}`);
                    }
                }
            }

            return null;
        }

        /**
         * Extract products from data-ga4 attributes (fallback)
         */
        function extractProductsFromHtml($) {
            const products = [];

            $('article.prd').each((_, el) => {
                const $el = $(el);
                const $link = $el.find('a.core');

                const sku = $link.attr('data-ga4-item_id') || null;
                const name = $link.attr('data-ga4-item_name') || $el.find('h3.name').text().trim() || null;
                const brand = $link.attr('data-ga4-item_brand') || null;

                // Price
                const ga4Price = $link.attr('data-ga4-price');
                const priceText = $el.find('div.prc').text().trim();
                const price = ga4Price ? parseFloat(ga4Price) : parsePrice(priceText);

                // Old price and discount
                const oldPriceText = $el.find('div.old').text().trim();
                const old_price = parsePrice(oldPriceText);
                const discountText = $el.find('div.bdg._dsct').text().trim();
                const discount = parseDiscount(discountText);

                // Rating and reviews
                const ratingText = $el.find('div.stars').text().trim();
                const rating = parseRating(ratingText);
                const reviewsText = $el.find('div.rev').text().trim();
                const reviews_count = parseReviewsCount(reviewsText);

                // URLs
                const href = $link.attr('href');
                const url = href ? toAbs(href) : null;

                // Image
                const $img = $el.find('img.img');
                const image_url = $img.attr('data-src') || $img.attr('src') || null;

                // Badges
                const is_official_store = $el.find('div.bdg._mall').length > 0;
                const has_express_shipping = $el.find('svg.ic.xprss').length > 0;

                if (name && url) {
                    products.push({
                        name, sku, brand, price,
                        price_formatted: priceText || null,
                        old_price,
                        old_price_formatted: oldPriceText || null,
                        discount, rating, reviews_count,
                        url, image_url,
                        is_official_store, has_express_shipping,
                    });
                }
            });

            return products;
        }

        // Helper functions
        const toAbs = (href, base = 'https://www.jumia.com.ng') => {
            try { return new URL(href, base).href; } catch { return null; }
        };

        const parsePrice = (text) => {
            if (!text) return null;
            const cleaned = text.replace(/[₦,\s]/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? null : num;
        };

        const parseRating = (text) => {
            if (!text) return null;
            const match = text.match(/([\d.]+)\s*out\s*of\s*5/i);
            return match ? parseFloat(match[1]) : null;
        };

        const parseReviewsCount = (text) => {
            if (!text) return null;
            const match = text.match(/\((\d+)\)/);
            return match ? parseInt(match[1], 10) : null;
        };

        const parseDiscount = (text) => {
            if (!text) return null;
            const match = text.match(/(\d+)%/);
            return match ? parseInt(match[1], 10) : null;
        };

        /**
         * Transform __STORE__ product format to our output schema
         */
        function transformStoreProduct(p) {
            return {
                name: p.displayName || p.name || null,
                sku: p.sku || null,
                brand: p.brand || null,
                price: p.prices?.price || p.price || null,
                price_formatted: p.prices?.price ? `₦ ${p.prices.price.toLocaleString()}` : null,
                old_price: p.prices?.oldPrice || null,
                old_price_formatted: p.prices?.oldPrice ? `₦ ${p.prices.oldPrice.toLocaleString()}` : null,
                discount: p.prices?.discount || null,
                rating: p.rating?.average || null,
                reviews_count: p.rating?.totalRatings || null,
                url: p.url ? toAbs(p.url) : null,
                image_url: p.image || null,
                is_official_store: p.shopExpress || p.isOfficial || false,
                has_express_shipping: p.express || false,
            };
        }

        const crawler = new CheerioCrawler({
            proxyConfiguration: proxyConf,
            maxRequestRetries: 5,
            useSessionPool: true,
            sessionPoolOptions: {
                maxPoolSize: 50,
                sessionOptions: {
                    maxUsageCount: 10,
                    maxErrorScore: 3,
                },
            },
            maxConcurrency: 3,
            requestHandlerTimeoutSecs: 60,

            preNavigationHooks: [
                async ({ request }) => {
                    const headers = headerGenerator.getHeaders({
                        operatingSystems: ['windows'],
                        browsers: ['chrome'],
                        devices: ['desktop'],
                        locales: ['en-US'],
                    });

                    request.headers = {
                        ...headers,
                        'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                        'sec-ch-ua-platform-version': '"15.0.0"',
                        'sec-fetch-dest': 'document',
                        'sec-fetch-mode': 'navigate',
                        'sec-fetch-site': 'none',
                        'sec-fetch-user': '?1',
                        'upgrade-insecure-requests': '1',
                        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'accept-language': 'en-US,en;q=0.9',
                        'accept-encoding': 'gzip, deflate, br',
                        'cache-control': 'max-age=0',
                    };

                    // Human-like delay
                    const delay = Math.random() * 2000 + 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                },
            ],

            async requestHandler({ request, $, body, enqueueLinks }) {
                const pageNo = request.userData?.pageNo || 1;
                const html = body?.toString() || $.html();

                log.info(`Processing page ${pageNo}: ${request.url}`);

                let products = [];

                // PRIORITY 1: Try __STORE__ JSON extraction (fastest, most reliable)
                const storeProducts = extractProductsFromStore(html);
                if (storeProducts && storeProducts.length > 0) {
                    log.info(`✅ Extracted ${storeProducts.length} products from __STORE__ JSON`);
                    products = storeProducts.map(transformStoreProduct);
                } else {
                    // PRIORITY 2: Fallback to HTML parsing
                    log.info('⚠️ __STORE__ not found, falling back to HTML parsing');
                    products = extractProductsFromHtml($);
                    log.info(`Extracted ${products.length} products from HTML`);
                }

                // Deduplicate
                const uniqueProducts = products.filter(p => {
                    const key = p.sku || p.url;
                    if (!key || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                if (uniqueProducts.length > 0) {
                    const remaining = RESULTS_WANTED - saved;
                    const toSave = uniqueProducts.slice(0, remaining);
                    await Dataset.pushData(toSave);
                    saved += toSave.length;
                    log.info(`Saved ${toSave.length} products (total: ${saved}/${RESULTS_WANTED})`);
                }

                // Enqueue next page if needed
                if (saved < RESULTS_WANTED && pageNo < maxPages) {
                    const nextPageNo = pageNo + 1;
                    const baseUrl = new URL(start_url);
                    baseUrl.searchParams.set('page', nextPageNo.toString());
                    const nextUrl = baseUrl.href;

                    log.info(`Enqueueing page ${nextPageNo}: ${nextUrl}`);
                    await enqueueLinks({
                        urls: [nextUrl],
                        userData: { pageNo: nextPageNo },
                    });
                }

                // Human-like delay
                const browseTime = Math.random() * 2000 + 1000;
                await new Promise(resolve => setTimeout(resolve, browseTime));
            },

            failedRequestHandler({ request }, error) {
                log.error(`Request failed: ${request.url} - ${error.message}`);
            },
        });

        await crawler.run([{ url: start_url, userData: { pageNo: 1 } }]);
        log.info(`✅ Finished. Saved ${saved} products.`);

    } finally {
        await Actor.exit();
    }
}

main().catch(err => { console.error(err); process.exit(1); });
