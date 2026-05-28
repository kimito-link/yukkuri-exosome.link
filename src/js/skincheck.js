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
            <div class="skin-check">
                <div class="skin-check__header">
                    <div class="skin-check__title">本日の肌セルフチェック</div>
                    <div class="skin-check__date">
                        ${total > 0 ? `${total} / 25` : '未記録'}
                    </div>
                </div>

                <div class="skin-check__grid">
                    ${SKIN_ITEMS.map(item => {
                        const cur = today[item.id];
                        return `
                            <div class="skin-check__item" data-item="${item.id}">
                                <div class="skin-check__item-label">
                                    <span class="skin-check__item-name">${item.name}</span>
                                    <span class="skin-check__item-value">${cur ? cur + ' / 5' : '—'}</span>
                                </div>
                                <div class="skin-check__slider">
                                    ${[1, 2, 3, 4, 5].map(n => `
                                        <button type="button" class="skin-check__dot ${cur === n ? 'is-selected' : ''}" data-value="${n}">${n}</button>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="skin-check__history">
                    <div class="skin-check__history-title">この1週間（スコア合計）</div>
                    <div class="skin-check__history-row">
                        ${days.map(d => {
                            const h = d.hasData ? Math.max(4, (d.total / maxBar) * 36) : 4;
                            return `<div class="skin-check__history-bar ${d.hasData ? '' : 'skin-check__history-bar--empty'}" style="height:${h}px" title="${d.label}: ${d.total}点"></div>`;
                        }).join('')}
                    </div>
                    <div class="skin-check__history-labels">
                        ${days.map(d => `<div class="skin-check__history-day">${d.isToday ? '今日' : d.label}</div>`).join('')}
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
