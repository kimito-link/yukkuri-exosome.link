/**
 * Boost - 点滴・サプリ記録機能
 *
 * クリニックで受けた点滴やサプリを記録して、体内マップに反映する。
 * NMN は特別なミトコンドリア星演出が付く。
 */

const BOOST_CATEGORIES = [
    { id: 'all', name: 'すべて' },
    { id: 'iv', name: '💉 点滴' },
    { id: 'supplement', name: '🥤 サプリ' },
    { id: 'nmn', name: '⭐ NMN' }
];

const BOOST_ITEMS = [
    // ───── 点滴系 ─────
    {
        id: 'iv_exosome',
        emoji: '💉',
        name: 'エクソソーム点滴',
        category: 'iv',
        tag: 'WHOLE BODY',
        regions: ['hair', 'face', 'eyes', 'circulation', 'body', 'limbs'],
        exoBonus: 5000
    },
    {
        id: 'iv_supernatant',
        emoji: '💧',
        name: '培養上清液点滴',
        category: 'iv',
        tag: 'WHOLE BODY',
        regions: ['hair', 'face', 'eyes', 'circulation', 'body', 'limbs'],
        exoBonus: 4500
    },
    {
        id: 'iv_nmn',
        emoji: '⭐',
        name: 'NMN点滴',
        category: 'nmn',
        tag: 'NAD+ BOOST',
        regions: ['face', 'circulation', 'body'],
        exoBonus: 3500,
        isMito: true  // ミトコンドリア星演出
    },
    {
        id: 'iv_vitamin',
        emoji: '🍊',
        name: 'ビタミン点滴',
        category: 'iv',
        tag: 'SKIN + IMMUNE',
        regions: ['face', 'circulation'],
        exoBonus: 1800
    },
    {
        id: 'iv_vit_c',
        emoji: '🍋',
        name: '高濃度ビタミンC点滴',
        category: 'iv',
        tag: 'SKIN + ANTI-OX',
        regions: ['face', 'circulation', 'body'],
        exoBonus: 2400
    },
    {
        id: 'iv_white',
        emoji: '✨',
        name: '白玉点滴',
        category: 'iv',
        tag: 'SKIN',
        regions: ['face'],
        exoBonus: 1500
    },
    {
        id: 'iv_placenta',
        emoji: '🌸',
        name: 'プラセンタ点滴',
        category: 'iv',
        tag: 'WHOLE BODY',
        regions: ['face', 'circulation', 'body'],
        exoBonus: 2200
    },

    // ───── サプリ系 ─────
    {
        id: 'sup_nmn',
        emoji: '⭐',
        name: 'NMNサプリ',
        category: 'nmn',
        tag: 'NAD+',
        regions: ['face', 'body'],
        exoBonus: 600,
        isMito: true
    },
    {
        id: 'sup_exo',
        emoji: '🧬',
        name: 'エクソソームサプリ',
        category: 'supplement',
        tag: 'WHOLE BODY',
        regions: ['hair', 'face', 'body'],
        exoBonus: 800
    },
    {
        id: 'sup_resveratrol',
        emoji: '🍇',
        name: 'レスベラトロール',
        category: 'nmn',
        tag: 'SIRTUIN',
        regions: ['face', 'circulation'],
        exoBonus: 400,
        isMito: true
    },
    {
        id: 'sup_collagen',
        emoji: '🐟',
        name: 'コラーゲン',
        category: 'supplement',
        tag: 'SKIN + HAIR',
        regions: ['hair', 'face'],
        exoBonus: 350
    },
    {
        id: 'sup_placenta',
        emoji: '🌸',
        name: 'プラセンタサプリ',
        category: 'supplement',
        tag: 'WHOLE BODY',
        regions: ['face', 'body'],
        exoBonus: 400
    },
    {
        id: 'sup_multi',
        emoji: '💊',
        name: 'マルチビタミン',
        category: 'supplement',
        tag: 'BASE',
        regions: ['face', 'circulation', 'body'],
        exoBonus: 250
    },
    {
        id: 'sup_iron',
        emoji: '🩸',
        name: '鉄分・葉酸',
        category: 'supplement',
        tag: 'BLOOD',
        regions: ['circulation'],
        exoBonus: 200
    },
    {
        id: 'sup_omega',
        emoji: '🫒',
        name: 'オメガ3',
        category: 'supplement',
        tag: 'BRAIN + SKIN',
        regions: ['eyes', 'face'],
        exoBonus: 300
    },
    {
        id: 'sup_q10',
        emoji: '🟠',
        name: 'CoQ10',
        category: 'supplement',
        tag: 'ENERGY',
        regions: ['circulation', 'body'],
        exoBonus: 350
    }
];

/** 今日のキー */
function getBoostTodayKey() {
    return `boost_${getTodayKey()}`;
}

/** 今日の記録を取得 */
function getTodayBoosts() {
    return Storage.get(getBoostTodayKey(), []);
}

/** トグル（タップで記録/解除） */
function toggleBoost(itemId) {
    const today = getTodayBoosts();
    const idx = today.indexOf(itemId);
    if (idx >= 0) {
        today.splice(idx, 1);
    } else {
        today.push(itemId);
    }
    Storage.set(getBoostTodayKey(), today);
    return today.includes(itemId);
}

/** Boost合計の活性領域・粒数 */
function getBoostActiveData() {
    const today = getTodayBoosts();
    const activeRegions = new Set();
    let totalBonus = 0;
    let hasMito = false;
    today.forEach(id => {
        const item = BOOST_ITEMS.find(b => b.id === id);
        if (!item) return;
        item.regions.forEach(r => activeRegions.add(r));
        totalBonus += item.exoBonus;
        if (item.isMito) hasMito = true;
    });
    return { activeRegions, totalBonus, hasMito, items: today };
}

/** 大きなトーストでブースト演出 */
function showBoostToast(item) {
    let toast = document.querySelector('.boost-toast-big');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'boost-toast-big';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `
        <div class="boost-toast-big__emoji">${item.emoji}</div>
        <div class="boost-toast-big__title">${item.name}</div>
        <div class="boost-toast-big__sub">
            体内エクソ <strong>+${item.exoBonus.toLocaleString()}</strong> 粒
        </div>
    `;
    requestAnimationFrame(() => toast.classList.add('is-show'));
    setTimeout(() => {
        toast.classList.remove('is-show');
    }, 1800);
}
