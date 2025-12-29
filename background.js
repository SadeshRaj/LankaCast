// SWITCHED TO BBC SINHALA (More Reliable)
const URL_SINHALA = "https://feeds.bbci.co.uk/sinhala/rss.xml";
const URL_ENGLISH = "http://www.adaderana.lk/rss.php";
const ALARM_NAME = "newsFetcher";

// 1. Listen for "Force Refresh"
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "refreshNews") {
        fetchAllNews().then(() => {
            sendResponse({ status: "done" });
        });
        return true;
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
    fetchAllNews();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        fetchAllNews();
    }
});

async function fetchAllNews() {
    console.log("Fetching News...");
    await fetchFeed(URL_SINHALA, 'sinhalaNews', 'lastSinhalaLink');
    await fetchFeed(URL_ENGLISH, 'englishNews', 'lastEnglishLink');
}

async function fetchFeed(url, storageKey, lastLinkKey) {
    try {
        const response = await fetch(url, { cache: "no-store" });
        const text = await response.text();
        const items = parseRSS(text);

        console.log(`Fetched ${items.length} items for ${storageKey}`);

        if (items.length > 0) {
            let data = {};
            data[storageKey] = items;
            chrome.storage.local.set(data);
            checkForNewNews(items, lastLinkKey);
        }
    } catch (error) {
        console.error(`Error fetching ${storageKey}:`, error);
    }
}

// ROBUST PARSER (Updated for BBC format)
function parseRSS(xmlText) {
    const items = [];
    const rawItems = xmlText.split("<item>");

    for (let i = 1; i < rawItems.length; i++) {
        const content = rawItems[i];
        if (!content.includes("</item>")) continue;

        // 1. Title
        let title = "News Update";
        const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
        if (titleMatch) title = titleMatch[1].replace("<![CDATA[", "").replace("]]>", "").trim();

        // 2. Link
        let link = "#";
        const linkMatch = content.match(/<link>(.*?)<\/link>/);
        if (linkMatch) link = linkMatch[1];

        // 3. Image (Handles BBC media:thumbnail)
        let image = "https://news.bbcimg.co.uk/view/3/images/bbc_news_640_blob.jpg"; // BBC Default

        const mediaMatch = content.match(/<media:thumbnail[^>]+url="([^"]+)"/);
        const imgTagMatch = content.match(/src=["']([^"']+)["']/);

        if (mediaMatch) image = mediaMatch[1];
        else if (imgTagMatch) image = imgTagMatch[1];

        // Force HTTPS
        if (image.startsWith('http://')) image = image.replace('http://', 'https://');

        // 4. Date
        let date = "Recent";
        const dateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/);
        if (dateMatch) {
            const d = new Date(dateMatch[1]);
            date = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        items.push({ title, link, image, date });
        if (items.length >= 15) break;
    }
    return items;
}

function checkForNewNews(items, lastLinkKey) {
    if (!items || items.length === 0) return;

    chrome.storage.local.get([lastLinkKey, 'keywords'], (data) => {
        const lastLink = data[lastLinkKey] || "";
        const latestStory = items[0];

        if (latestStory.link !== lastLink) {
            chrome.notifications.create({
                type: 'image',
                iconUrl: 'images/SL128.png',
                title: 'Breaking News',
                message: latestStory.title,
                imageUrl: latestStory.image
            });

            const keywords = data.keywords || [];
            const foundKeyword = keywords.find(k => latestStory.title.toLowerCase().includes(k.toLowerCase()));

            if (foundKeyword) {
                chrome.storage.local.get('alertHistory', (hData) => {
                    const history = hData.alertHistory || [];
                    history.unshift(latestStory);
                    chrome.storage.local.set({ alertHistory: history.slice(0, 20) });
                });
            }

            let updateData = {};
            updateData[lastLinkKey] = latestStory.link;
            chrome.storage.local.set(updateData);
        }
    });
}