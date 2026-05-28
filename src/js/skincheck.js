/**
 * Skin Check - 肌セルフチェック（10段階＋ガイド版）
 *
 * 評価基準は業界標準（ポーラ10段階・医療VASスケール0-10）を参考に設計。
 * 各項目の1/3/5/7/10に具体例ガイドを表示し、ブレない記録を促す。
 *
 * すべて端末内（localStorage）で完結、プライバシー◎。
 */

const SKIN_ITEMS = [
    {
        id: 'hari',
        name: 'ハリ',
        emoji: '💪',
        question: '触ったとき、押し返してくる感じは？',
        guide: {
            1:  'しぼんでる・押すと跡が残る',
            3:  '少しやわらか、もたつく',
            5:  '普通・標準的なハリ',
            7:  'ぷるんと弾力、押すと戻る',
            10: '赤ちゃん肌・最高にハリつや'
        }
    },
    {
        id: 'tomei',
        name: '透明感',
        emoji: '✨',
        question: '顔色の明るさ・くすみ具合は？',
        guide: {
            1:  'どんより、灰色がかってる',
            3:  '少しくすみ、疲れた印象',
            5:  '普通・標準的な肌色',
            7:  '澄んでる、明るい印象',
            10: '内側から発光、ガラス肌'
        }
    },
    {
        id: 'uruoi',
        name: 'うるおい',
        emoji: '💧',
        question: '水分量・しっとり感は？',
        guide: {
            1:  'カサカサ・粉吹き',
            3:  '乾燥気味、つっぱる',
            5:  '普通・標準的な水分',
            7:  'しっとり満たされてる',
            10: 'もちもち、化粧水いらず'
        }
    },
    {
        id: 'kime',
        name: 'キメ',
        emoji: '🌾',
        question: '肌表面の細かさ・なめらかさは？',
        guide: {
            1:  '毛穴目立つ・ザラつく',
            3:  '少しキメが粗い',
            5:  '普通・標準的なキメ',
            7:  '細かく整ってる',
            10: 'つるん、毛穴レス'
        }
    },
    {
        id: 'akarusa',
        name: '明るさ',
        emoji: '🌸',
        question: 'パッと見たときの肌の明るさは？',
        guide: {
            1:  'どんより暗い、シミも目立つ',
            3:  'やや暗め、まだら',
            5:  '普通・標準的な明るさ',
            7:  'パッと明るい、均一',
            10: '輝くような明るさ'
        }
    }
];

/** 今日の記録キー */
function getSkinTodayKey() {
    return `skin_${getTodayKey()}`;
}

/** 今日のスコア取得 */
function getTodaySkinScores() {
    return YEStorage.get(getSkinTodayKey(), {});
}

/** スコア設定 */
function setSkinScore(itemId, value) {
    const today = getTodaySkinScores();
    today[itemId] = value;
    YEStorage.set(getSkinTodayKey(), today);
    return today;
}

/** 合計（5項目満点 = 50） */
function getTodaySkinTotal() {
    const scores = getTodaySkinScores();
    return Object.values(scores).reduce((s, v) => s + (Number(v) || 0), 0);
}

/** 過去7日分 */
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

/** ガイドを今のスコアに合わせて取得 */
function getGuideForScore(item, value) {
    if (!value) return '';
    const keys = [1, 3, 5, 7, 10];
    let pick = 5;
    for (let i = keys.length - 1; i >= 0; i--) {
        if (value >= keys[i]) { pick = keys[i]; break; }
    }
    return item.guide[pick];
}

/** どのガイドラベル群を表示するか */
function getSkinScoreClass(value) {
    if (!value) return '';
    if (value <= 2) return 'low';
    if (value <= 4) return 'mlow';
    if (value <= 6) return 'mid';
    if (value <= 8) return 'mhigh';
    return 'high';
}

const SCORE_COLOR = {
    low:   '#b39a8b',
    mlow:  '#c9a96e',
    mid:   '#c9899a',
    mhigh: '#a8c4a2',
    high:  '#8eb4c7'
};

/**
 * Today画面に Skin Check カード（10段階版）を挿入
 */
function renderSkinCheck(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let expandedItemId = null; // タップで詳細展開

    function rebuild() {
        const today = getTodaySkinScores();
        const total = getTodaySkinTotal();
        const days = getSkin7Days();
        const maxBar = Math.max(50, ...days.map(d => d.total));
        const completedItems = SKIN_ITEMS.filter(it => today[it.id]).length;

        container.innerHTML = `
            <div class="skin-check" style="background:#fff; border-radius:22px; padding:20px; box-shadow:0 4px 20px rgba(46,38,34,.06); margin-bottom:20px;">
                <div class="skin-check__header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <div class="skin-check__title" style="font-family:'Noto Serif JP',serif; font-size:1rem; font-weight:600; letter-spacing:.08em;">本日の肌セルフチェック</div>
                    <div class="skin-check__date" style="font-size:.78rem; color:#8a7d76; font-weight:600;">
                        ${total > 0 ? `<span style="color:#c9899a; font-family:'Noto Serif JP',serif;">${total}</span> / 50` : '未記録'}
                    </div>
                </div>

                <p style="font-size:.7rem; color:#8a7d76; margin-bottom:14px; letter-spacing:.04em; line-height:1.5;">
                    各項目を <strong style="color:#a78a6b;">10段階</strong> で評価。タップでガイドが表示されます。
                </p>

                <div class="skin-check__grid" style="display:grid; gap:14px;">
                    ${SKIN_ITEMS.map(item => {
                        const cur = today[item.id];
                        const isExpanded = expandedItemId === item.id;
                        const colorKey = getSkinScoreClass(cur);
                        const accent = SCORE_COLOR[colorKey] || '#c9899a';
                        const guideText = getGuideForScore(item, cur);

                        return `
                            <div class="skin-check__item" data-item="${item.id}" style="background:#faf6f1; border-radius:14px; padding:14px; border:1px solid ${cur ? accent : '#ebe0d0'}; transition:border-color .3s;">
                                <div class="skin-check__item-head" data-toggle="${item.id}" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <span style="font-size:1.1rem;">${item.emoji}</span>
                                        <div>
                                            <div style="font-size:.92rem; font-weight:700; color:#2e2622; letter-spacing:.05em;">${item.name}</div>
                                            <div style="font-size:.7rem; color:#8a7d76; margin-top:1px;">${item.question}</div>
                                        </div>
                                    </div>
                                    <div style="text-align:right;">
                                        <div style="font-family:'Noto Serif JP',serif; font-size:1.1rem; font-weight:700; color:${accent}; line-height:1;">
                                            ${cur ? cur : '—'}<span style="font-size:.65rem; color:#8a7d76; font-weight:500;"> / 10</span>
                                        </div>
                                        <div style="font-size:.6rem; color:#8a7d76; margin-top:2px;">${isExpanded ? '▲ 閉じる' : '▼ ガイド'}</div>
                                    </div>
                                </div>

                                <!-- 10ボタン横スクロール -->
                                <div class="skin-check__slider" style="display:grid; grid-template-columns:repeat(10, 1fr); gap:3px; margin-top:10px;">
                                    ${[1,2,3,4,5,6,7,8,9,10].map(n => {
                                        const sel = cur === n;
                                        const isPivot = [1, 5, 10].includes(n);
                                        return `<button type="button" class="skin-check__dot" data-value="${n}" style="height:32px; border-radius:5px; ${sel ? `background:${accent}; color:#fff; border:none; font-weight:700;` : `background:#fff; border:1px solid ${isPivot ? '#c0b4a4' : '#ebe0d0'}; color:#8a7d76;`} cursor:pointer; font-size:.7rem; font-weight:600; display:flex; align-items:center; justify-content:center; padding:0; touch-action:manipulation;">${n}</button>`;
                                    }).join('')}
                                </div>

                                ${cur ? `
                                    <div style="margin-top:8px; padding:6px 10px; background:#fff; border-radius:8px; font-size:.78rem; color:#2e2622; border-left:3px solid ${accent}; line-height:1.5;">
                                        <strong style="color:${accent};">あなたの今 (${cur}):</strong> ${guideText}
                                    </div>
                                ` : ''}

                                ${isExpanded ? `
                                    <div style="margin-top:10px; padding:10px 12px; background:#fff; border-radius:8px; border:1px dashed #ebe0d0;">
                                        <div style="font-size:.7rem; color:#8a7d76; letter-spacing:.1em; margin-bottom:6px;">📖 評価ガイド</div>
                                        <ul style="list-style:none; padding:0; margin:0; font-size:.78rem; line-height:1.7;">
                                            ${[1, 3, 5, 7, 10].map(n => `
                                                <li style="display:flex; gap:10px; padding:2px 0;">
                                                    <span style="font-family:'Noto Serif JP',serif; font-weight:700; color:#c9899a; min-width:24px;">${n}</span>
                                                    <span style="color:#2e2622;">${item.guide[n]}</span>
                                                </li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>

                ${completedItems === SKIN_ITEMS.length ? `
                    <div style="margin-top:12px; padding:10px; background:linear-gradient(135deg, rgba(201,137,154,.08), rgba(201,169,110,.08)); border-radius:12px; text-align:center; font-size:.8rem; color:#a78a6b; letter-spacing:.05em;">
                        ✨ 本日のチェック完了 — ${total} / 50 点
                    </div>
                ` : `
                    <div style="margin-top:12px; text-align:center; font-size:.75rem; color:#8a7d76;">
                        残り ${SKIN_ITEMS.length - completedItems} 項目
                    </div>
                `}

                <div class="skin-check__history" style="margin-top:16px; padding-top:14px; border-top:1px solid #ebe0d0;">
                    <div class="skin-check__history-title" style="font-size:.72rem; color:#8a7d76; letter-spacing:.1em; margin-bottom:6px;">この1週間（スコア合計 /50）</div>
                    <div class="skin-check__history-row" style="display:flex; gap:4px; align-items:flex-end; height:40px;">
                        ${days.map(d => {
                            const h = d.hasData ? Math.max(4, (d.total / maxBar) * 40) : 4;
                            const bg = d.hasData ? 'linear-gradient(180deg,#c9899a,#c9a96e)' : '#ebe0d0';
                            return `<div class="skin-check__history-bar" style="flex:1; height:${h}px; background:${bg}; border-radius:4px 4px 0 0; min-height:4px;" title="${d.label}: ${d.total}点"></div>`;
                        }).join('')}
                    </div>
                    <div class="skin-check__history-labels" style="display:flex; gap:4px; margin-top:4px;">
                        ${days.map(d => `<div class="skin-check__history-day" style="flex:1; text-align:center; font-size:.6rem; color:${d.isToday ? '#c9899a' : '#8a7d76'}; font-weight:${d.isToday ? '700' : '400'};">${d.isToday ? '今日' : d.label}</div>`).join('')}
                    </div>
                </div>

                <div style="margin-top:10px; padding:8px; background:#faf6f1; border-radius:8px; font-size:.65rem; color:#8a7d76; line-height:1.5; letter-spacing:.03em;">
                    💡 評価基準は<strong>業界標準（ポーラ10段階・医療VAS 0-10）</strong>を参考。これは医療診断ではなく、日々の変化を見える化するためのセルフチェックです。
                </div>
            </div>
        `;

        // タップ展開
        container.querySelectorAll('[data-toggle]').forEach(head => {
            head.addEventListener('click', (e) => {
                // ボタンクリックは除外
                if (e.target.closest('.skin-check__dot')) return;
                const id = head.dataset.toggle;
                expandedItemId = (expandedItemId === id) ? null : id;
                rebuild();
            });
        });

        // ドットクリック
        container.querySelectorAll('.skin-check__dot').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrap = btn.closest('.skin-check__item');
                const itemId = wrap.dataset.item;
                const value = parseInt(btn.dataset.value, 10);
                const prev = getTodaySkinScores();
                const wasEmpty = !prev[itemId];
                setSkinScore(itemId, value);

                if (wasEmpty && typeof App !== 'undefined') {
                    App.addEP(5, 'skin_check');
                }

                rebuild();
            });
        });
    }

    rebuild();
}
