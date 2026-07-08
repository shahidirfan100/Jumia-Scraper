import { Actor, log } from 'apify';
import { Dataset } from 'crawlee';
import { chromium } from 'patchright';

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
    return text || null;
};

const compactRecord = (record) => Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
    }),
);

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

const getStoreProducts = (html) => {
    if (!html.includes('__STORE__')) return [];

    for (const marker of ['window.__STORE__', '__STORE__']) {
        const jsonText = extractAssignedJsonObject(html, marker);
        if (!jsonText) continue;

        try {
            const store = JSON.parse(jsonText);
            if (Array.isArray(store?.products)) return store.products;
        } catch {
            // continue
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

const dedupeKey = (record) => {
    if (record.sku) return `sku:${record.sku.toLowerCase()}`;
    if (record.url) return `url:${record.url.toLowerCase()}`;
    return `hash:${JSON.stringify(record)}`;
};

const extractProductsFromHtmlContent = ($) => {
    if (!$) return [];
    const products = [];

    $('article.prd').each((_, el) => {
        const $el = $(el);
        const $link = $el.find('a.core');

        const record = compactRecord({
            name: cleanString($link.attr('data-ga4-item_name')) || cleanString($el.find('h3.name').text()),
            sku: cleanString($link.attr('data-ga4-item_id')),
            brand: cleanString($link.attr('data-ga4-item_brand')),
            price: toNumber($link.attr('data-ga4-price') || $el.find('div.prc').text()),
            price_formatted: cleanString($el.find('div.prc').text()),
            old_price: toNumber($el.find('div.old').text()),
            old_price_formatted: cleanString($el.find('div.old').text()),
            discount: toPercent($el.find('div.bdg._dsct').text()),
            discount_formatted: cleanString($el.find('div.bdg._dsct').text()),
            rating: toNumber($el.find('div.stars').text()),
            reviews_count: toInteger($el.find('div.rev').text()),
            url: toAbsoluteUrl($link.attr('href')),
            image_url: cleanString($el.find('img.img').attr('data-src') || $el.find('img.img').attr('src')),
            is_official_store: $el.find('div.bdg._mall').length > 0,
            has_express_shipping: $el.find('svg.ic.xprss').length > 0,
        });

        if (record.name && (record.sku || record.url)) products.push(record);
    });

    return products;
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

    log.info(`Starting Patchright Chrome | URL: ${start_url} | Target: ${resultsWanted} products`);

    const isApifyCloud = Actor.isAtHome();
    const shouldUseApifyProxy = Boolean(proxyConfiguration?.useApifyProxy);
    const hasCustomProxyUrls = Array.isArray(proxyConfiguration?.proxyUrls) && proxyConfiguration.proxyUrls.length > 0;

    let proxyConf;
    if (proxyConfiguration && hasCustomProxyUrls) {
        proxyConf = await Actor.createProxyConfiguration({ ...proxyConfiguration });
    } else if (proxyConfiguration && shouldUseApifyProxy && isApifyCloud) {
        proxyConf = await Actor.createProxyConfiguration({ ...proxyConfiguration });
    } else if (shouldUseApifyProxy && !isApifyCloud) {
        log.info('Local run: ignoring Apify Proxy setting, running without proxy.');
    }

    let saved = 0;
    const seen = new Set();

    let browserProxyUrl;
    try {
        browserProxyUrl = proxyConf ? await proxyConf.newUrl() : undefined;
    } catch (err) {
        log.warning(`Failed to get proxy URL: ${err.message}, running without proxy`);
    }

    let proxyArg;
    if (browserProxyUrl) {
        try {
            const parsed = new URL(browserProxyUrl);
            proxyArg = {
                server: `${parsed.protocol}//${parsed.host}`,
                username: decodeURIComponent(parsed.username),
                password: decodeURIComponent(parsed.password),
            };
        } catch {
            proxyArg = { server: browserProxyUrl };
        }
    }

    const userDataDir = process.env.APIFY_LOCAL_STORAGE_DIR
        ? `${process.env.APIFY_LOCAL_STORAGE_DIR}/chrome-data`
        : './chrome-data';

    const browserContext = await chromium.launchPersistentContext(userDataDir, {
        channel: 'chrome',
        headless: false,
        noViewport: true,
        proxy: proxyArg,
    });

    try {
        const page = await browserContext.newPage();

        let currentUrl = start_url;
        let pageNo = 1;

        while (saved < resultsWanted && pageNo <= maxPages) {
            log.info(`Loading page ${pageNo}: ${currentUrl}`);

            try {
                await page.goto(currentUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 120000,
                });
            } catch (err) {
                log.warning(`Navigation issue on page ${pageNo}: ${err.message}`);
            }

            await page.waitForTimeout(5000);

            let title = await page.title();
            log.info(`Page ${pageNo} title="${title}"`);

            let attempts = 0;
            while (title.includes('Just a moment') || title.includes('challenge') || title.includes('Attention') || title.includes('Verify')) {
                attempts++;
                if (attempts > 30) {
                    log.warning(`Challenge not resolved after 60s on page ${pageNo}`);
                    break;
                }
                await page.waitForTimeout(2000);
                title = await page.title();
            }

            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(2000);

            const html = await page.content();
            log.info(`Page ${pageNo} HTML length: ${html.length}`);

            let mapped = [];
            let source = 'none';

            const storeProducts = getStoreProducts(html);
            if (storeProducts.length > 0) {
                mapped = storeProducts.map(mapStoreProduct).filter(Boolean);
                source = `__STORE__ (${storeProducts.length} raw)`;
            }

            if (mapped.length === 0) {
                const cheerio = await import('cheerio');
                const $ = cheerio.load(html);
                mapped = extractProductsFromHtmlContent($);
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
                pageNo++;
                const nextUrlObj = new URL(currentUrl);
                nextUrlObj.searchParams.set('page', String(pageNo));
                currentUrl = nextUrlObj.href;
            } else {
                break;
            }
        }
    } finally {
        await browserContext.close();
    }

    log.info(`Finished | Total: ${saved} products collected`);
    await Actor.exit();
}

main().catch(async (error) => {
    log.exception(error, 'Actor failed');
    await Actor.fail(error);
    process.exit(1);
});
