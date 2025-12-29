const URL_SINHALA = "http://sinhala.adaderana.lk/rss.php";
const URL_ENGLISH = "http://www.adaderana.lk/rss.php";
const ALARM_NAME = "newsFetcher";

// 1. Install & Start Loop
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
    fetchAllNews();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        fetchAllNews();
    }
});

// 2. Fetch Both Languages
async function fetchAllNews() {
    await fetchFeed(URL_SINHALA, 'sinhalaNews', 'lastSinhalaLink');
    await fetchFeed(URL_ENGLISH, 'englishNews', 'lastEnglishLink');
}

async function fetchFeed(url, storageKey, lastLinkKey) {
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder("utf-8");
        const text = decoder.decode(buffer);

        const items = parseRSS(text);

        // Save to storage
        let data = {};
        data[storageKey] = items;
        chrome.storage.local.set(data);

        // CHECK FOR NEW NEWS (The Notification Logic)
        checkForNewNews(items, lastLinkKey);

    } catch (error) {
        console.error(`Error fetching ${storageKey}:`, error);
    }
}

function checkForNewNews(items, lastLinkKey) {
    if (!items || items.length === 0) return;

    chrome.storage.local.get([lastLinkKey, 'keywords'], (data) => {
        const lastLink = data[lastLinkKey] || "";
        const latestStory = items[0];

        // If the top link is different from the last saved link -> IT IS NEW!
        if (latestStory.link !== lastLink) {

            // 1. Send System Notification (The "Popup")
            chrome.notifications.create({
                type: 'image',
                iconUrl: 'icon128.png',
                title: 'Breaking News',
                message: latestStory.title,
                imageUrl: latestStory.image
            });

            // 2. Check for Keywords (Your Killer Feature)
            const keywords = data.keywords || [];
            const foundKeyword = keywords.find(k => latestStory.title.toLowerCase().includes(k.toLowerCase()));

            if (foundKeyword) {
                // Save to Alert History if it matches a keyword
                chrome.storage.local.get('alertHistory', (hData) => {
                    const history = hData.alertHistory || [];
                    history.unshift(latestStory);
                    chrome.storage.local.set({ alertHistory: history.slice(0, 20) });
                });
            }

            // 3. Update the last link so we don't notify again
            let updateData = {};
            updateData[lastLinkKey] = latestStory.link;
            chrome.storage.local.set(updateData);
        }
    });
}

function parseRSS(xmlText) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
        const content = match[1];

        // Extract Title
        const titleMatch = content.match(/<title><!\[CDATA\[(.*?)]]><\/title>/) || content.match(/<title>(.*?)<\/title>/);
        let title = titleMatch ? titleMatch[1] : "News Update";

        // Cleanup Title (Remove "Ada Derana" prefix if common)
        title = title.replace("Ada Derana", "").trim();

        // Extract Link
        const linkMatch = content.match(/<link>(.*?)<\/link>/);
        const link = linkMatch ? linkMatch[1] : "#";

        // Extract Image
        const imgMatch = content.match(/src=["']([^"']+)["']/);
        let image = imgMatch ? imgMatch[1] : "https://www.adaderana.lk/styles/images/logo.png";
        if (image.startsWith('http://')) image = image.replace('http://', 'https://');

        const dateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/);
        const date = dateMatch ? new Date(dateMatch[1]).toLocaleTimeString() : "";

        items.push({ title, link, image, date });
    }
    return items.slice(0, 15);
}