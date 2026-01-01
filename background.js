const URL_SINHALA = "https://sinhala.adaderana.lk/rsshotnews.php";
const URL_ENGLISH = "http://www.adaderana.lk/rss.php";
const ALARM_NAME = "newsFetcher";
const NOTIF_ICON = "images/LankaCast.png";


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

    chrome.storage.local.set({
        notificationsEnabled: true,
        unreadCount: 0,
        alertHistory: []
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) fetchAllNews();
    if (alarm.name === 'analyticsHeartbeat') sendHeartbeat();
});


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


            chrome.storage.local.get(
                [lastLinkKey, 'notificationsEnabled', 'keywords', 'alertHistory', 'unreadCount'],
                (localData) => {
                    const lastLink = localData[lastLinkKey] || "";
                    chrome.storage.local.set(data);
                    checkForNewNews(items, lastLink, lastLinkKey, localData);
                }
            );
        }
    } catch (error) {
        console.warn(`LankaCast: Retrying ${storageKey} later.`, error);
    }
}


function parseRSS(xmlText) {
    const items = [];
    const rawItems = xmlText.split("<item>");

    for (let i = 1; i < rawItems.length; i++) {
        const content = rawItems[i];
        if (!content.includes("</item>")) continue;

        let title = "";
        const titleMatch = content.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
        }

        if (!title || title === "Local" || title === "Hot News") continue;
        const validCharCount = (title.match(/[a-zA-Z0-9\u0D85-\u0DC6]/g) || []).length;
        if (validCharCount < 3) continue;

        let link = "#";
        const linkMatch = content.match(/<link>(.*?)<\/link>/);
        if (linkMatch) link = linkMatch[1].trim();

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


function checkForNewNews(items, lastLink, lastLinkKey, localData) {
    if (!items || items.length === 0) return;

    const latestStory = items[0];
    let newItems = [];


    if (lastLink) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].link === lastLink) break;
            newItems.push(items[i]);
        }
    } else {

        let updateData = {};
        updateData[lastLinkKey] = latestStory.link;
        chrome.storage.local.set(updateData);
        return;
    }

    if (newItems.length === 0) return;

    // 1. Update Last Link
    let updateData = {};
    updateData[lastLinkKey] = latestStory.link;

    // 2. Update Badge Count (Accumulative)
    let currentUnread = localData.unreadCount || 0;
    let totalUnread = currentUnread + newItems.length;

    // Cap visual count at 99+ for safety, but store real number
    const countText = totalUnread > 99 ? "99+" : totalUnread.toString();
    chrome.action.setBadgeText({ text: countText });
    chrome.action.setBadgeBackgroundColor({ color: "#D32F2F" });

    updateData['unreadCount'] = totalUnread;

    // 3. Process Notifications & Alert History
    let updatedHistory = localData.alertHistory || [];
    let keywords = localData.keywords || [];
    const globalNotifEnabled = localData.notificationsEnabled !== false; // Default true

    // Reverse to process oldest new item first
    newItems.reverse().forEach((item, index) => {

        // Check for Keyword Match
        let isKeywordMatch = false;
        if (keywords.length > 0) {
            const titleLower = item.title.toLowerCase();
            isKeywordMatch = keywords.some(k => titleLower.includes(k.toLowerCase()));
        }

        // Determine if we should notify
        // Rule: Notify if Global is ON OR if Keyword Matches (even if Global is OFF)
        const shouldNotify = globalNotifEnabled || isKeywordMatch;

        if (shouldNotify) {
            setTimeout(() => {
                chrome.notifications.create(item.link, {
                    type: 'basic',
                    iconUrl: NOTIF_ICON,
                    title: isKeywordMatch ? `Alert: ${item.title}` : "LankaCast News",
                    message: isKeywordMatch ? "Keyword Match Found" : item.title,
                    priority: 2,
                    requireInteraction: false
                }, (notifId) => {
                    if (notifId) {
                        // Updated Timeout: 8 Seconds
                        setTimeout(() => {
                            chrome.notifications.clear(notifId);
                        }, 8000);
                    }
                });
            }, index * 1000);
        }

        // Save to History ONLY if Keyword Match
        if (isKeywordMatch) {
            // Avoid duplicates in history
            if (!updatedHistory.some(h => h.link === item.link)) {
                updatedHistory.unshift(item); // Add to top
            }
        }
    });

    // Trim history to max 50 items to save space
    if (updatedHistory.length > 50) updatedHistory = updatedHistory.slice(0, 50);

    updateData['alertHistory'] = updatedHistory;
    chrome.storage.local.set(updateData);
}

const GA_MEASUREMENT_ID = 'G-G65EBSVJRQ';
const GA_API_SECRET = 'qT05vYi1QqSfK14TDtQT0w';
const GA_EVENT_NAME = 'daily_active_user';

chrome.storage.local.get('clientId', (data) => {
    if (!data.clientId) {
        const uniqueId = self.crypto.randomUUID();
        chrome.storage.local.set({ clientId: uniqueId });
    }
    sendHeartbeat();
});
chrome.alarms.create('analyticsHeartbeat', { periodInMinutes: 1440 });

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
                    params: { engagement_time_msec: "100", session_id: Date.now().toString() }
                }]
            })
        });
    } catch (e) {}
}