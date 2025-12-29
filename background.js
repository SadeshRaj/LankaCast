const RSS_URL = "http://www.adaderana.lk/rss.php?language=sinhala";
const ALARM_NAME = "newsFetcher";

// 1. Install & Start "Real-time" polling (1 min interval)
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
    fetchNews(); // Fetch immediately on install
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        fetchNews();
    }
});

async function fetchNews() {
    try {
        // 'no-cors' mode is NOT used because we need to read the body.
        // manifest.json host_permissions handles the access.
        const response = await fetch(RSS_URL);
        const text = await response.text();
        const items = parseRSS(text);

        // Save All News
        chrome.storage.local.set({ latestNews: items });

        // Check for Alerts
        checkKeywords(items);

    } catch (error) {
        console.error("LankaCast Fetch Error:", error);
    }
}

function parseRSS(xmlText) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
        const content = match[1];

        const titleMatch = content.match(/<title><!\[CDATA\[(.*?)]]><\/title>/) || content.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1] : "News Update";

        const linkMatch = content.match(/<link>(.*?)<\/link>/);
        const link = linkMatch ? linkMatch[1] : "#";

        // IMPROVED IMAGE REGEX: Looks for src inside single or double quotes
        const imgMatch = content.match(/src=["']([^"']+)["']/);
        let image = imgMatch ? imgMatch[1] : "https://www.adaderana.lk/styles/images/logo.png";

        // Force HTTPS for images to prevent mixed-content blocking
        if (image.startsWith('http://')) {
            image = image.replace('http://', 'https://');
        }

        const dateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/);
        const date = dateMatch ? new Date(dateMatch[1]).toLocaleTimeString() : "Just now";

        items.push({ title, link, image, date });
    }
    return items.slice(0, 15);
}

function checkKeywords(newsItems) {
    chrome.storage.local.get(['keywords', 'lastNotifiedLink', 'alertHistory'], (data) => {
        const keywords = data.keywords || [];
        const lastLink = data.lastNotifiedLink || "";
        let alertHistory = data.alertHistory || [];

        if (keywords.length === 0 || newsItems.length === 0) return;

        const latestStory = newsItems[0];

        // If this is a NEW story we haven't seen
        if (latestStory.link !== lastLink) {
            // Check if it matches any keyword
            const foundKeyword = keywords.find(k => latestStory.title.includes(k));

            if (foundKeyword) {
                // 1. Send Notification
                chrome.notifications.create({
                    type: 'image',
                    iconUrl: 'icon128.png',
                    title: 'Alert: ' + foundKeyword,
                    message: latestStory.title,
                    imageUrl: latestStory.image
                });

                // 2. Add to Alert History (for the new Tab)
                alertHistory.unshift(latestStory); // Add to top
                chrome.storage.local.set({
                    lastNotifiedLink: latestStory.link,
                    alertHistory: alertHistory.slice(0, 20) // Keep last 20 alerts
                });
            }
        }
    });
}