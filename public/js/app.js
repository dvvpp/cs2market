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
// ─── Покупка скина ───────────────────────────────────────────
async function buySkin(listingId, buyerId, price, skinName) {
    if (!confirm(`Подтвердите покупку "${skinName}" за ${fmtMoney(price)} ₽?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/buy/${listingId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ buyerId: buyerId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`✅ ${result.message}`, false);
            
            // Обновляем страницу через 1.5 секунды
            setTimeout(() => {
                if (typeof loadMarket === 'function') {
                    loadMarket(); // Обновляем маркет
                } else if (typeof loadHome === 'function') {
                    loadHome(); // Обновляем главную
                }
                // Обновляем баланс если есть
                if (typeof updateBalanceDisplay === 'function') {
                    updateBalanceDisplay(buyerId);
                }
            }, 1500);
        } else {
            showToast(`❌ Ошибка: ${result.error}`, true);
        }
    } catch (err) {
        console.error('Ошибка покупки:', err);
        showToast(`❌ Ошибка: ${err.message}`, true);
    }
}

// ─── Показать историю покупок ─────────────────────────────────
async function showPurchaseHistory(userId) {
    const modal = document.getElementById('history-modal');
    const content = document.getElementById('history-content');
    
    if (!modal) return;
    
    modal.style.display = 'flex';
    content.innerHTML = '<div class="loading"><div class="spinner"></div>Загрузка истории...</div>';
    
    try {
        const history = await apiFetch(`/api/user/${userId}/purchase-history`);
        
        if (!history.length) {
            content.innerHTML = '<div class="loading">📭 История покупок пуста</div>';
        } else {
            content.innerHTML = `
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Дата</th>
                                <th>Скин</th>
                                <th>Оружие</th>
                                <th>Качество</th>
                                <th>Цена</th>
                                <th>Продавец</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${history.map(item => `
                                <tr>
                                    <td class="text-sm">${new Date(item.TradeDate).toLocaleDateString('ru-RU')}</td>
                                    <td class="fw-600">${esc(item.SkinName)}</td>
                                    <td class="text-sec">${esc(item.WeaponName || '—')}</td>
                                    <td>${qualityBadge(item.Quality)}</td>
                                    <td class="td-price">${fmtMoney(item.Price)} ₽</td>
                                    <td class="text-sec">${esc(item.SellerName)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (err) {
        content.innerHTML = errHtml(err);
    }
}

// ─── Обновление баланса (временно, пока нет авторизации) ─────
async function updateBalanceDisplay(userId) {
    try {
        const user = await apiFetch(`/api/user/${userId}/balance`);
        const balanceEl = document.getElementById('user-balance');
        if (balanceEl) {
            balanceEl.textContent = fmtMoney(user.Balance) + ' ₽';
        }
    } catch (err) {
        console.error('Ошибка обновления баланса:', err);
    }
}

// ─── Закрыть модальное окно ─────────────────────────────────
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// ─── Клик вне модального окна для закрытия ─────────────────
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
