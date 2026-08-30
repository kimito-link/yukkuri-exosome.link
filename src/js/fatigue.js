/**
 * Fatigue Check - 疲労回復度チェック
 *
 * 監修医からのリクエストで実装。
 * 「疲労回復度とかもええすね」
 *
 * 上田実先生の本でも、培養上清治療による慢性疲労の改善が
 * 言及されている。エクソソーム/サイトカインによるインナー
 * ケアの結果を、日々の体感で見える化する。
 *
 * 肌セルフチェックと同じ 10段階＋具体例ガイド方式。
 */

const FATIGUE_ITEMS = [
    {
        id: 'sleep_quality',
        name: '睡眠の質',
        emoji: '😴',
        question: '今朝の目覚めはどうでしたか？',
        guide: {
            1:  '起きられない・体が重い',
            3:  '起きるのがつらい',
            5:  '普通に起きられる',
            7:  'スッキリ目覚めた',
            10: '深く眠れて、完全に回復'
        }
    },
    {
        id: 'energy',
        name: 'エネルギー',
        emoji: '⚡',
        question: '日中、体は動かせていますか？',
        guide: {
            1:  '一日中だるい・横になりたい',
            3:  '動くのが億劫',
            5:  '普通に動ける',
            7:  '体が軽い・前向きに動ける',
            10: 'パワー全開・元気いっぱい'
        }
    },
    {
        id: 'focus',
        name: '集中力',
        emoji: '🧠',
        question: '頭の冴え・思考のクリアさは？',
        guide: {
            1:  'ぼんやり・思考停止',
            3:  '集中が続かない',
            5:  '普通に集中できる',
            7:  '頭がクリア・冴えてる',
            10: '集中力MAX・サクサク捗る'
        }
    },
    {
        id: 'muscle',
        name: '筋肉・体の軽さ',
        emoji: '💪',
        question: '肩・腰・足のだるさは？',
        guide: {
            1:  'ガチガチ・全身重い',
            3:  '肩こり腰痛がつらい',
            5:  '普通・少しこってる',
            7:  '体が軽い・スッと動く',
            10: '完全にほぐれてる・しなやか'
        }
    },
    {
        id: 'recovery',
        name: '回復力',
        emoji: '🌙',
        question: '昨日の疲れ、抜けてますか？',
        guide: {
            1:  '疲れが朝まで残ってる',
            3:  '半分残ってる',
            5:  '普通に回復した',
            7:  'スッと抜けた',
            10: '完全リセット・別人みたい'
        }
    }
];

/** 今日のキー */
function getFatigueTodayKey() {
    return `fatigue_${getTodayKey()}`;
}

function getTodayFatigueScores() {
    return YEStorage.get(getFatigueTodayKey(), {});
}

function setFatigueScore(itemId, value) {
    const today = getTodayFatigueScores();
    today[itemId] = value;
    YEStorage.set(getFatigueTodayKey(), today);
    return today;
}

function getTodayFatigueTotal() {
    const scores = getTodayFatigueScores();
    return Object.values(scores).reduce((s, v) => s + (Number(v) || 0), 0);
}

function getFatigue7Days() {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = `fatigue_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

function getFatigueGuideForScore(item, value) {
    if (!value) return '';
    const keys = [1, 3, 5, 7, 10];
    let pick = 5;
    for (let i = keys.length - 1; i >= 0; i--) {
        if (value >= keys[i]) { pick = keys[i]; break; }
    }
    return item.guide[pick];
}

function getFatigueScoreClass(value) {
    if (!value) return '';
    if (value <= 2) return 'low';
    if (value <= 4) return 'mlow';
    if (value <= 6) return 'mid';
    if (value <= 8) return 'mhigh';
    return 'high';
}

const FATIGUE_COLOR = {
    low:   '#b39a8b',
    mlow:  '#c9a96e',
    mid:   '#8eb4c7',
    mhigh: '#a8c4a2',
    high:  '#7ca97a'  // 緑系（高いほど元気）
};

/**
 * Today画面に Fatigue Check カードを挿入
 */
function renderFatigueCheck(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let expandedItemId = null;

    function rebuild() {
        const today = getTodayFatigueScores();
        const total = getTodayFatigueTotal();
        const days = getFatigue7Days();
        const maxBar = Math.max(50, ...days.map(d => d.total));
        const completedItems = FATIGUE_ITEMS.filter(it => today[it.id]).length;

        // 平均ステータス（メッセージ）
        let avgMsg = '';
        if (completedItems === FATIGUE_ITEMS.length) {
            const avg = total / FATIGUE_ITEMS.length;
            if (avg >= 8) avgMsg = '✨ 絶好調！今日も元気に。';
            else if (avg >= 6) avgMsg = '🌿 良い状態をキープ。';
            else if (avg >= 4) avgMsg = '🌙 ふつう。無理しないで。';
            else avgMsg = '🛏 お疲れさま。今日は休んで。';
        }

        container.innerHTML = `
            <div class="fatigue-check" style="background:#fff; border-radius:22px; padding:20px; box-shadow:0 4px 20px rgba(46,38,34,.06); margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <div style="font-family:'Noto Serif JP',serif; font-size:1rem; font-weight:600; letter-spacing:.08em;">
                        🩺 本日の疲労回復度
                    </div>
                    <div style="font-size:.78rem; color:#8a7d76; font-weight:600;">
                        ${total > 0 ? `<span style="color:#7ca97a; font-family:'Noto Serif JP',serif;">${total}</span> / 50` : '未記録'}
                    </div>
                </div>

                <p style="font-size:.7rem; color:#8a7d76; margin-bottom:14px; letter-spacing:.04em; line-height:1.5;">
                    点滴・サプリ・睡眠の効果を、体感で見える化。<br>
                    数字が<strong style="color:#7ca97a;">高いほど元気</strong>です（1=疲れ / 10=絶好調）。
                </p>

                <div style="display:grid; gap:14px;">
                    ${FATIGUE_ITEMS.map(item => {
                        const cur = today[item.id];
                        const isExpanded = expandedItemId === item.id;
                        const colorKey = getFatigueScoreClass(cur);
                        const accent = FATIGUE_COLOR[colorKey] || '#8eb4c7';
                        const guideText = getFatigueGuideForScore(item, cur);

                        return `
                            <div class="fatigue-item" data-item="${item.id}" style="background:#faf6f1; border-radius:14px; padding:14px; border:1px solid ${cur ? accent : '#ebe0d0'}; transition:border-color .3s;">
                                <div data-fatigue-toggle="${item.id}" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
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

                                <div style="display:grid; grid-template-columns:repeat(10, 1fr); gap:3px; margin-top:10px;">
                                    ${[1,2,3,4,5,6,7,8,9,10].map(n => {
                                        const sel = cur === n;
                                        const isPivot = [1, 5, 10].includes(n);
                                        return `<button type="button" class="fatigue-dot" data-value="${n}" style="height:32px; border-radius:5px; ${sel ? `background:${accent}; color:#fff; border:none; font-weight:700;` : `background:#fff; border:1px solid ${isPivot ? '#c0b4a4' : '#ebe0d0'}; color:#8a7d76;`} cursor:pointer; font-size:.7rem; font-weight:600; display:flex; align-items:center; justify-content:center; padding:0; touch-action:manipulation;">${n}</button>`;
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
                                                    <span style="font-family:'Noto Serif JP',serif; font-weight:700; color:#7ca97a; min-width:24px;">${n}</span>
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

                ${completedItems === FATIGUE_ITEMS.length ? `
                    <div style="margin-top:12px; padding:10px; background:linear-gradient(135deg, rgba(124,169,122,.08), rgba(142,180,199,.08)); border-radius:12px; text-align:center; font-size:.85rem; color:#7ca97a; letter-spacing:.05em; font-weight:600;">
                        ${avgMsg} (${total} / 50)
                    </div>
                ` : `
                    <div style="margin-top:12px; text-align:center; font-size:.75rem; color:#8a7d76;">
                        残り ${FATIGUE_ITEMS.length - completedItems} 項目
                    </div>
                `}

                <div style="margin-top:16px; padding-top:14px; border-top:1px solid #ebe0d0;">
                    <div style="font-size:.72rem; color:#8a7d76; letter-spacing:.1em; margin-bottom:6px;">この1週間（合計 /50）</div>
                    <div style="display:flex; gap:4px; align-items:flex-end; height:40px;">
                        ${days.map(d => {
                            const h = d.hasData ? Math.max(4, (d.total / maxBar) * 40) : 4;
                            const bg = d.hasData ? 'linear-gradient(180deg,#7ca97a,#8eb4c7)' : '#ebe0d0';
                            return `<div style="flex:1; height:${h}px; background:${bg}; border-radius:4px 4px 0 0; min-height:4px;" title="${d.label}: ${d.total}点"></div>`;
                        }).join('')}
                    </div>
                    <div style="display:flex; gap:4px; margin-top:4px;">
                        ${days.map(d => `<div style="flex:1; text-align:center; font-size:.6rem; color:${d.isToday ? '#7ca97a' : '#8a7d76'}; font-weight:${d.isToday ? '700' : '400'};">${d.isToday ? '今日' : d.label}</div>`).join('')}
                    </div>
                </div>

                <div style="margin-top:10px; padding:8px; background:#faf6f1; border-radius:8px; font-size:.65rem; color:#8a7d76; line-height:1.5; letter-spacing:.03em;">
                    💡 点滴やNMN・サプリの<strong>「効いてる感」</strong>を見える化。Boostタブの記録と並べて変化を観察できます。
                </div>
            </div>
        `;

        // タップ展開
        container.querySelectorAll('[data-fatigue-toggle]').forEach(head => {
            head.addEventListener('click', (e) => {
                if (e.target.closest('.fatigue-dot')) return;
                const id = head.dataset.fatigueToggle;
                expandedItemId = (expandedItemId === id) ? null : id;
                rebuild();
            });
        });

        // ドットクリック
        container.querySelectorAll('.fatigue-dot').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wrap = btn.closest('.fatigue-item');
                const itemId = wrap.dataset.item;
                const value = parseInt(btn.dataset.value, 10);
                const prev = getTodayFatigueScores();
                const wasEmpty = !prev[itemId];
                setFatigueScore(itemId, value);

                if (wasEmpty && typeof App !== 'undefined') {
                    App.addEP(5, 'fatigue_check');
                }

                rebuild();
            });
        });
    }

    rebuild();
}
