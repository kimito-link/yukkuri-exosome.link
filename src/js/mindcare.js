/**
 * Mind & Social Care - 心と社会のケア（つながり・生きがい）
 *
 * 動画「ロンジェビティ・スキル」の7つの柱
 *   食事・睡眠・運動・つながり・医療・美容・生きがい
 * のうち、既存の Care（髪/美肌/目元/循環/腸内/筋肉）＋睡眠ログ で
 * 身体面はカバー済み。ここで残りの「つながり」と「生きがい」を補い、
 * 7大スキルを完成させる。
 *
 * 身体ケア（体内マップ連動・部位あり）とは性質が違う（心・社会面）ので、
 * SELFCARE_ITEMS には混ぜず、独立カードとして Today に置く。
 * これにより体内マップ・活性日スコアの既存ロジックを壊さない。
 *
 * データ構造（YEStorage, キー = mindcare_YYYY-MM-DD）:
 *   ["connect_talk", "ikigai_learn", ...]  // チェック済み項目IDの配列
 */

const MINDCARE_ITEMS = [
    // --- つながり（ソーシャルコネクション）---
    {
        id: 'connect_talk',
        group: 'つながり',
        icon: '💬',
        title: '誰かと楽しく話した',
        desc: '家族・友人との会話は、孤独を防ぐいちばんの薬。'
    },
    {
        id: 'connect_reach',
        group: 'つながり',
        icon: '🤝',
        title: '人やコミュニティに関わった',
        desc: '連絡・参加・ありがとう。小さなつながりが寿命を支える。'
    },
    // --- 生きがい（心の健康・学び）---
    {
        id: 'ikigai_learn',
        group: '生きがい',
        icon: '📖',
        title: '何か新しいことを学んだ',
        desc: '学び続ける脳は若い。リスキリングは長寿スキルの柱。'
    },
    {
        id: 'ikigai_step',
        group: '生きがい',
        icon: '🎯',
        title: '自分の目標に一歩近づいた',
        desc: '「生きがい」がある人ほど健康寿命が長いという研究も。'
    }
];

const MINDCARE_GROUP_COLOR = {
    'つながり': '#c9899a',  // くすみローズ
    '生きがい': '#a78a6b'   // ベージュブラウン
};

// kimito.link 送客導線（つながりグループの下に表示）。
// linktree 本体(kimito.link)は X 含む SNS のハブなので、ここが新規ユーザー獲得の主導線。
// すれ違い通信のような重いバックエンドは使わず、リンクで連携する軽量版。
const KIMITO_LINK_URL = 'https://kimito.link/';
const KIMITO_X_SHARE_TEXT = '今日もゆっくりエクソソームでセルフケア中🌿 #ゆっくりエクソ #エクソソーム';
function getKimitoXIntentUrl() {
    const text = encodeURIComponent(KIMITO_X_SHARE_TEXT);
    const url = encodeURIComponent(KIMITO_LINK_URL);
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
}

/** 今日のキー */
function getMindcareTodayKey() {
    return `mindcare_${getTodayKey()}`;
}

function getTodayMindcare() {
    return new Set(YEStorage.get(getMindcareTodayKey(), []));
}

function setTodayMindcare(set) {
    YEStorage.set(getMindcareTodayKey(), Array.from(set));
}

/** 指定日のチェック数（スコア集計用に他widgetからも使う） */
function getMindcareCountForKey(dateKey) {
    return (YEStorage.get(`mindcare_${dateKey}`, []) || []).length;
}

/**
 * Today画面に Mind & Social Care カードを挿入
 */
function renderMindCare(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    function rebuild() {
        const checked = getTodayMindcare();
        const total = MINDCARE_ITEMS.length;
        const done = MINDCARE_ITEMS.filter(it => checked.has(it.id)).length;

        // グループごとに並べる
        const groups = ['つながり', '生きがい'];

        container.innerHTML = `
            <div class="mindcare" style="background:#fff; border-radius:22px; padding:20px; box-shadow:0 4px 20px rgba(46,38,34,.06); margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <div style="font-family:'Noto Serif JP',serif; font-size:1rem; font-weight:600; letter-spacing:.08em;">
                        🌷 心と社会のケア
                    </div>
                    <div style="font-size:.78rem; color:#8a7d76; font-weight:600;">
                        ${done > 0 ? `<span style="color:#c9899a; font-family:'Noto Serif JP',serif;">${done}</span> / ${total}` : '未記録'}
                    </div>
                </div>

                <p style="font-size:.7rem; color:#8a7d76; margin-bottom:14px; letter-spacing:.04em; line-height:1.5;">
                    長寿スキルは体だけじゃない。<strong style="color:#c9899a;">つながり</strong>と<strong style="color:#a78a6b;">生きがい</strong>が、<br>
                    人生120年時代の健康寿命を支えます。
                </p>

                ${groups.map(g => {
                    const items = MINDCARE_ITEMS.filter(it => it.group === g);
                    const accent = MINDCARE_GROUP_COLOR[g];
                    return `
                        <div style="margin-bottom:12px;">
                            <div style="font-size:.72rem; font-weight:700; color:${accent}; letter-spacing:.12em; margin-bottom:6px;">${g === 'つながり' ? '🤝' : '✨'} ${g}</div>
                            <div style="display:grid; gap:8px;">
                                ${items.map(item => {
                                    const on = checked.has(item.id);
                                    return `
                                        <button type="button" class="mindcare-item" data-id="${item.id}" style="display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:${on ? accent + '14' : '#faf6f1'}; border:1px solid ${on ? accent : '#ebe0d0'}; border-radius:14px; padding:12px 14px; cursor:pointer; transition:all .2s; touch-action:manipulation;">
                                            <span style="font-size:1.15rem; flex:0 0 auto;">${item.icon}</span>
                                            <span style="flex:1; min-width:0;">
                                                <span style="display:block; font-size:.9rem; font-weight:700; color:#2e2622;">${item.title}</span>
                                                <span style="display:block; font-size:.68rem; color:#8a7d76; margin-top:2px; line-height:1.4;">${item.desc}</span>
                                            </span>
                                            <span style="flex:0 0 auto; width:24px; height:24px; border-radius:50%; border:2px solid ${on ? accent : '#d8cbbb'}; background:${on ? accent : 'transparent'}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:.8rem; font-weight:700;">${on ? '✓' : ''}</span>
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                            ${g === 'つながり' ? `
                                <div style="margin-top:8px; padding:12px 14px; background:#faf6f1; border:1px dashed ${accent}; border-radius:14px;">
                                    <div style="font-size:.7rem; color:#2e2622; line-height:1.5; margin-bottom:8px;">
                                        🌐 Kimito-Link で、推しやなかまとつながろう。
                                    </div>
                                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                        <a href="${KIMITO_LINK_URL}" target="_blank" rel="noopener" class="mindcare-connect" data-connect="kimito" style="flex:1 1 auto; text-align:center; padding:10px 12px; background:linear-gradient(135deg,#c9899a,#a78a6b); color:#fff; border-radius:999px; font-size:.78rem; font-weight:700; letter-spacing:.04em; text-decoration:none; touch-action:manipulation;">kimito.link を開く</a>
                                        <a href="${getKimitoXIntentUrl()}" target="_blank" rel="noopener" class="mindcare-connect" data-connect="x" style="flex:0 0 auto; text-align:center; padding:10px 14px; background:#fff; color:#2e2622; border:1px solid #d8cbbb; border-radius:999px; font-size:.78rem; font-weight:700; letter-spacing:.04em; text-decoration:none; touch-action:manipulation;">𝕏 でつぶやく</a>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}

                ${done === total ? `
                    <div style="margin-top:6px; padding:10px; background:linear-gradient(135deg, rgba(201,137,154,.1), rgba(167,138,107,.1)); border-radius:12px; text-align:center; font-size:.85rem; color:#c9899a; letter-spacing:.05em; font-weight:600;">
                        🌟 心も社会も満たされた一日。7大スキル、まるごとケアできてる！
                    </div>
                ` : `
                    <div style="margin-top:4px; text-align:center; font-size:.72rem; color:#8a7d76;">
                        ひとつでも当てはまったらタップ。完璧じゃなくて大丈夫。
                    </div>
                `}
            </div>
        `;

        // チェック切り替え
        container.querySelectorAll('.mindcare-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const set = getTodayMindcare();
                const wasOff = !set.has(id);
                if (set.has(id)) set.delete(id);
                else set.add(id);
                setTodayMindcare(set);

                // 新規チェックのみ +5 EP（外すと戻さない方針＝二重取り防止のためチェック時のみ加算）
                if (wasOff && typeof App !== 'undefined') {
                    App.addEP(5, 'mindcare');
                    if (typeof App.notifyEP === 'function') App.notifyEP(5, '心のケア');
                }
                rebuild();

                // 心のケアはロンジェビティ・スコアの一部なので、スコア表示も更新
                if (typeof renderLongevityScore === 'function' && document.getElementById('today-longevity')) {
                    renderLongevityScore('today-longevity');
                }
            });
        });

        // kimito.link / X 導線：開いたら「人やコミュニティに関わった」を記録扱いにする。
        // リンクの遷移自体は target=_blank で通常どおり行わせる（preventDefault しない）。
        container.querySelectorAll('.mindcare-connect').forEach(link => {
            link.addEventListener('click', () => {
                const set = getTodayMindcare();
                if (!set.has('connect_reach')) {
                    set.add('connect_reach');
                    setTodayMindcare(set);
                    if (typeof App !== 'undefined') {
                        App.addEP(5, 'mindcare');
                        if (typeof App.notifyEP === 'function') App.notifyEP(5, 'つながり');
                    }
                    // 新しいタブが開くので描画更新は次回表示時で十分だが、戻ってきた時のために更新しておく
                    setTimeout(() => {
                        rebuild();
                        if (typeof renderLongevityScore === 'function' && document.getElementById('today-longevity')) {
                            renderLongevityScore('today-longevity');
                        }
                    }, 0);
                }
            });
        });
    }

    rebuild();
}
