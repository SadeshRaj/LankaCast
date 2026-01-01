chrome.storage.local.get('theme', (d) => {
    if(d.theme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcon(true);
    } else {
        updateThemeIcon(false);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setupNav();
    showSkeletons('sinhala-loader');

    chrome.action.setBadgeText({ text: "" });
    chrome.storage.local.set({ unreadCount: 0 });

    const toggle = document.getElementById('notifToggle');
    if(toggle) {
        toggle.addEventListener('change', (e) => {
            chrome.storage.local.set({ notificationsEnabled: e.target.checked });
        });
    }

    document.getElementById('saveBtn').addEventListener('click', addKeyword);
    document.getElementById('keywordInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') addKeyword(); });
    document.getElementById('refreshBtn').addEventListener('click', forceRefresh);
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);

    loadDataAsync();
});

function loadDataAsync() {
    chrome.storage.local.get(
        ['sinhalaNews', 'englishNews', 'alertHistory', 'keywords', 'notificationsEnabled'],
        (data) => {
            renderNewsData(data.sinhalaNews, 'sinhala-hero', 'sinhala-list', 'sinhala-loader');
            renderNewsData(data.englishNews, 'english-hero', 'english-list', 'english-loader');
            renderAlertsData(data.alertHistory);
            renderKeywords(data.keywords);

            const toggle = document.getElementById('notifToggle');
            if(toggle && data.notificationsEnabled !== undefined) {
                toggle.checked = data.notificationsEnabled;
            }
        }
    );
}

function renderNewsData(items, heroId, listId, loaderId) {
    const heroContainer = document.getElementById(heroId);
    const listContainer = document.getElementById(listId);
    const loader = document.getElementById(loaderId);

    if (!heroContainer || !listContainer || !loader) return;

    heroContainer.textContent = '';
    listContainer.textContent = '';

    if (items && items.length > 0) {
        loader.style.display = 'none';
        const hero = items[0];
        const heroCard = createHeroCard(hero);
        heroContainer.appendChild(heroCard);

        const listItems = items.slice(1);
        listItems.forEach(item => {
            const card = createNewsCard(item);
            listContainer.appendChild(card);
        });
    } else {
        if(items && items.length === 0) {
            loader.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;">No news available.</div>';
        }
    }
}

function createHeroCard(item) {
    const heroImgSrc = item.image || "images/SLFlag.png";
    const heroTimeStr = timeAgo(item.date);

    const a = document.createElement('a');
    a.href = item.link;
    a.target = "_blank";
    a.className = "hero-card";

    const img = document.createElement('img');
    img.src = heroImgSrc;
    img.className = "hero-img";
    img.loading = "lazy";
    img.onerror = () => { img.src = "images/SLFlag.png"; };

    const overlay = document.createElement('div');
    overlay.className = "hero-overlay";

    const badge = document.createElement('span');
    badge.className = "hero-badge";
    badge.textContent = "Latest";

    const title = document.createElement('div');
    title.className = "hero-title";
    title.textContent = item.title;

    const dateDiv = document.createElement('div');
    dateDiv.className = "hero-date";
    dateDiv.textContent = heroTimeStr;

    overlay.appendChild(badge);
    overlay.appendChild(title);
    overlay.appendChild(dateDiv);
    a.appendChild(img);
    a.appendChild(overlay);

    return a;
}

function createNewsCard(item) {
    const itemImgSrc = item.image || "images/SLFlag.png";
    const itemTimeStr = timeAgo(item.date);
    const waLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(item.title + " " + item.link)}`;

    const a = document.createElement('a');
    a.href = item.link;
    a.target = "_blank";
    a.className = "news-card";

    const img = document.createElement('img');
    img.src = itemImgSrc;
    img.className = "news-img";
    img.loading = "lazy";
    img.onerror = () => { img.src = "images/SLFlag.png"; };

    const contentDiv = document.createElement('div');
    contentDiv.className = "news-content";

    const titleDiv = document.createElement('div');
    titleDiv.className = "news-title";
    titleDiv.textContent = item.title;

    const metaDiv = document.createElement('div');
    metaDiv.className = "news-meta";

    const timeSpan = document.createElement('span');
    timeSpan.textContent = itemTimeStr;

    const objectTag = document.createElement('object');
    const waAnchor = document.createElement('a');
    waAnchor.href = waLink;
    waAnchor.target = "_blank";
    waAnchor.className = "wa-icon";

    waAnchor.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
    waAnchor.insertAdjacentText('beforeend', ' Share');

    objectTag.appendChild(waAnchor);
    metaDiv.appendChild(timeSpan);
    metaDiv.appendChild(objectTag);
    contentDiv.appendChild(titleDiv);
    contentDiv.appendChild(metaDiv);
    a.appendChild(img);
    a.appendChild(contentDiv);

    return a;
}

function renderAlertsData(historyItems) {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    container.textContent = '';
    if (historyItems && historyItems.length > 0) {
        historyItems.forEach(item => {
            const card = createNewsCard(item);
            container.appendChild(card);
        });
    } else {
        container.innerHTML = '<div class="empty-state">No keyword alerts yet.</div>';
    }
}

function renderKeywords(keywordsList) {
    const div = document.getElementById('activeKeywords');
    if(!div) return;
    div.textContent = '';
    (keywordsList || []).forEach(word => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        const spanText = document.createElement('span');
        spanText.textContent = word;
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-tag';
        removeBtn.dataset.word = word;
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', (e) => removeKeyword(e.target.dataset.word));
        tag.appendChild(spanText);
        tag.appendChild(removeBtn);
        div.appendChild(tag);
    });
}

function timeAgo(dateString) {
    if (!dateString) return "Recent";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Recent";
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 30) return "Just now";
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return interval + "y ago";
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return interval + "mo ago";
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return interval + "d ago";
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return interval + "h ago";
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return interval + "m ago";
        return "Just now";
    } catch (e) { return "Recent"; }
}

function showSkeletons(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.style.display = 'flex';
    container.innerHTML = `
        <div class="sk-hero"></div>
        <div class="sk-item"><div class="sk-img"></div><div class="sk-content"><div class="sk-line"></div><div class="sk-line short"></div></div></div>
        <div class="sk-item"><div class="sk-img"></div><div class="sk-content"><div class="sk-line"></div><div class="sk-line short"></div></div></div>
    `;
}

function updateThemeIcon(isDark) {
    const btn = document.getElementById('themeBtn');
    if(!btn) return;
    const moon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    const sun = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
    btn.innerHTML = isDark ? sun : moon;
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
    updateThemeIcon(isDark);
}

function setupNav() {
    const tabs = ['btn-sinhala', 'btn-english', 'btn-alerts'];
    const views = ['view-sinhala', 'view-english', 'view-alerts'];
    tabs.forEach((id, index) => {
        const btn = document.getElementById(id);
        if(!btn) return;
        btn.addEventListener('click', () => {
            tabs.forEach(t => document.getElementById(t).classList.remove('active'));
            document.getElementById(id).classList.add('active');
            views.forEach(v => document.getElementById(v).classList.remove('active-view'));
            document.getElementById(views[index]).classList.add('active-view');
        });
    });
}

function forceRefresh() {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    showSkeletons('sinhala-loader');
    showSkeletons('english-loader');
    const sHero = document.getElementById('sinhala-hero');
    const sList = document.getElementById('sinhala-list');
    if(sHero) sHero.textContent = '';
    if(sList) sList.textContent = '';

    chrome.runtime.sendMessage({ action: "refreshNews" }, (response) => {
        loadDataAsync();
        setTimeout(() => {
            btn.classList.remove('spinning');
        }, 500);
    });
}

function addKeyword() {
    const input = document.getElementById('keywordInput');
    const word = input.value.trim();
    if (!word) return;
    chrome.storage.local.get('keywords', (data) => {
        const keywords = data.keywords || [];
        if (!keywords.some(k => k.toLowerCase() === word.toLowerCase())) {
            keywords.push(word);
            chrome.storage.local.set({ keywords }, () => renderKeywords(keywords));
        }
        input.value = '';
    });
}

function removeKeyword(word) {
    chrome.storage.local.get('keywords', (d) => {
        const keywords = d.keywords.filter(w => w !== word);
        chrome.storage.local.set({ keywords }, () => renderKeywords(keywords));
    });
}