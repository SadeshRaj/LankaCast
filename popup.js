document.addEventListener('DOMContentLoaded', () => {
    // 1. Load Data
    renderSinhala();
    renderEnglish();
    renderAlerts();
    loadKeywords();

    // 2. Tab Logic
    setupTabs();

    // 3. Add Keyword Listener
    document.getElementById('saveBtn').addEventListener('click', addKeyword);
});

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

function renderSinhala() {
    chrome.storage.local.get('sinhalaNews', (data) => {
        const container = document.getElementById('sinhala-container');
        renderList(container, data.sinhalaNews);
    });
}

function renderEnglish() {
    chrome.storage.local.get('englishNews', (data) => {
        const container = document.getElementById('english-container');
        renderList(container, data.englishNews);
    });
}

function renderAlerts() {
    chrome.storage.local.get('alertHistory', (data) => {
        const container = document.getElementById('alerts-container');
        renderList(container, data.alertHistory);
    });
}

function renderList(container, items) {
    if (items && items.length > 0) {
        container.innerHTML = items.map(item => `
            <a href="${item.link}" target="_blank" class="news-item">
                <img src="${item.image}" class="news-img" loading="lazy">
                <div class="news-content">
                    <div class="news-title">${item.title}</div>
                    <div class="news-date">${item.date}</div>
                </div>
            </a>
        `).join('');
    } else {
        container.innerHTML = '<div class="loader">No updates found.</div>';
    }
}

// --- Keyword Logic (Same as before) ---
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