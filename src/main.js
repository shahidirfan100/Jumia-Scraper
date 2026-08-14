import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Actor, log } from 'apify';
import extract from 'extract-zip';
import { chromium } from 'patchright';

const BASE_URL = 'https://www.jumia.com.ng';
const DEFAULT_RESULTS_WANTED = 20;
const MAX_API_PRODUCTS = 36;
const PATCHRIGHT_TIMEOUT_MILLIS = 60_000;
const NOPECHA_TIMEOUT_MILLIS = 150_000;
const NOPECHA_VERSION = '0.6.1';
const NOPECHA_URL = `https://github.com/NopeCHALLC/nopecha-extension/releases/download/${NOPECHA_VERSION}/chromium_automation.zip`;
const API_PATH_MARKER = '/fragment/sp/products/provider/';

const cleanString = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
};

const cleanStringArray = (value) => {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(cleanString).filter(Boolean))];
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
    const number = toNumber(value);
    return number === null ? null : Math.trunc(number);
};

const toPercent = (value) => {
    if (value === null || value === undefined) return null;
    const match = String(value).match(/-?\d+(?:\.\d+)?/);
    return match ? Number.parseFloat(match[0]) : null;
};

const toAbsoluteUrl = (href) => {
    if (!href) return null;
    try {
        const url = new URL(href, BASE_URL);
        url.hash = '';
        return url.href;
    } catch {
        return null;
    }
};

const compactRecord = (record) => Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
    }),
);

const mapRelatedProducts = (products) => {
    if (!Array.isArray(products)) return [];
    return products
        .map((product) => compactRecord({
            sku: cleanString(product?.sku),
            name: cleanString(product?.name),
            url: toAbsoluteUrl(product?.url),
            image_url: cleanString(product?.img),
        }))
        .filter((product) => product.sku && product.name);
};

const mapApiProduct = (product) => {
    const variations = Array.isArray(product?.simples) ? product.simples : [];
    const variationSkus = cleanStringArray(variations.map((variation) => variation?.sku));
    const campaign = product?.badges?.campaign;
    const mainBadge = product?.badges?.main;
    const isOfficialStore = mainBadge?.identifier === 'JMALL'
        || /official store/i.test(String(mainBadge?.name || ''));

    const record = compactRecord({
        name: cleanString(product?.displayName || product?.name),
        sku: cleanString(product?.sku),
        brand: cleanString(product?.brand),
        seller_id: cleanString(product?.sellerId),
        categories: cleanStringArray(product?.categories),
        tags: cleanString(product?.tags),
        price: toNumber(product?.prices?.rawPrice ?? product?.prices?.price),
        price_formatted: cleanString(product?.prices?.price),
        price_euro: toNumber(product?.prices?.priceEuro),
        tax_euro: toNumber(product?.prices?.taxEuro),
        old_price: toNumber(product?.prices?.oldPrice),
        old_price_formatted: cleanString(product?.prices?.oldPrice),
        old_price_euro: toNumber(product?.prices?.oldPriceEuro),
        discount: toPercent(product?.prices?.discount),
        discount_formatted: cleanString(product?.prices?.discount),
        discount_euro: toNumber(product?.prices?.discountEuro),
        rating: toNumber(product?.rating?.average),
        reviews_count: toInteger(product?.rating?.totalRatings),
        url: toAbsoluteUrl(product?.url),
        image_url: cleanString(product?.image),
        image_alt: cleanString(product?.imageAlt),
        is_official_store: isOfficialStore,
        has_express_shipping: Boolean(product?.isShopExpress || product?.shopExpress),
        is_sponsored: Boolean(product?.isSponsored),
        is_buyable: typeof product?.isBuyable === 'boolean'
            ? product.isBuyable
            : (typeof variations[0]?.isBuyable === 'boolean' ? variations[0].isBuyable : null),
        is_second_chance: typeof product?.tracking?.isSecondChance === 'boolean'
            ? product.tracking.isSecondChance
            : null,
        selected_variation: cleanString(product?.selectedVariation),
        variation_selection: typeof product?.variationSelection === 'boolean'
            ? product.variationSelection
            : null,
        variations_count: variations.length,
        variation_skus: variationSkus,
        related_products: mapRelatedProducts(product?.relatedProds),
        category_key: cleanString(product?.tracking?.categoryKey),
        brand_key: cleanString(product?.tracking?.brandKey),
        campaign_name: cleanString(campaign?.name),
        campaign_tag: cleanString(campaign?.identifier),
        campaign_url: toAbsoluteUrl(campaign?.url),
        discount_message: cleanString(product?.discounts?.cpr?.name),
        wishlist_added: typeof product?.wishlist?.added === 'boolean' ? product.wishlist.added : null,
        last_modified: cleanString(product?.lastModified),
    });

    if (!record.name || !record.sku || !record.url || record.price === undefined) return null;
    return record;
};

const isChallengeTitle = (title) => /just a moment|challenge|attention|verify/i.test(title);

const getNopechaExtension = async () => {
    const configuredPath = cleanString(process.env.NOPECHA_EXTENSION_PATH);
    if (configuredPath) return path.resolve(configuredPath);

    const extensionRoot = path.join(tmpdir(), `nopecha-chromium-${NOPECHA_VERSION}`);
    const manifestPath = path.join(extensionRoot, 'manifest.json');

    try {
        await readFile(manifestPath, 'utf8');
        return extensionRoot;
    } catch {
        // Download the pinned automation build below.
    }

    const archivePath = path.join(tmpdir(), `nopecha-chromium-${NOPECHA_VERSION}.zip`);
    log.info(`Downloading NopeCHA Chromium automation extension v${NOPECHA_VERSION}`);
    const response = await fetch(NOPECHA_URL);
    if (!response.ok) throw new Error(`NopeCHA download failed with HTTP ${response.status}.`);

    await rm(extensionRoot, { recursive: true, force: true });
    await mkdir(extensionRoot, { recursive: true });
    await writeFile(archivePath, Buffer.from(await response.arrayBuffer()));
    await extract(archivePath, { dir: extensionRoot });
    await rm(archivePath, { force: true });
    await readFile(manifestPath, 'utf8');
    return extensionRoot;
};

const createProxy = async (proxyConfiguration) => {
    if (!proxyConfiguration) return undefined;
    const hasCustomUrls = Array.isArray(proxyConfiguration.proxyUrls)
        && proxyConfiguration.proxyUrls.length > 0;
    if (!hasCustomUrls && proxyConfiguration.useApifyProxy && !Actor.isAtHome()) {
        log.info('Local run: ignoring Apify Proxy setting because Apify Proxy is unavailable locally.');
        return undefined;
    }
    return Actor.createProxyConfiguration(proxyConfiguration);
};

const toBrowserProxy = (proxyUrl) => {
    if (!proxyUrl) return undefined;
    const parsed = new URL(proxyUrl);
    return {
        server: `${parsed.protocol}//${parsed.host}`,
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
    };
};

const waitForCatalog = async (page, timeoutMillis) => {
    const startedAt = Date.now();
    let title = await page.title();
    while (isChallengeTitle(title) && Date.now() - startedAt < timeoutMillis) {
        await page.waitForTimeout(3_000);
        title = await page.title();
    }
    if (isChallengeTitle(title)) {
        throw new Error(`Cloudflare verification did not finish within ${timeoutMillis / 1_000} seconds.`);
    }
    return title;
};

const discoverApiUrl = async (page, capturedRequests) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    for (let attempt = 0; attempt < 20; attempt++) {
        const captured = capturedRequests.find((url) => url.includes(API_PATH_MARKER));
        if (captured) return captured;
        const performanceUrl = await page.evaluate((marker) => performance
            .getEntriesByType('resource')
            .map((entry) => entry.name)
            .find((url) => url.includes(marker)) || null, API_PATH_MARKER);
        if (performanceUrl) return performanceUrl;
        await page.waitForTimeout(500);
    }
    throw new Error('Jumia product API request was not observed after the catalog loaded.');
};

const getActorInput = async () => {
    const storedInput = await Actor.getInput();
    if (storedInput || Actor.isAtHome()) return storedInput || {};

    try {
        return JSON.parse(await readFile(path.resolve('INPUT.json'), 'utf8'));
    } catch (error) {
        log.debug(`Local INPUT.json was not loaded: ${error.message}`);
        return {};
    }
};

const getCachedApiUrl = async (startUrl, numberItems) => {
    const metadataUrl = new URL('./api-targets.json', import.meta.url);
    const targets = JSON.parse(await readFile(metadataUrl, 'utf8'));
    const target = targets[startUrl.pathname];
    if (!target?.pageType || !target?.fq) return null;

    const apiUrl = new URL(
        `/fragment/sp/products/provider/mirakl/catalog-page-types/${target.pageType}/`,
        BASE_URL,
    );
    apiUrl.searchParams.set('fq', JSON.stringify(target.fq));
    apiUrl.searchParams.set('page', '1');
    apiUrl.searchParams.set('numberItems', String(numberItems));
    apiUrl.searchParams.set('viewType', 'grid');
    apiUrl.searchParams.set('returnOverride', startUrl.href);
    apiUrl.searchParams.set('lang', 'en');
    return apiUrl.href;
};

const launchBrowser = (userDataDir, proxy, extensionPath) => {
    const extensionArgs = extensionPath
        ? [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
        : [];

    return chromium.launchPersistentContext(userDataDir, {
        channel: 'chrome',
        headless: false,
        noViewport: true,
        locale: 'en-US',
        proxy,
        args: [
            ...extensionArgs,
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-component-update',
            '--disable-default-apps',
            '--disable-features=OptimizationHints,MediaRouter',
            '--disable-popup-blocking',
            '--disable-sync',
            '--metrics-recording-only',
            '--no-default-browser-check',
            '--no-first-run',
            '--password-store=basic',
            '--use-mock-keychain',
        ],
    });
};

const bootstrapCatalog = async (browserContext, startUrl, timeoutMillis) => {
    const page = browserContext.pages()[0] || await browserContext.newPage();
    const capturedRequests = [];
    page.on('request', (request) => {
        if (request.url().includes(API_PATH_MARKER)) capturedRequests.push(request.url());
    });

    await page.goto(startUrl.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    const title = await waitForCatalog(page, timeoutMillis);
    log.info(`Catalog ready: ${title}`);
    return discoverApiUrl(page, capturedRequests);
};

const waitForApiAccess = async (browserContext, apiUrl, startUrl, timeoutMillis) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMillis) {
        try {
            const response = await browserContext.request.get(apiUrl, {
                headers: { Accept: 'application/json', Referer: startUrl.href },
                timeout: 30_000,
            });
            const contentType = response.headers()['content-type'] || '';
            if (response.ok() && contentType.includes('application/json')) {
                const data = JSON.parse(await response.text());
                if (Array.isArray(data?.products) && data.products.length > 0) return;
            }
        } catch (error) {
            log.debug(`Product API is not ready yet: ${error.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    throw new Error(`Product API did not become available within ${timeoutMillis / 1_000} seconds.`);
};

await Actor.init();

async function main() {
    const input = await getActorInput();
    const {
        start_url,
        results_wanted: resultsWantedRaw = DEFAULT_RESULTS_WANTED,
        proxyConfiguration,
    } = input;
    if (!start_url) throw new Error('Missing required input: start_url.');

    const startUrl = new URL(start_url);
    if (startUrl.hostname !== 'www.jumia.com.ng' && startUrl.hostname !== 'jumia.com.ng') {
        throw new Error('start_url must use the jumia.com.ng domain.');
    }

    const resultsWanted = Number.isFinite(+resultsWantedRaw)
        ? Math.max(1, Math.trunc(+resultsWantedRaw))
        : DEFAULT_RESULTS_WANTED;
    const apiLimit = Math.min(resultsWanted, MAX_API_PRODUCTS);
    const proxy = await createProxy(proxyConfiguration);
    const sessionId = `jumia-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const proxyUrl = proxy ? await proxy.newUrl(sessionId) : undefined;
    const userDataDir = path.join(
        process.env.APIFY_LOCAL_STORAGE_DIR || path.join(tmpdir(), 'jumia-actor-storage'),
        'patchright-profile',
    );

    const browserProxy = toBrowserProxy(proxyUrl);
    const cachedApiUrl = await getCachedApiUrl(startUrl, apiLimit);
    log.info(`Starting Patchright catalog bootstrap | URL: ${startUrl.href} | Target: ${resultsWanted}`);

    let browserContext;
    let discoveredUrl;
    try {
        browserContext = await launchBrowser(userDataDir, browserProxy);
        discoveredUrl = await bootstrapCatalog(browserContext, startUrl, PATCHRIGHT_TIMEOUT_MILLIS);
    } catch (error) {
        log.warning(`Patchright-only bootstrap was challenged: ${error.message}`);
        await browserContext?.close();

        const extensionPath = await getNopechaExtension();
        log.info(`Retrying with NopeCHA v${NOPECHA_VERSION}`);

        if (cachedApiUrl) {
            let lastError;
            for (let attempt = 1; attempt <= 2; attempt++) {
                const isolatedProfile = `${userDataDir}-nopecha-${Date.now()}-${attempt}`;
                browserContext = await launchBrowser(isolatedProfile, browserProxy, extensionPath);
                const page = browserContext.pages()[0] || await browserContext.newPage();
                await page.goto(startUrl.href, {
                    waitUntil: 'domcontentloaded',
                    timeout: 120_000,
                }).catch((navigationError) => {
                    log.debug(`NopeCHA navigation issue: ${navigationError.message}`);
                });

                try {
                    await waitForApiAccess(
                        browserContext,
                        cachedApiUrl,
                        startUrl,
                        NOPECHA_TIMEOUT_MILLIS / 2,
                    );
                    discoveredUrl = cachedApiUrl;
                    break;
                } catch (apiError) {
                    lastError = apiError;
                    await browserContext.close();
                    browserContext = undefined;
                    log.warning(`NopeCHA attempt ${attempt} did not unlock the API.`);
                }
            }
            if (!discoveredUrl) throw lastError;
        } else {
            browserContext = await launchBrowser(userDataDir, browserProxy, extensionPath);
            discoveredUrl = await bootstrapCatalog(browserContext, startUrl, NOPECHA_TIMEOUT_MILLIS);
        }
    }

    try {
        const apiUrl = new URL(discoveredUrl);
        apiUrl.searchParams.set('numberItems', String(apiLimit));
        apiUrl.searchParams.set('returnOverride', startUrl.href);

        log.info(`Fetching ${apiLimit} products from Jumia's JSON service`);
        const response = await browserContext.request.get(apiUrl.href, {
            headers: { Accept: 'application/json', Referer: startUrl.href },
            timeout: 60_000,
        });
        const contentType = response.headers()['content-type'] || '';
        const body = await response.text();
        if (!response.ok() || !contentType.includes('application/json')) {
            throw new Error(
                `Product API returned HTTP ${response.status()} (${contentType || 'unknown content type'}).`,
            );
        }

        let data;
        try {
            data = JSON.parse(body);
        } catch {
            throw new Error(`Product API returned malformed JSON: ${body.slice(0, 200)}`);
        }
        if (!Array.isArray(data?.products)) {
            throw new Error('Product API response does not contain a products array.');
        }

        const seen = new Set();
        const records = [];
        for (const product of data.products) {
            const record = mapApiProduct(product);
            if (!record || seen.has(record.sku)) continue;
            seen.add(record.sku);
            records.push(record);
            if (records.length >= resultsWanted) break;
        }
        if (records.length === 0) throw new Error('Product API returned no valid, unique products.');

        await Actor.pushData(records);
        log.info(`Saved ${records.length} unique products.`);
        if (resultsWanted > records.length) {
            log.warning(
                `Requested ${resultsWanted} products, but Jumia's service returned ${records.length} unique products `
                + `in its current ${MAX_API_PRODUCTS}-item batch. No duplicates were saved.`,
            );
        }
    } finally {
        await browserContext.close();
    }
}

main()
    .then(() => Actor.exit())
    .catch(async (error) => {
        log.exception(error, 'Actor failed');
        await Actor.fail(error);
    });
