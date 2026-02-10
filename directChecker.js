const axios = require('axios');
const cheerio = require('cheerio');

// Random User Agents to act like a real browser
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
];

/**
 * Checks a single Instagram Direct Thread URL.
 * @param {string} expectedUsername - The username we expect to find.
 * @param {string} directThreadUrl - The Instagram direct thread URL.
 */
async function checkInstagramDirectThread(expectedUsername, directThreadUrl) {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    try {
        const response = await axios.get(directThreadUrl, {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout: 10000, // 10 seconds timeout
            maxRedirects: 5, // Follow redirects
            validateStatus: (status) => status >= 200 && status < 500 // Handle 404 manually
        });

        // 1. URL STATUS CHECK
        if (response.status === 404 || response.status === 410) {
            return {
                expected: expectedUsername,
                url: directThreadUrl,
                status: 'CLOSED_OR_CHANGED',
                description: '❌ Durum: HESAP KAPATILMIŞ / KULLANICI ADI DEĞİŞMİŞ (404/410)'
            };
        }

        if (response.status !== 200) {
            return {
                expected: expectedUsername,
                url: directThreadUrl,
                status: 'INVALID',
                description: `⚠️ Durum: URL GEÇERSİZ (Status: ${response.status})`
            };
        }

        // 2. USERNAME MATCH CHECK
        const html = response.data;
        const finalUrl = response.request.res.responseUrl || directThreadUrl; // Get the final URL after redirects

        // Check if username exists in HTML body, Title, or JSON data embedded in page
        const $ = cheerio.load(html);
        const pageTitle = $('title').text();
        const metaDescription = $('meta[name="description"]').attr('content') || '';

        // Simple string check is usually enough, but we can be more specific
        // Instagram usually puts the username in the title like "Username (@username) • Instagram photos and videos"
        // Or in the URL itself if redirected: instagram.com/username/

        const isUsernameInUrl = finalUrl.toLowerCase().includes(expectedUsername.toLowerCase());
        const isUsernameInHtml = html.toLowerCase().includes(expectedUsername.toLowerCase());
        const isUsernameInTitle = pageTitle.toLowerCase().includes(expectedUsername.toLowerCase());

        if (isUsernameInUrl || isUsernameInHtml || isUsernameInTitle) {
            return {
                expected: expectedUsername,
                url: directThreadUrl,
                status: 'ACTIVE',
                description: '✅ Durum: AKTİF (Kullanıcı adı bulundu)'
            };
        } else {
            return {
                expected: expectedUsername,
                url: directThreadUrl,
                status: 'CLOSED_OR_CHANGED',
                description: '❌ Durum: HESAP KAPATILMIŞ / KULLANICI ADI DEĞİŞMİŞ (Kullanıcı adı sayfada yok)'
            };
        }

    } catch (error) {
        return {
            expected: expectedUsername,
            url: directThreadUrl,
            status: 'ERROR',
            description: `⚠️ Durum: HATA (${error.message})`
        };
    }
}

/**
 * Validates a list of threads with delays.
 * @param {Array<{expectedUsername: string, directThreadUrl: string}>} threadList 
 */
async function processThreadList(threadList) {
    console.log(`🔎 Toplam ${threadList.length} adet URL kontrol edilecek...\n`);

    for (const item of threadList) {
        const result = await checkInstagramDirectThread(item.expectedUsername, item.directThreadUrl);

        // Output Result
        console.log(`👤 Beklenen Kullanıcı: ${result.expected}`);
        console.log(`🔗 URL: ${result.url}`);
        console.log(`${result.description}`);
        console.log('--------------------------------------------------');

        // Rate Limit Delay (at least 3 seconds)
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

// --- TEST USAGE (If ran directly) ---
if (require.main === module) {
    const testData = [
        {
            expectedUsername: "riseinweb3",
            directThreadUrl: "https://www.instagram.com/direct/t/17845499745253887/"
        },
        // Add more for testing if needed
    ];

    processThreadList(testData);
}

module.exports = { checkInstagramDirectThread, processThreadList };
