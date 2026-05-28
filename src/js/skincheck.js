/**
 * Skin Check - 肌セルフチェック
 *
 * 5項目を1〜5でスコア化して、毎日記録。
 * 7日間のグラフ表示で変化を実感できる。
 * 全てローカル保存（プライバシー◎）。
 */

const SKIN_ITEMS = [
    { id: 'hari',       name: 'ハリ',     hint: '5=ぷるぷる / 1=しぼんでる' },
    { id: 'tomei',      name: '透明感',   hint: '5=澄んでる / 1=くすみ' },
    { id: 'uruoi',      name: 'うるおい', hint: '5=しっとり / 1=乾燥' },
    { id: 'kime',       name: 'キメ',     hint: '5=ととのってる / 1=粗い' },
    { id: 'kusumi',     name: '明るさ',   hint: '5=ぱっと明るい / 1=どんより' }
];

/** 今日の記録キー */
function getSkinTodayKey() {
    return `skin_${getTodayKey()}`;
}

/** 今日のスコア取得（無ければ空オブジェクト） */
function getTodaySkinScores() {
    return YEStorage.get(getSkinTodayKey(), {});
}

/** スコアを設定（特定項目） */
function setSkinScore(itemId, value) {
    const today = getTodaySkinScores();
    today[itemId] = value;
    YEStorage.set(getSkinTodayKey(), today);
    return today;
}

/** 今日のスコア合計（5項目満点25） */
function getTodaySkinTotal() {
    const scores = getTodaySkinScores();
    return Object.values(scores).reduce((s, v) => s + (Number(v) || 0), 0);
}

/** 過去7日分のスコア（古い→新しい） */
function getSkin7Days() {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = `skin_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const scores = YEStorage.get(key, {});
        const total = Object.values(scores).reduce((s, v) => s + (Number(v) || 0), 0);
        days.push({
            date: d,
            label: d.getDate() + '日',
            total: total,
            isToday: i === 0,
            hasData: Object.keys(scores).length > 0
        });
    }
    return days;
}

/**
 * Today画面に Skin Check カードを挿入
 * @param {string} containerId
 */
function renderSkinCheck(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    function rebuild() {
        const today = getTodaySkinScores();
        const total = getTodaySkinTotal();
        const days = getSkin7Days();
        const maxBar = Math.max(25, ...days.map(d => d.total));

        container.innerHTML = `
            <div class="skin-check" style="background:#fff; border-radius:22px; padding:20px; box-shadow:0 4px 20px rgba(46,38,34,.06); margin-bottom:20px;">
                <div class="skin-check__header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                    <div class="skin-check__title" style="font-family:'Noto Serif JP',serif; font-size:1rem; font-weight:600; letter-spacing:.08em;">本日の肌セルフチェック</div>
                    <div class="skin-check__date" style="font-size:.75rem; color:#8a7d76;">
                        ${total > 0 ? `${total} / 25` : '未記録'}
                    </div>
                </div>

                <div class="skin-check__grid" style="display:grid; gap:10px;">
                    ${SKIN_ITEMS.map(item => {
                        const cur = today[item.id];
                        return `
                            <div class="skin-check__item" data-item="${item.id}" style="background:#f4ede4; border-radius:12px; padding:10px 14px;">
                                <div class="skin-check__item-label" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <span class="skin-check__item-name" style="font-size:.85rem; font-weight:600; color:#2e2622;">${item.name}</span>
                                    <span class="skin-check__item-value" style="font-family:'Noto Serif JP',serif; font-size:.85rem; font-weight:700; color:#c9899a;">${cur ? cur + ' / 5' : '—'}</span>
                                </div>
                                <div class="skin-check__slider" style="display:flex; gap:4px;">
                                    ${[1, 2, 3, 4, 5].map(n => {
                                        const sel = cur === n;
                                        return `<button type="button" class="skin-check__dot ${sel ? 'is-selected' : ''}" data-value="${n}" style="flex:1; height:28px; border-radius:6px; ${sel ? 'background:linear-gradient(135deg,#c9899a,#c9a96e); color:#fff; border:none;' : 'background:#fff; border:1.5px solid #ebe0d0; color:#8a7d76;'} cursor:pointer; font-size:.72rem; font-weight:600; display:flex; align-items:center; justify-content:center; padding:0;">${n}</button>`;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="skin-check__history" style="margin-top:14px; padding-top:14px; border-top:1px solid #ebe0d0;">
                    <div class="skin-check__history-title" style="font-size:.72rem; color:#8a7d76; letter-spacing:.1em; margin-bottom:6px;">この1週間（スコア合計）</div>
                    <div class="skin-check__history-row" style="display:flex; gap:4px; align-items:flex-end; height:36px;">
                        ${days.map(d => {
                            const h = d.hasData ? Math.max(4, (d.total / maxBar) * 36) : 4;
                            const bg = d.hasData ? 'linear-gradient(180deg,#c9899a,#c9a96e)' : '#ebe0d0';
                            return `<div class="skin-check__history-bar" style="flex:1; height:${h}px; background:${bg}; border-radius:4px 4px 0 0; min-height:4px;" title="${d.label}: ${d.total}点"></div>`;
                        }).join('')}
                    </div>
                    <div class="skin-check__history-labels" style="display:flex; gap:4px; margin-top:4px;">
                        ${days.map(d => `<div class="skin-check__history-day" style="flex:1; text-align:center; font-size:.6rem; color:#8a7d76;">${d.isToday ? '今日' : d.label}</div>`).join('')}
                    </div>
                </div>
            </div>
        `;

        // クリックハンドラ
        container.querySelectorAll('.skin-check__dot').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrap = btn.closest('.skin-check__item');
                const itemId = wrap.dataset.item;
                const value = parseInt(btn.dataset.value, 10);
                const prev = getTodaySkinScores();
                const wasEmpty = !prev[itemId];
                setSkinScore(itemId, value);

                // 初回入力時のみEP獲得
                if (wasEmpty && typeof App !== 'undefined') {
                    App.addEP(5, 'skin_check');
                }

                rebuild();
            });
        });
    }

    rebuild();
}
