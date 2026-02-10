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
 * Checks Instagram user via direct thread URL
 * @param {string} username - Expected username
 * @param {string} directThreadUrl - Instagram direct thread URL
 * @returns {Promise<Object>} Check result with status and description
 */
async function checkInstagramUser(username, directThreadUrl) {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    try {
        const response = await axios.get(directThreadUrl, {
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
        if (response.status === 404 || response.status === 410) {
            return {
                username,
                url: directThreadUrl,
                status: 'URL_GECERSIZ',
                description: 'Thread URL geçersiz veya silinmiş (404/410)'
            };
        }

        if (response.status === 403) {
            return {
                username,
                url: directThreadUrl,
                status: 'ERISIM_KISITLI',
                description: 'Instagram tarafından erişim kısıtlandı'
            };
        }

        if (response.status !== 200) {
            return {
                username,
                url: directThreadUrl,
                status: 'URL_GECERSIZ',
                description: `Beklenmeyen HTTP durumu: ${response.status}`
            };
        }

        // Parse HTML and check for username
        const html = response.data;
        const finalUrl = response.request.res.responseUrl || directThreadUrl;

        // Load HTML with cheerio
        const $ = cheerio.load(html);
        const pageTitle = $('title').text();
        const bodyText = $('body').text();

        // Check if username exists in various places
        const usernameInUrl = finalUrl.toLowerCase().includes(username.toLowerCase());
        const usernameInHtml = html.toLowerCase().includes(username.toLowerCase());
        const usernameInTitle = pageTitle.toLowerCase().includes(username.toLowerCase());
        const usernameInBody = bodyText.toLowerCase().includes(username.toLowerCase());

        if (usernameInUrl || usernameInHtml || usernameInTitle || usernameInBody) {
            return {
                username,
                url: directThreadUrl,
                status: 'AKTIF',
                description: 'Kullanıcı adı doğrulandı, hesap aktif'
            };
        } else {
            return {
                username,
                url: directThreadUrl,
                status: 'KULLANICI_ADI_DEGISMIS',
                description: 'Kullanıcı adı bulunamadı, hesap kapatılmış veya kullanıcı adı değişmiş olabilir'
            };
        }

    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return {
                username,
                url: directThreadUrl,
                status: 'ERISIM_KISITLI',
                description: 'Bağlantı zaman aşımına uğradı'
            };
        }

        return {
            username,
            url: directThreadUrl,
            status: 'HATA',
            description: `Kontrol hatası: ${error.message}`
        };
    }
}

module.exports = { checkInstagramUser };
