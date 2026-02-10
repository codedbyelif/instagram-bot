const axios = require('axios');
const cheerio = require('cheerio');

// User-Agent rotation for stealth
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

/**
 * Checks Instagram user profile with smart retry on rate limits
 * @param {string} username - Instagram username to check
 * @param {number} retryCount - Current retry attempt (for exponential backoff)
 * @returns {Promise<Object>} Check result with status and description
 */
async function checkInstagramUser(username, retryCount = 0) {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const profileUrl = `https://www.instagram.com/${username}/`;

    try {
        const response = await axios.get(profileUrl, {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            },
            timeout: 15000,
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 500
        });

        // Check HTTP status
        if (response.status === 404) {
            return {
                username,
                status: 'BANLI',
                description: 'Hesap bulunamadı (404)',
                retryCount
            };
        }

        if (response.status === 403 || response.status === 429) {
            // Rate limit detected - retry with exponential backoff
            if (retryCount < 3) {
                const waitTime = Math.pow(2, retryCount) * 60 * 1000; // 1min, 2min, 4min
                console.log(`[RETRY] ${username} - Rate limit, waiting ${waitTime / 1000 / 60} minutes...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return checkInstagramUser(username, retryCount + 1);
            }

            return {
                username,
                status: 'RATE_LIMIT',
                description: `Rate limit - ${retryCount} deneme sonrası başarısız`,
                retryCount
            };
        }

        if (response.status !== 200) {
            return {
                username,
                status: 'HATA',
                description: `HTTP ${response.status}`,
                retryCount
            };
        }

        // Parse HTML
        const html = response.data;
        const $ = cheerio.load(html);

        const title = $('title').text();
        const ogTitle = $('meta[property="og:title"]').attr('content');
        const ogDescription = $('meta[property="og:description"]').attr('content');
        const hasUsernameInJSON = html.includes(`"username":"${username}"`);
        const hasOGData = !!(ogTitle && ogDescription);

        // If we got rate limited (generic Instagram page), retry
        const isGenericTitle = title.trim() === 'Instagram' || title.includes('Login');
        if (isGenericTitle && !hasOGData && !hasUsernameInJSON) {
            if (retryCount < 3) {
                const waitTime = Math.pow(2, retryCount) * 60 * 1000;
                console.log(`[RETRY] ${username} - Generic page, waiting ${waitTime / 1000 / 60} minutes...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return checkInstagramUser(username, retryCount + 1);
            }

            return {
                username,
                status: 'RATE_LIMIT',
                description: `Rate limit algılandı - ${retryCount} deneme sonrası`,
                retryCount
            };
        }

        // POSITIVE INDICATORS: Active account
        if (hasOGData || hasUsernameInJSON) {
            return {
                username,
                status: 'AKTIF',
                description: 'Hesap aktif',
                retryCount
            };
        }

        // NEGATIVE INDICATORS: Explicit error messages
        if (html.includes("Sorry, this page isn't available") ||
            html.includes("Sayfa Bulunamadı") ||
            html.includes("Page Not Found")) {
            return {
                username,
                status: 'BANLI',
                description: 'Hesap bulunamadı',
                retryCount
            };
        }

        if (html.includes("Restricted profile") ||
            html.includes("Kısıtlanmış profil")) {
            return {
                username,
                status: 'KISITLI',
                description: 'Profil kısıtlanmış',
                retryCount
            };
        }

        // Fallback
        return {
            username,
            status: 'BELIRSIZ',
            description: 'Durum belirlenemedi',
            retryCount
        };

    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            // Timeout - retry
            if (retryCount < 3) {
                const waitTime = Math.pow(2, retryCount) * 60 * 1000;
                console.log(`[RETRY] ${username} - Timeout, waiting ${waitTime / 1000 / 60} minutes...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return checkInstagramUser(username, retryCount + 1);
            }

            return {
                username,
                status: 'HATA',
                description: 'Zaman aşımı',
                retryCount
            };
        }

        return {
            username,
            status: 'HATA',
            description: `Hata: ${error.message}`,
            retryCount
        };
    }
}

module.exports = { checkInstagramUser };
