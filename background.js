const URL_SINHALA = "https://sinhala.adaderana.lk/rsshotnews.php";
const URL_ENGLISH = "http://www.adaderana.lk/rss.php";
const ALARM_NAME = "newsFetcher";

// --- EVENT LISTENERS ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "refreshNews") {
        fetchAllNews().then(() => sendResponse({ status: "done" }));
        return true;
    }
});

chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId && (notificationId.startsWith("http") || notificationId.startsWith("https"))) {
        chrome.tabs.create({ url: notificationId });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    fetchAllNews();
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) fetchAllNews();
});

// --- FETCH LOGIC ---
async function fetchAllNews() {
    await fetchFeed(URL_SINHALA, 'sinhalaNews', 'lastSinhalaLink', true);
    await fetchFeed(URL_ENGLISH, 'englishNews', 'lastEnglishLink', false);
}

async function fetchFeed(url, storageKey, lastLinkKey, isSinhala) {
    try {
        // Cache busting to ensure we get the latest version
        const noCacheUrl = `${url}?t=${Date.now()}`;

        const response = await fetch(noCacheUrl, {
            cache: "no-store",
            credentials: 'omit'
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const text = await response.text();
        const items = parseRSS(text, isSinhala);

        if (items.length > 0) {
            let data = {};
            data[storageKey] = items;
            chrome.storage.local.set(data);
            checkForNewNews(items, lastLinkKey);
        }
    } catch (error) {
        console.warn(`LankaCast: Retrying ${storageKey} later.`, error);
    }
}

// --- PARSER ---
function parseRSS(xmlText, isSinhala) {
    const items = [];
    const rawItems = xmlText.split("<item>");

    for (let i = 1; i < rawItems.length; i++) {
        const content = rawItems[i];
        if (!content.includes("</item>")) continue;

        let title = "News Update";
        const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
        if (titleMatch) title = titleMatch[1].replace("<![CDATA[", "").replace("]]>", "").trim();

        let link = "#";
        const linkMatch = content.match(/<link>(.*?)<\/link>/);
        if (linkMatch) link = linkMatch[1];

        let image = "images/SL128.png";
        const imgTagMatch = content.match(/src=["']([^"']+)["']/);
        if (imgTagMatch) {
            const scrapedImg = imgTagMatch[1];
            if (scrapedImg.startsWith("http") || scrapedImg.startsWith("//")) {
                image = scrapedImg;
                if (image.startsWith('http://')) image = image.replace('http://', 'https://');
            }
        }

        let date = "Recent";
        const dateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/);
        if (dateMatch) {
            if (isSinhala) date = extractRawTime(dateMatch[1]);
            else date = formatStandardTime(dateMatch[1]);
        }

        items.push({ title, link, image, date });
        if (items.length >= 15) break;
    }
    return items;
}

function extractRawTime(dateString) {
    const timeMatch = dateString.match(/(\d{2}):(\d{2})/);
    if (timeMatch) {
        let h = parseInt(timeMatch[1]);
        const m = timeMatch[2];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h}:${m} ${ampm}`;
    }
    return "Recent";
}

function formatStandardTime(dateString) {
    try {
        const d = new Date(dateString);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
        return "Recent";
    }
}

// --- NOTIFICATIONS (UPDATED) ---
function checkForNewNews(items, lastLinkKey) {
    if (!items || items.length === 0) return;

    chrome.storage.local.get([lastLinkKey, 'keywords'], (data) => {
        const lastLink = data[lastLinkKey] || "";
        const latestStory = items[0];

        // IF NEW NEWS
        if (latestStory.link !== lastLink) {

            const keywords = data.keywords || [];
            const foundKeyword = keywords.find(k => latestStory.title.toLowerCase().includes(k.toLowerCase()));

            let notifTitle = "LankaCast News";
            let notifMessage = latestStory.title;

            if (foundKeyword) {
                notifTitle = `ALERT: ${foundKeyword}`;
                chrome.storage.local.get('alertHistory', (hData) => {
                    const history = hData.alertHistory || [];
                    history.unshift(latestStory);
                    chrome.storage.local.set({ alertHistory: history.slice(0, 20) });
                });
            }

            // --- 1. SET BADGE FIRST (Since we know this works) ---
            chrome.action.setBadgeText({ text: "1" });
            chrome.action.setBadgeBackgroundColor({ color: "#D32F2F" });

            // --- 2. TRIGGER NOTIFICATION ---
            // We use 'requireInteraction: true' to force it to stay on screen
            const iconUrl = chrome.runtime.getURL("images/SL128.png");

            chrome.notifications.create(latestStory.link, {
                type: 'basic',
                iconUrl: iconUrl,
                title: notifTitle,
                message: notifMessage,
                priority: 2,
                requireInteraction: true  // <--- KEY CHANGE: Keeps notification on screen
            }, (id) => {
                if (chrome.runtime.lastError) {
                    console.error("NOTIFICATION ERROR:", chrome.runtime.lastError);
                } else {
                    console.log("Notification sent successfully:", id);
                }
            });

            // --- 3. UPDATE STORAGE ---
            let updateData = {};
            updateData[lastLinkKey] = latestStory.link;
            chrome.storage.local.set(updateData);
        }
    });
}