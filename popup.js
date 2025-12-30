document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme
    initTheme();

    // 2. Clear Badge
    chrome.action.setBadgeText({ text: "" });

    // 3. Load Data
    renderNews('sinhalaNews', 'sinhala-container');
    renderNews('englishNews', 'english-container');
    renderNews('alertHistory', 'alerts-container');
    loadKeywords();
    setupTabs();

    // 4. Listeners
    document.getElementById('saveBtn').addEventListener('click', addKeyword);
    document.getElementById('refreshBtn').addEventListener('click', forceRefresh);
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
});

// --- FIX: Global Image Error Handler (MV3 Compliant) ---
// This listens for ANY image error on the page and fixes it.
document.addEventListener('error', (event) => {
    if (event.target.tagName.toLowerCase() === 'img') {
        // Avoid infinite loop if backup image also fails
        if (!event.target.getAttribute('data-failed')) {
            event.target.setAttribute('data-failed', 'true');
            event.target.src = 'images/SL128.png';
        }
    }
}, true); // 'true' enables capturing phase

// --- THEME LOGIC ---
function initTheme() {
    chrome.storage.local.get('theme', (data) => {
        const btn = document.getElementById('themeBtn');
        if (data.theme === 'dark') {
            document.body.classList.add('dark-mode');
            btn.textContent = "☀️";
        } else {
            document.body.classList.remove('dark-mode');
            btn.textContent = "🌙";
        }
    });
}

function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('themeBtn');
    body.classList.toggle('dark-mode');

    const isDark = body.classList.contains('dark-mode');
    const newTheme = isDark ? 'dark' : 'light';

    btn.textContent = isDark ? "☀️" : "🌙";
    chrome.storage.local.set({ theme: newTheme });
}

// --- RENDER LOGIC ---
function renderNews(storageKey, containerId) {
    chrome.storage.local.get(storageKey, (data) => {
        const container = document.getElementById(containerId);
        const items = data[storageKey];

        if (items && items.length > 0) {
            container.innerHTML = items.map(item => {
                const waLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(item.title + "\n\n" + item.link)}`;

                // NO 'onerror' HERE. The global listener handles it.
                return `
                <div class="news-item">
                    <a href="${item.link}" target="_blank" style="display:contents; color:inherit; text-decoration:none;">
                        <img src="${item.image}" class="news-img" loading="lazy">
                    </a>
                    
                    <div class="news-content">
                        <a href="${item.link}" target="_blank" style="text-decoration:none; color:inherit;">
                            <div class="news-title">${item.title}</div>
                        </a>

                        <div class="news-meta">
                            <span class="news-date">${item.date}</span>
                            <a href="${waLink}" target="_blank" class="wa-share" title="Share on WhatsApp">
                                <span>➦</span> WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        } else {
            container.innerHTML = '<div class="loader">Waiting for updates...</div>';
        }
    });
}

// --- FORCE REFRESH ---
function forceRefresh() {
    const btn = document.getElementById('refreshBtn');
    const containerSi = document.getElementById('sinhala-container');

    btn.style.transform = "rotate(360deg)";
    containerSi.style.opacity = "0.5";

    chrome.runtime.sendMessage({ action: "refreshNews" }, () => {
        setTimeout(() => {
            renderNews('sinhalaNews', 'sinhala-container');
            renderNews('englishNews', 'english-container');
            containerSi.style.opacity = "1";
            btn.style.transform = "rotate(0deg)";
        }, 1000);
    });
}

// --- TAB LOGIC ---
function setupTabs() {
    const btnSi = document.getElementById('btn-sinhala');
    const btnEn = document.getElementById('btn-english');
    const btnAl = document.getElementById('btn-alerts');

    const viewSi = document.getElementById('view-sinhala');
    const viewEn = document.getElementById('view-english');
    const viewAl = document.getElementById('view-alerts');

    btnSi.addEventListener('click', () => switchTab(btnSi, viewSi, [btnEn, btnAl], [viewEn, viewAl]));
    btnEn.addEventListener('click', () => switchTab(btnEn, viewEn, [btnSi, btnAl], [viewSi, viewAl]));
    btnAl.addEventListener('click', () => switchTab(btnAl, viewAl, [btnSi, btnEn], [viewSi, viewEn]));
}

function switchTab(activeBtn, activeView, otherBtns, otherViews) {
    activeBtn.classList.add('active');
    activeView.classList.add('active-view');
    otherBtns.forEach(b => b.classList.remove('active'));
    otherViews.forEach(v => v.classList.remove('active-view'));
}

// --- KEYWORDS ---
function addKeyword() {
    const input = document.getElementById('keywordInput');
    const word = input.value.trim();
    if (!word) return;

    chrome.storage.local.get('keywords', (data) => {
        const keywords = data.keywords || [];
        if (!keywords.includes(word)) {
            keywords.push(word);
            chrome.storage.local.set({ keywords }, loadKeywords);
        }
        input.value = '';
    });
}

function loadKeywords() {
    chrome.storage.local.get('keywords', (data) => {
        const div = document.getElementById('activeKeywords');
        div.innerHTML = '';
        (data.keywords || []).forEach(word => {
            const tag = document.createElement('div');
            tag.className = 'tag';

            const span = document.createElement('span');
            span.textContent = word;

            const remove = document.createElement('span');
            remove.className = 'remove-tag';
            remove.textContent = 'x';
            remove.addEventListener('click', () => removeKeyword(word));

            tag.append(span, remove);
            div.appendChild(tag);
        });
    });
}

function removeKeyword(word) {
    chrome.storage.local.get('keywords', (d) => {
        const keywords = d.keywords.filter(w => w !== word);
        chrome.storage.local.set({ keywords }, loadKeywords);
    });
}