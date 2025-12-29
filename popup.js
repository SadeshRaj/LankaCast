document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Load
    loadNews();
    loadKeywords();
    loadAlertHistory();

    // 2. Tab Switching Logic
    const btnLive = document.getElementById('btn-live');
    const btnAlerts = document.getElementById('btn-alerts');
    const viewLive = document.getElementById('view-live');
    const viewAlerts = document.getElementById('view-alerts');

    btnLive.addEventListener('click', () => {
        btnLive.classList.add('active');
        btnAlerts.classList.remove('active');
        viewLive.classList.add('active-view');
        viewAlerts.classList.remove('active-view');
    });

    btnAlerts.addEventListener('click', () => {
        btnAlerts.classList.add('active');
        btnLive.classList.remove('active');
        viewAlerts.classList.add('active-view');
        viewLive.classList.remove('active-view');
    });

    // 3. Button Listeners (Fixing CSP Error)
    document.getElementById('saveBtn').addEventListener('click', addKeyword);
});

function renderNewsItem(item) {
    return `
        <a href="${item.link}" target="_blank" class="news-item">
            <img src="${item.image}" class="news-img" loading="lazy">
            <div class="news-content">
                <div class="news-title">${item.title}</div>
                <div class="news-date">${item.date}</div>
            </div>
        </a>
    `;
}

function loadNews() {
    chrome.storage.local.get('latestNews', (data) => {
        const container = document.getElementById('news-container');
        if (data.latestNews && data.latestNews.length > 0) {
            container.innerHTML = data.latestNews.map(item => renderNewsItem(item)).join('');
        } else {
            container.innerHTML = '<div class="loader">Waiting for news...</div>';
        }
    });
}

function loadAlertHistory() {
    chrome.storage.local.get('alertHistory', (data) => {
        const container = document.getElementById('alerts-container');
        if (data.alertHistory && data.alertHistory.length > 0) {
            container.innerHTML = data.alertHistory.map(item => renderNewsItem(item)).join('');
        } else {
            container.innerHTML = '<div class="loader">No alerts triggered yet.</div>';
        }
    });
}

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

            // Create span for text
            const textSpan = document.createElement('span');
            textSpan.textContent = word;

            // Create X button
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-tag';
            removeBtn.textContent = 'x';

            // Add click event securely
            removeBtn.addEventListener('click', () => removeKeyword(word));

            tag.appendChild(textSpan);
            tag.appendChild(removeBtn);
            div.appendChild(tag);
        });
    });
}

function removeKeyword(wordToRemove) {
    chrome.storage.local.get('keywords', (data) => {
        const keywords = data.keywords.filter(w => w !== wordToRemove);
        chrome.storage.local.set({ keywords }, loadKeywords);
    });
}