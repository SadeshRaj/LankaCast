const URL_SINHALA = "https://sinhala.adaderana.lk/rsshotnews.php";
const URL_ENGLISH = "http://www.adaderana.lk/rss.php";
const ALARM_NAME = "newsFetcher";
const NOTIF_ICON = "images/LankaCast.png"; // Your Logo

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
    chrome.storage.local.set({ notificationsEnabled: true });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) fetchAllNews();
});

// --- FETCH LOGIC ---
async function fetchAllNews() {
    await fetchFeed(URL_SINHALA, 'sinhalaNews', 'lastSinhalaLink');
    await fetchFeed(URL_ENGLISH, 'englishNews', 'lastEnglishLink');
}

async function fetchFeed(url, storageKey, lastLinkKey) {
    try {
        const noCacheUrl = `${url}?t=${Date.now()}`;
        const response = await fetch(noCacheUrl, { cache: "no-store", credentials: 'omit' });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const text = await response.text();
        const items = parseRSS(text);

        if (items.length > 0) {
            let data = {};
            data[storageKey] = items;

            chrome.storage.local.get([lastLinkKey, 'notificationsEnabled'], (localData) => {
                const lastLink = localData[lastLinkKey] || "";
                chrome.storage.local.set(data);
                checkForNewNews(items, lastLink, lastLinkKey, localData);
            });
        }
    } catch (error) {
        console.warn(`LankaCast: Retrying ${storageKey} later.`, error);
    }
}

// --- PARSER (STRICT "REAL LETTER" FILTER) ---
function parseRSS(xmlText) {
    const items = [];
    const rawItems = xmlText.split("<item>");

    for (let i = 1; i < rawItems.length; i++) {
        const content = rawItems[i];
        if (!content.includes("</item>")) continue;

        let title = "";

        // 1. Extract Title
        const titleMatch = content.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
        }

        // --- STRICT FILTER LOGIC ---
        // 1. Block known Category Headers
        if (!title || title === "Local" || title === "Hot News") continue;

        // 2. "Base Letter" Count Check
        // We count ONLY:
        // - English Letters (a-z, A-Z)
        // - Numbers (0-9)
        // - Sinhala Base Letters (\u0D85-\u0DC6) -> Vowels & Consonants only
        // WE IGNORE: Punctuation (.,!), Sinhala Signs (\u0DCA-\u0DDF), and Kunddaliya (\u0DF4)
        const validCharCount = (title.match(/[a-zA-Z0-9\u0D85-\u0DC6]/g) || []).length;

        // If the title has fewer than 3 real base letters, it is garbage.
        // This kills "..." (0 letters), ".." (0 letters), "????" (0 letters).
        if (validCharCount < 3) continue;
        // ---------------------------

        let link = "#";
        const linkMatch = content.match(/<link>(.*?)<\/link>/);
        if (linkMatch) link = linkMatch[1].trim();

        // Image Extraction
        let image = null;
        const highResMatch = content.match(/(?:<enclosure|<media:content)[^>]*?url=["']([^"']+)["']/i);
        if (highResMatch && highResMatch[1]) image = highResMatch[1];

        if (!image) {
            const descMatch = content.match(/<description>([\s\S]*?)<\/description>/);
            if (descMatch) {
                const imgTagMatch = descMatch[1].match(/src=["']([^"']+)["']/);
                if (imgTagMatch && imgTagMatch[1]) image = imgTagMatch[1];
            }
        }

        if (!image) {
            const fallbackMatch = content.match(/(?:src="|url=")(https?:\/\/[^"'\s]+\.(?:jpg|png|jpeg|webp))/i);
            if (fallbackMatch) image = fallbackMatch[1];
        }

        if (image) {
            if (image.startsWith('http://')) image = image.replace('http://', 'https://');
            if (image.includes('ad_icon') || image.length < 10) image = null;
        }
        if (!image) image = "images/SLFlag.png";

        let date = null;
        const dateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/);
        if (dateMatch) {
            let cleanString = dateMatch[1].replace(/\+0000/g, "").trim();
            date = parseDate(cleanString);
        }

        items.push({ title, link, image, date });
        if (items.length >= 15) break;
    }
    return items;
}

function parseDate(dateString) {
    try {
        if (!dateString) return null;
        let d = new Date(dateString);
        if (!isNaN(d.getTime())) return d.toISOString();

        let cleanDate = dateString
            .replace(/ජනවාරි/g, "Jan").replace(/පෙබරවාරි/g, "Feb").replace(/මාර්තු/g, "Mar")
            .replace(/අප්‍රේල්/g, "Apr").replace(/මැයි/g, "May").replace(/ජුනි/g, "Jun")
            .replace(/ජූලි/g, "Jul").replace(/අගෝස්තු/g, "Aug").replace(/සැප්තැම්බර්/g, "Sep")
            .replace(/ඔක්තෝබර්/g, "Oct").replace(/නොවැම්බර්/g, "Nov").replace(/දෙසැම්බර්/g, "Dec");

        d = new Date(cleanDate);
        if (!isNaN(d.getTime())) return d.toISOString();
        return null;
    } catch (e) { return null; }
}

// --- UPDATED NOTIFICATION & BADGE LOGIC ---
function checkForNewNews(items, lastLink, lastLinkKey, localData) {
    if (!items || items.length === 0) return;

    const latestStory = items[0];
    let newItems = [];

    if (lastLink) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].link === lastLink) break;
            newItems.push(items[i]);
        }
    }

    if (newItems.length > 0) {
        const countText = newItems.length > 9 ? "9+" : newItems.length.toString();
        chrome.action.setBadgeText({ text: countText });
        chrome.action.setBadgeBackgroundColor({ color: "#D32F2F" });

        let updateData = {};
        updateData[lastLinkKey] = latestStory.link;
        chrome.storage.local.set(updateData);
    } else if (!lastLink) {
        let updateData = {};
        updateData[lastLinkKey] = latestStory.link;
        chrome.storage.local.set(updateData);
    }

    if (localData.notificationsEnabled !== false && newItems.length > 0) {
        newItems.reverse().forEach((item, index) => {
            setTimeout(() => {
                chrome.notifications.create(item.link, {
                    type: 'basic',
                    iconUrl: NOTIF_ICON,
                    title: "LankaCast News",
                    message: item.title,
                    priority: 2,
                    requireInteraction: false
                }, (notifId) => {
                    if (notifId) {
                        setTimeout(() => {
                            chrome.notifications.clear(notifId);
                        }, 6000);
                    }
                });
            }, index * 1000);
        });
    }
}

// --- USER TRACKING (GOOGLE ANALYTICS 4) ---
const GA_MEASUREMENT_ID = 'G-G65EBSVJRQ';
const GA_API_SECRET = 'qT05vYi1QqSfK14TDtQT0w';
const GA_EVENT_NAME = 'daily_active_user';

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) fetchAllNews();
    if (alarm.name === 'analyticsHeartbeat') sendHeartbeat();
});

chrome.runtime.onInstalled.addListener(() => {
    fetchAllNews();
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
    chrome.storage.local.set({ notificationsEnabled: true });

    chrome.storage.local.get('clientId', (data) => {
        if (!data.clientId) {
            const uniqueId = self.crypto.randomUUID();
            chrome.storage.local.set({ clientId: uniqueId });
        }
        sendHeartbeat();
    });
    chrome.alarms.create('analyticsHeartbeat', { periodInMinutes: 1440 });
});

async function sendHeartbeat() {
    const data = await chrome.storage.local.get('clientId');
    const clientId = data.clientId;
    if (!clientId) return;

    try {
        await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`, {
            method: "POST",
            body: JSON.stringify({
                client_id: clientId,
                events: [{
                    name: GA_EVENT_NAME,
                    params: {
                        engagement_time_msec: "100",
                        session_id: Date.now().toString()
                    }
                }]
            })
        });
    } catch (e) {
    }
}