import { Actor } from 'apify';
import log from '@apify/log';
import { CheerioCrawler, Dataset } from 'crawlee';
import { HeaderGenerator } from 'header-generator';

const BASE_URL = 'https://www.jumia.com.ng';
const DEFAULT_RESULTS_WANTED = 20;
const PRODUCTS_PER_PAGE_ESTIMATE = 40;

const toAbsoluteUrl = (href, base = BASE_URL) => {
    if (!href) return null;
    try {
        const url = new URL(href, base);
        url.hash = '';
        return url.href;
    } catch {
        return null;
    }
};

const toNumber = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    if (!cleaned) return null;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
};

const toInteger = (value) => {
    const num = toNumber(value);
    return num === null ? null : Math.trunc(num);
};

const toPercent = (value) => {
    if (value === null || value === undefined) return null;
    const match = String(value).match(/-?\d+(?:\.\d+)?/);
    return match ? Number.parseFloat(match[0]) : null;
};

const cleanString = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text : null;
};

const compactRecord = (record) => {
    return Object.fromEntries(
        Object.entries(record).filter(([, value]) => {
            if (value === null || value === undefined) return false;
            if (typeof value === 'string' && value.trim() === '') return false;
            if (Array.isArray(value) && value.length === 0) return false;
            return true;
        }),
    );
};

const extractAssignedJsonObject = (source, marker) => {
    const markerIndex = source.indexOf(marker);
    if (markerIndex === -1) return null;

    const assignIndex = source.indexOf('=', markerIndex);
    if (assignIndex === -1) return null;

    const startIndex = source.indexOf('{', assignIndex);
    if (startIndex === -1) return null;

    let depth = 0;
    let inString = false;
    let quote = '';
    let escaped = false;

    for (let i = startIndex; i < source.length; i++) {
        const ch = source[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === quote) {
                inString = false;
            }
            continue;
        }

        if (ch === '"' || ch === '\'') {
            inString = true;
            quote = ch;
            continue;
        }

        if (ch === '{') depth++;
        if (ch === '}') depth--;

        if (depth === 0) {
            return source.slice(startIndex, i + 1);
        }
    }

    return null;
};

const getStoreProducts = (html, $) => {
    const scriptSources = [];

    if ($) {
        $('script').each((_, el) => {
            const scriptText = $(el).html() || '';
            if (scriptText.includes('__STORE__')) scriptSources.push(scriptText);
        });
    }

    if (scriptSources.length === 0 && html.includes('__STORE__')) {
        scriptSources.push(html);
    }

    for (const source of scriptSources) {
        for (const marker of ['window.__STORE__', '__STORE__']) {
            const jsonText = extractAssignedJsonObject(source, marker);
            if (!jsonText) continue;

            try {
                const store = JSON.parse(jsonText);
                if (Array.isArray(store?.products)) return store.products;
            } catch (error) {
                log.debug(`Failed parsing __STORE__ JSON: ${error.message}`);
            }
        }
    }

    return [];
};

const mapStoreProduct = (product) => {
    const isOfficialStore = product?.badges?.main?.identifier === 'JMALL'
        || /official store/i.test(String(product?.badges?.main?.name || ''));

    const record = {
        name: cleanString(product?.displayName || product?.name),
        sku: cleanString(product?.sku),
        brand: cleanString(product?.brand),
        seller_id: cleanString(product?.sellerId),
        price: toNumber(product?.prices?.rawPrice ?? product?.prices?.price ?? product?.price),
        price_formatted: cleanString(product?.prices?.price),
        old_price: toNumber(product?.prices?.oldPrice),
        old_price_formatted: cleanString(product?.prices?.oldPrice),
        discount: toPercent(product?.prices?.discount),
        discount_formatted: cleanString(product?.prices?.discount),
        rating: toNumber(product?.rating?.average),
        reviews_count: toInteger(product?.rating?.totalRatings),
        url: toAbsoluteUrl(product?.url),
        image_url: cleanString(product?.image),
        is_official_store: isOfficialStore,
        has_express_shipping: Boolean(product?.isShopExpress || product?.shopExpress),
        is_sponsored: Boolean(product?.isSponsored),
        is_buyable: typeof product?.isBuyable === 'boolean'
            ? product.isBuyable
            : (typeof product?.simples?.[0]?.isBuyable === 'boolean' ? product.simples[0].isBuyable : null),
        selected_variation: cleanString(product?.selectedVariation),
        category_key: cleanString(product?.tracking?.categoryKey),
        brand_key: cleanString(product?.tracking?.brandKey),
        campaign_name: cleanString(product?.badges?.campaign?.name),
        campaign_tag: cleanString(product?.badges?.campaign?.identifier),
        discount_message: cleanString(product?.discounts?.cpr?.name),
        last_modified: cleanString(product?.lastModified),
    };

    const cleaned = compactRecord(record);
    if (!cleaned.name || (!cleaned.sku && !cleaned.url)) return null;
    return cleaned;
};

const extractProductsFromHtmlFallback = ($) => {
    const products = [];

    $('article.prd').each((_, el) => {
        const $el = $(el);
        const $link = $el.find('a.core');

        const priceText = cleanString($el.find('div.prc').text());
        const oldPriceText = cleanString($el.find('div.old').text());
        const discountText = cleanString($el.find('div.bdg._dsct').text());
        const ratingText = cleanString($el.find('div.stars').text());
        const reviewsText = cleanString($el.find('div.rev').text());

        const record = compactRecord({
            name: cleanString($link.attr('data-ga4-item_name')) || cleanString($el.find('h3.name').text()),
            sku: cleanString($link.attr('data-ga4-item_id')),
            brand: cleanString($link.attr('data-ga4-item_brand')),
            price: toNumber($link.attr('data-ga4-price') || priceText),
            price_formatted: priceText,
            old_price: toNumber(oldPriceText),
            old_price_formatted: oldPriceText,
            discount: toPercent(discountText),
            discount_formatted: discountText,
            rating: toNumber(ratingText),
            reviews_count: toInteger(reviewsText),
            url: toAbsoluteUrl($link.attr('href')),
            image_url: cleanString($el.find('img.img').attr('data-src') || $el.find('img.img').attr('src')),
            is_official_store: $el.find('div.bdg._mall').length > 0,
            has_express_shipping: $el.find('svg.ic.xprss').length > 0,
        });

        if (record.name && (record.sku || record.url)) products.push(record);
    });

    return products;
};

const dedupeKey = (record) => {
    if (record.sku) return `sku:${record.sku.toLowerCase()}`;
    if (record.url) return `url:${record.url.toLowerCase()}`;
    return `hash:${JSON.stringify(record)}`;
};

await Actor.init();

async function main() {
    const input = (await Actor.getInput()) || {};
    const { start_url, results_wanted: resultsWantedRaw = DEFAULT_RESULTS_WANTED, proxyConfiguration } = input;

    if (!start_url) {
        throw new Error('Missing required input: start_url.');
    }

    const resultsWanted = Number.isFinite(+resultsWantedRaw)
        ? Math.max(1, +resultsWantedRaw)
        : DEFAULT_RESULTS_WANTED;
    const maxPages = Math.ceil(resultsWanted / PRODUCTS_PER_PAGE_ESTIMATE) + 2;

    log.info(`Starting scraper | URL: ${start_url} | Target: ${resultsWanted} products`);

    const headerGenerator = new HeaderGenerator({
        browsers: [
            { name: 'chrome', minVersion: 120, maxVersion: 130 },
            { name: 'firefox', minVersion: 115, maxVersion: 125 },
        ],
        devices: ['desktop'],
        operatingSystems: ['windows', 'macos'],
        locales: ['en-US', 'en'],
    });

    const proxyConf = proxyConfiguration
        ? await Actor.createProxyConfiguration({ ...proxyConfiguration })
        : undefined;

    let saved = 0;
    const seen = new Set();

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
                    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'accept-language': 'en-US,en;q=0.9',
                    'accept-encoding': 'gzip, deflate, br',
                    'cache-control': 'max-age=0',
                };

                const delayMs = Math.random() * 2000 + 1000;
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            },
        ],
        async requestHandler({ request, $, body, enqueueLinks }) {
            const pageNo = request.userData?.pageNo || 1;
            const html = body?.toString() || $.html();

            log.info(`Processing page ${pageNo}`);

            const storeProducts = getStoreProducts(html, $);
            let mapped = storeProducts.map(mapStoreProduct).filter(Boolean);
            let source = '__STORE__';

            if (mapped.length === 0) {
                mapped = extractProductsFromHtmlFallback($);
                source = 'HTML fallback';
            }

            log.info(`Extracted ${mapped.length} records from ${source} on page ${pageNo}`);

            const unique = [];
            for (const record of mapped) {
                const key = dedupeKey(record);
                if (seen.has(key)) continue;
                seen.add(key);
                unique.push(record);
            }

            const remaining = resultsWanted - saved;
            const toSave = unique.slice(0, Math.max(0, remaining));

            if (toSave.length > 0) {
                await Dataset.pushData(toSave);
                saved += toSave.length;
                log.info(`Saved ${toSave.length} products (total: ${saved}/${resultsWanted})`);
            }

            if (saved < resultsWanted && pageNo < maxPages) {
                const nextPageNo = pageNo + 1;
                const nextUrl = new URL(start_url);
                nextUrl.searchParams.set('page', String(nextPageNo));

                await enqueueLinks({
                    urls: [nextUrl.href],
                    userData: { pageNo: nextPageNo },
                });
            }

            const browseDelayMs = Math.random() * 2000 + 1000;
            await new Promise((resolve) => setTimeout(resolve, browseDelayMs));
        },
        failedRequestHandler({ request }, error) {
            log.error(`Request failed: ${request.url} - ${error.message}`);
        },
    });

    await crawler.run([{ url: start_url, userData: { pageNo: 1 } }]);
    log.info(`Finished | Total: ${saved} products collected`);
    await Actor.exit();
}

main().catch(async (error) => {
    log.exception(error, 'Actor failed');
    await Actor.fail(error);
    process.exit(1);
});
