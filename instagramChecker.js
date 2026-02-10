const axios = require('axios');

// Rotate User Agents to avoid detection
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
];

async function checkUser(username, retries = 3) {
    const url = `https://www.instagram.com/${username}/`;

    for (let i = 0; i < retries; i++) {
        try {
            // Pick a random User-Agent
            const randomAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

            const response = await axios.get(url, {
                headers: {
                    'User-Agent': randomAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Cache-Control': 'max-age=0',
                },
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                }
            });

            // Status Code Analysis
            if (response.status === 404) {
                return { username, status: 'banned', code: 404 };
            }

            if (response.status === 200) {
                // Content Analysis for Soft Bans / Errors
                const html = response.data;

                // Common Instagram error messages
                if (html.includes("Sorry, this page isn't available") || html.includes("Sayfa Bulunamadı")) {
                    return { username, status: 'banned', code: 404 }; // Soft 404
                }

                if (html.includes("Restricted profile") || html.includes("Kısıtlanmış profil")) {
                    return { username, status: 'restricted', code: 200 };
                }

                if (html.includes("Login • Instagram")) {
                    // Sometimes it redirects to login, which usually means the profile exists but is private or requires login.
                    // We count this as active for now, but it could be ambiguous.
                    return { username, status: 'active', code: 200 };
                }

                // If we got here, it likely loaded the profile page
                return { username, status: 'active', code: 200 };
            }

            if (response.status === 302 || response.status === 403) {
                return { username, status: 'restricted', code: response.status };
            } else {
                console.log(`[Deneme ${i + 1}] ${username} için beklenmedik durum kodu: ${response.status}`);
            }

        } catch (error) {
            console.error(`[Deneme ${i + 1}] ${username} kontrol edilirken hata:`, error.message);
        }

        // Wait before retry
        const delay = Math.floor(Math.random() * 3000) + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    return { username, status: 'error', code: null };
}

module.exports = { checkUser };
