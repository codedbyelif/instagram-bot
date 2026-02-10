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
 * Checks Instagram user profile with rate limit handling
 * @param {string} username - Instagram username to check
 * @returns {Promise<Object>} Check result with status and description
 */
async function checkInstagramUser(username) {
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
                description: 'Hesap bulunamadı (404)'
            };
        }

        if (response.status === 403 || response.status === 429) {
            return {
                username,
                status: 'RATE_LIMIT',
                description: 'Instagram rate limit - daha sonra tekrar denenecek'
            };
        }

        if (response.status !== 200) {
            return {
                username,
                status: 'HATA',
                description: `HTTP ${response.status}`
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

        // If we got rate limited (generic Instagram page), mark as uncertain
        const isGenericTitle = title.trim() === 'Instagram' || title.includes('Login');
        if (isGenericTitle && !hasOGData && !hasUsernameInJSON) {
            // This is likely rate limiting, not a deleted account
            return {
                username,
                status: 'RATE_LIMIT',
                description: 'Instagram rate limit algılandı - durum belirsiz'
            };
        }

        // POSITIVE INDICATORS: Active account
        if (hasOGData || hasUsernameInJSON) {
            return {
                username,
                status: 'AKTIF',
                description: 'Hesap aktif'
            };
        }

        // NEGATIVE INDICATORS: Explicit error messages
        if (html.includes("Sorry, this page isn't available") ||
            html.includes("Sayfa Bulunamadı") ||
            html.includes("Page Not Found")) {
            return {
                username,
                status: 'BANLI',
                description: 'Hesap bulunamadı'
            };
        }

        if (html.includes("Restricted profile") ||
            html.includes("Kısıtlanmış profil")) {
            return {
                username,
                status: 'KISITLI',
                description: 'Profil kısıtlanmış'
            };
        }

        // Fallback
        return {
            username,
            status: 'BELIRSIZ',
            description: 'Durum belirlenemedi'
        };

    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return {
                username,
                status: 'HATA',
                description: 'Zaman aşımı'
            };
        }

        return {
            username,
            status: 'HATA',
            description: `Hata: ${error.message}`
        };
    }
}

module.exports = { checkInstagramUser };
