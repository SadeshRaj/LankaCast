const URL_SINHALA = "https://sinhala.adaderana.lk/rsshotnews.php";
const URL_ENGLISH = "https://adaderana.lk/categories/latest?page=1&pageSize=20";
const ALARM_NAME = "newsFetcher";
const NOTIF_ICON = "images/LankaCast.png";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "refreshNews") {
        fetchAllNews().then(() => sendResponse({ status: "done" }));
        return true;
    }
    if (msg.action === "dismissUpdate") {
        const currentVersion = chrome.runtime.getManifest().version;
        chrome.storage.local.set({ lastDismissedVersion: currentVersion });
        sendResponse({ status: "dismissed" });
        return true;
    }
});

chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId && (notificationId.startsWith("http") || notificationId.startsWith("https"))) {
        chrome.tabs.create({ url: notificationId });
    }
});

chrome.runtime.onInstalled.addListener((details) => {
    const manifest = chrome.runtime.getManifest();
    const currentVersion = manifest.version;

    if (details.reason === "update") {
        const previousVersion = details.previousVersion || "";

        chrome.tabs.create({
            url: chrome.runtime.getURL(`whats-new.html?version=${currentVersion}&prev=${previousVersion}`)
        });

        chrome.storage.local.set({
            updateInfo: {
                isUpdate: true,
                previousVersion,
                currentVersion,
                timestamp: Date.now()
            },
            lastDismissedVersion: null
        });

    } else if (details.reason === "install") {
        chrome.storage.local.set({
            notificationsEnabled: true,
            unreadCount: 0,
            alertHistory: [],
            updateInfo: null
        });
    }

    fetchAllNews();
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) fetchAllNews();
});

async function fetchAllNews() {
    await fetchSinhalaFeed();
    await fetchEnglishNews();
}

async function fetchSinhalaFeed() {
    try {
        const noCacheUrl = `${URL_SINHALA}?t=${Date.now()}`;
        const response = await fetch(noCacheUrl, { cache: "no-store", credentials: 'omit' });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const text = await response.text();
        const items = parseRSS(text, 'si');
        if (items.length > 0) {
            chrome.storage.local.get(
                ['lastSinhalaLink', 'notificationsEnabled', 'keywords', 'alertHistory', 'unreadCount'],
                (localData) => {
                    const lastLink = localData['lastSinhalaLink'] || "";
                    chrome.storage.local.set({ sinhalaNews: items });
                    checkForNewNews(items, lastLink, 'lastSinhalaLink', localData);
                }
            );
        }
    } catch (error) {
        console.warn("LankaCast: Sinhala feed error.", error);
    }
}

function parseRSS(xmlText, lang) {
    const items = [];
    const rawItems = xmlText.split("<item>");
    for (let i = 1; i < rawItems.length; i++) {
        const content = rawItems[i];
        if (!content.includes("</item>")) continue;
        let title = "";
        const titleMatch = content.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        if (titleMatch && titleMatch[1]) title = titleMatch[1].trim();
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
        if (dateMatch) date = parseDate(dateMatch[1].replace(/\+0000/g, "").trim());
        items.push({ title, link, image, date, lang: lang || 'si' });
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

async function fetchEnglishNews() {
    try {
        const noCacheUrl = `${URL_ENGLISH}&t=${Date.now()}`;
        const response = await fetch(noCacheUrl, {
            cache: "no-store",
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LankaCast/1.8)' }
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const html = await response.text();
        const articles = parseEnglishHTML(html);
        if (articles.length === 0) return;
        chrome.storage.local.set({ englishNews: articles });
        fetchImagesForArticles(articles).then(articlesWithImages => {
            chrome.storage.local.set({ englishNews: articlesWithImages });
        });
        chrome.storage.local.get(
            ['lastEnglishLink', 'notificationsEnabled', 'keywords', 'alertHistory', 'unreadCount'],
            (localData) => {
                const lastLink = localData['lastEnglishLink'] || "";
                checkForNewNews(articles, lastLink, 'lastEnglishLink', localData);
            }
        );
    } catch (e) {
        console.error("English fetch failed:", e);
    }
}

async function fetchImagesForArticles(articles) {
    const results = await Promise.allSettled(articles.map(a => fetchOgImage(a.link)));
    return articles.map((article, i) => {
        const result = results[i];
        const image = (result.status === 'fulfilled' && result.value) ? result.value : 'images/SLFlag.png';
        return { ...article, image };
    });
}

async function fetchOgImage(url) {
    try {
        const response = await fetch(url, { cache: "no-store", headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LankaCast/1.8)' } });
        if (!response.ok) return null;
        const html = await response.text();
        const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        return match ? match[1] : null;
    } catch (e) { return null; }
}

function parseEnglishHTML(html) {
    const articles = [];
    const seenLinks = new Set();
    const seenTitles = new Set();
    const timeRegex = /\b(\d+)(m|h|d)\s+ago\b/i;
    const anchorRegex = /<a\s+href="(\/news\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = anchorRegex.exec(html)) !== null) {
        const href = match[1];
        const fullLink = 'https://adaderana.lk' + href;
        if (seenLinks.has(fullLink)) continue;
        let rawText = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!rawText || rawText.length < 15) continue;
        rawText = rawText.replace(/^NEWS ALERT\s*/i, '').trim();
        const timeMatch = rawText.match(timeRegex);
        let date = new Date().toISOString();
        if (timeMatch) {
            const val = parseInt(timeMatch[1]);
            const unit = timeMatch[2].toLowerCase();
            const now = new Date();
            if (unit === 'm') now.setMinutes(now.getMinutes() - val);
            else if (unit === 'h') now.setHours(now.getHours() - val);
            else if (unit === 'd') now.setDate(now.getDate() - val);
            date = now.toISOString();
            rawText = rawText.slice(0, timeMatch.index).trim();
        }
        rawText = rawText.replace(/\s*MORE\.+\s*$/i, '').trim();
        let title = rawText;
        if (rawText.length > 60) {
            for (let len = 20; len <= Math.min(120, Math.floor(rawText.length / 2)); len++) {
                const prefix = rawText.slice(0, len);
                if (rawText.slice(len).startsWith(prefix)) { title = prefix.trim(); break; }
            }
            if (title === rawText) {
                const stopIdx = rawText.search(/\.\s+[A-Z]/);
                if (stopIdx > 20) title = rawText.slice(0, stopIdx + 1).trim();
                else title = rawText.slice(0, 150).trim();
            }
        }
        if (!title || title.length < 15) continue;
        const titleKey = title.slice(0, 50).toLowerCase();
        if (seenTitles.has(titleKey)) continue;
        seenLinks.add(fullLink);
        seenTitles.add(titleKey);
        articles.push({ title, link: fullLink, image: 'images/SLFlag.png', date, lang: 'en' });
        if (articles.length >= 15) break;
    }
    return articles;
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
    let updateData = {};
    updateData[lastLinkKey] = latestStory.link;
    let currentUnread = localData.unreadCount || 0;
    let totalUnread = currentUnread + newItems.length;
    const countText = totalUnread > 99 ? "99+" : totalUnread.toString();
    chrome.action.setBadgeText({ text: countText });
    chrome.action.setBadgeBackgroundColor({ color: "#D32F2F" });
    updateData['unreadCount'] = totalUnread;
    let updatedHistory = localData.alertHistory || [];
    let keywords = localData.keywords || [];
    const globalNotifEnabled = localData.notificationsEnabled !== false;
    newItems.reverse().forEach((item, index) => {
        let isKeywordMatch = false;
        if (keywords.length > 0) {
            const titleLower = item.title.toLowerCase();
            isKeywordMatch = keywords.some(k => titleLower.includes(k.toLowerCase()));
        }
        const shouldNotify = globalNotifEnabled || isKeywordMatch;
        if (shouldNotify) {
            setTimeout(() => {
                chrome.notifications.create(item.link, {
                    type: 'basic', iconUrl: NOTIF_ICON,
                    title: isKeywordMatch ? `Alert: ${item.title}` : "LankaCast News",
                    message: isKeywordMatch ? "Keyword Match Found" : item.title,
                    priority: 2, requireInteraction: false
                }, (notifId) => {
                    if (notifId) setTimeout(() => chrome.notifications.clear(notifId), 8000);
                });
            }, index * 1000);
        }
        if (isKeywordMatch) {
            if (!updatedHistory.some(h => h.link === item.link)) updatedHistory.unshift(item);
        }
    });
    if (updatedHistory.length > 50) updatedHistory = updatedHistory.slice(0, 50);
    updateData['alertHistory'] = updatedHistory;
    chrome.storage.local.set(updateData);
}