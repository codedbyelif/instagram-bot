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
 * Checks Instagram user profile
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
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 500
        });

        // Check HTTP status
        if (response.status === 404) {
            return {
                username,
                status: 'BANLI',
                description: 'Hesap bulunamadı veya silinmiş'
            };
        }

        if (response.status === 403) {
            return {
                username,
                status: 'KISITLI',
                description: 'Hesap kısıtlanmış veya erişim engellendi'
            };
        }

        if (response.status !== 200) {
            return {
                username,
                status: 'HATA',
                description: `Beklenmeyen HTTP durumu: ${response.status}`
            };
        }

        // Parse HTML
        const html = response.data;

        // Check for common error messages
        if (html.includes("Sorry, this page isn't available") ||
            html.includes("Sayfa Bulunamadı") ||
            html.includes("Page Not Found")) {
            return {
                username,
                status: 'BANLI',
                description: 'Hesap bulunamadı (soft 404)'
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

        // If we got here with 200 and no error messages, account is active
        return {
            username,
            status: 'AKTIF',
            description: 'Hesap aktif ve erişilebilir'
        };

    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return {
                username,
                status: 'HATA',
                description: 'Bağlantı zaman aşımına uğradı'
            };
        }

        return {
            username,
            status: 'HATA',
            description: `Kontrol hatası: ${error.message}`
        };
    }
}

module.exports = { checkInstagramUser };
