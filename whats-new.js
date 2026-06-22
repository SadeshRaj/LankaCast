const params = new URLSearchParams(window.location.search);
const curr = params.get('version');
const prev = params.get('prev');

if (curr) {
    const currEl = document.getElementById('curr-version');
    if (currEl) currEl.textContent = 'v' + curr;
}

if (prev) {
    const prevEl = document.getElementById('prev-version');
    if (prevEl) prevEl.textContent = 'v' + prev;
} else {
    const prevEl = document.getElementById('prev-version');
    if (prevEl) {
        prevEl.style.display = 'none';
        const arrowSpan = prevEl.nextElementSibling;
        if (arrowSpan) arrowSpan.style.display = 'none';
    }
}

const closeButton = document.getElementById('closeBtn');
if (closeButton) {
    closeButton.addEventListener('click', () => {
        window.close();
    });
}