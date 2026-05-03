// public/js/app.js — общий клиентский JS для всех страниц

// ─── API Helper ───────────────────────────────────────────────────────────────
async function apiFetch(url) {
    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

// ─── Форматирование ───────────────────────────────────────────────────────────
function fmt(n) {
    if (n == null) return '—';
    return Number(n).toLocaleString('ru-RU');
}

function fmtMoney(n) {
    if (n == null) return '0';
    return Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

// ─── Экранирование HTML ───────────────────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── Quality badge HTML ───────────────────────────────────────────────────────
const QUALITY_SHORT = {
    'Factory New':   'FN',
    'Minimal Wear':  'MW',
    'Field-Tested':  'FT',
    'Well-Worn':     'WW',
    'Battle-Scarred':'BS',
};

function qualityBadge(q) {
    if (!q) return '<span class="quality-badge">—</span>';
    const short = QUALITY_SHORT[q] || q.substring(0,2).toUpperCase();
    const cls = 'quality-' + short;
    return `<span class="quality-badge ${cls}" title="${esc(q)}">${short}</span>`;
}

// ─── Ошибка ───────────────────────────────────────────────────────────────────
function errHtml(e) {
    return `<div class="loading" style="flex-direction:column; gap:8px; color:var(--accent3);">
        <span style="font-size:2rem;">⚠️</span>
        <span>Ошибка загрузки: ${esc(e.message)}</span>
        <small class="text-muted">Проверьте подключение к БД в .env</small>
    </div>`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' error' : '') + ' show';
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── Автообновление данных каждые 30 секунд (только на главной) ──────────────
if (window.location.pathname === '/') {
    setInterval(() => {
        if (typeof loadHome === 'function') loadHome();
    }, 30000);
}
