/**
 * セルフケアチェッカー
 */

/**
 * 「今日の彩り」— food 項目の中身を少しだけ深く残すためのもの。
 *
 * ★記録するのは色だけ。カロリー・グラム・体重・品目数は持たない。
 *   理由（HANDOFF-20260824.md §5 / longevity SKILL.md §4）:
 *   数量を持つ軸はどれも「減らす」語彙を招く。色だけは「もう一色足す」
 *   としか言えないので、食事を減らす方向に働かない構造にできる。
 *   肌の10段階チェックと写真記録があるアプリなので、ここは構造で守る。
 *
 * ★しろ（主食）・ちゃいろ（タンパク質）を消さないこと。
 *   野菜の色だけにすると主食とタンパク質が記録上いなくなり、
 *   暗黙の糖質制限の示唆になる。
 */
const MEAL_COLORS = [
    { id: 'green',  emoji: '🥬', label: 'みどり',   eg: '野菜・海藻' },
    { id: 'red',    emoji: '🍅', label: 'あか',     eg: 'トマト・にんじん' },
    { id: 'yellow', emoji: '🥚', label: 'きいろ',   eg: 'かぼちゃ・卵' },
    { id: 'purple', emoji: '🍆', label: 'むらさき', eg: 'なす・ベリー' },
    { id: 'white',  emoji: '🍚', label: 'しろ',     eg: 'ごはん・パン・いも' },
    { id: 'brown',  emoji: '🐟', label: 'ちゃいろ', eg: '肉・魚・豆' }
];

const SELFCARE_ITEMS = [
    {
        id: 'sleep',
        icon: '😴',
        title: '目元エクソを育てる',
        subtitle: '7時間以上の睡眠',
        desc: '深い眠りで脳と目元のエクソソーム放出が活発に。',
        region: 'eyes'
    },
    {
        id: 'skincare',
        icon: '✨',
        title: '美肌エクソを呼び込む',
        subtitle: 'ていねいなスキンケア',
        desc: '保湿と摩擦レスで肌細胞からのエクソ生成をサポート。',
        region: 'face'
    },
    {
        id: 'hair_care',
        icon: '💇',
        title: '髪エクソを守る',
        subtitle: '頭皮ケア・髪の保湿',
        desc: '頭皮マッサージで毛根エクソの流れを促す。',
        region: 'hair'
    },
    {
        id: 'water',
        icon: '💧',
        title: '循環エクソを流す',
        subtitle: '水分は1.5L以上',
        desc: '血流が良くなり、エクソが全身に届きやすくなります。',
        region: 'circulation'
    },
    {
        id: 'food',
        icon: '🥗',
        title: '腸内エクソを養う',
        subtitle: '彩りある食事',
        desc: '腸内環境が整うと、腸由来エクソの質が変わる。',
        region: 'body'
    },
    {
        id: 'exercise',
        icon: '🏃',
        title: '筋肉エクソを生成',
        subtitle: '20分以上の運動',
        desc: '運動中、筋肉細胞は活発にエクソを放出します。',
        region: 'limbs'
    }
];

// キャラのフィードバック（達成度別）
const SELFCARE_FEEDBACK = {
    0: [
        { char: 'rink', expression: 'half', text: 'まだ何もしてないのだ！今からでもひとつできることないのだ？' },
        { char: 'konta', expression: 'half', text: 'よし、まずはコップ一杯の水から始めようよ！' }
    ],
    25: [
        { char: 'rink', expression: 'normal', text: 'ちょっとずつでも進んでるのだ。ボクも頑張るのだ！' },
        { char: 'tanunee', expression: 'normal', text: 'いいスタートよ。続けることが大切ね。' }
    ],
    50: [
        { char: 'konta', expression: 'smile', text: '半分達成だね！この調子この調子！' },
        { char: 'tanunee', expression: 'smile', text: 'バランスが取れてきたわね。' }
    ],
    75: [
        { char: 'konta', expression: 'smileOpen', text: 'すごい！もうちょっとでパーフェクトだよ！' },
        { char: 'rink', expression: 'smile', text: 'みんな頑張ってるのだ！ボクも見習うのだ！' }
    ],
    100: [
        { char: 'tanunee', expression: 'smileOpen', text: 'パーフェクト！素晴らしい一日ね、よく頑張ったわ。' },
        { char: 'konta', expression: 'smileOpen', text: '100%達成！今日のキミは最高だよ！' },
        { char: 'rink', expression: 'smileOpen', text: 'すごいのだ〜！パーフェクトなのだ！' }
    ]
};

let checkedItems = new Set();

function getTodayCheckKey() {
    return `selfcare_${getTodayKey()}`;
}

/* ---- 今日の彩り（food の中身） ---------------------------------------
 * ★selfcare_YYYY-MM-DD の形（ID文字列の配列）は変えない。
 *   longevity.js / app.js / index.html / boost/index.html の4箇所が
 *   .length や includes を前提に読んでいる。彩りは別キーに置く。
 * ★配列ではなくオブジェクトで持つ。selfcare_ と取り違えて .length を
 *   呼ばれたら undefined になって目立って壊れる（静かに誤動作しない）。
 */
function getMealKey() {
    return `meal_${getTodayKey()}`;
}

function loadMeal() {
    const m = YEStorage.get(getMealKey(), null);
    if (!m || typeof m !== 'object' || Array.isArray(m)) return { colors: [], ferment: false };
    return { colors: Array.isArray(m.colors) ? m.colors : [], ferment: !!m.ferment };
}

function saveMeal(meal) {
    YEStorage.set(getMealKey(), { colors: meal.colors, ferment: meal.ferment });
}

/** パネルの開閉。renderItems() が innerHTML で作り直すので外に持つ。 */
let mealPanelOpen = false;

function loadTodayData() {
    return YEStorage.get(getTodayCheckKey(), []);
}

function saveTodayData() {
    const prev = new Set(YEStorage.get(getTodayCheckKey(), []));
    YEStorage.set(getTodayCheckKey(), Array.from(checkedItems));

    // 新しくチェックされた項目数を計算してEP付与
    if (typeof App !== 'undefined') {
        let newlyChecked = 0;
        checkedItems.forEach(id => { if (!prev.has(id)) newlyChecked++; });
        if (newlyChecked > 0) {
            const result = App.addEP(newlyChecked * EP_REWARDS.selfcare_item, 'selfcare_item');
            App.notifyEP(newlyChecked * EP_REWARDS.selfcare_item, 'セルフケア達成');
            if (result && result.leveledUp) {
                setTimeout(() => App.notifyLevelUp(result), 800);
            }
        }
        // 全部達成ボーナス
        if (checkedItems.size === SELFCARE_ITEMS.length &&
            prev.size < SELFCARE_ITEMS.length) {
            setTimeout(() => {
                const r = App.addEP(EP_REWARDS.selfcare_full, 'selfcare_full');
                App.showToast(`コンプリート！+${EP_REWARDS.selfcare_full}EP ボーナス！`, '🎊', 3000);
                if (r && r.leveledUp) setTimeout(() => App.notifyLevelUp(r), 1500);
            }, 1500);
        }
    }

    // ストリーク更新
    updateStreak();
    // 履歴更新
    updateHistory();
}

function updateStreak() {
    const score = (checkedItems.size / SELFCARE_ITEMS.length) * 100;
    const lastCheckedDate = YEStorage.get('selfcare_last_date', null);
    const today = getTodayKey();

    if (score >= 50) {
        // 50%以上で達成日扱い
        const streak = YEStorage.get('selfcare_streak', 0);
        if (lastCheckedDate !== today) {
            // 連続判定: 昨日から続いてるかチェック
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
            if (lastCheckedDate === yKey) {
                YEStorage.set('selfcare_streak', streak + 1);
            } else if (lastCheckedDate !== today) {
                YEStorage.set('selfcare_streak', 1);
            }
            YEStorage.set('selfcare_last_date', today);
        }
    }
}

function getStreak() {
    const lastDate = YEStorage.get('selfcare_last_date', null);
    const today = getTodayKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (lastDate !== today && lastDate !== yKey) {
        return 0;
    }
    return YEStorage.get('selfcare_streak', 0);
}

function renderItems() {
    const list = document.getElementById('selfcare-items');
    list.innerHTML = SELFCARE_ITEMS.map(item => `
        <label class="selfcare__item ${checkedItems.has(item.id) ? 'selfcare__item--checked' : ''}" data-id="${item.id}">
            <span class="selfcare__item-icon">${item.icon}</span>
            <div class="selfcare__item-content">
                <div class="selfcare__item-title">${item.title}</div>
                ${item.subtitle ? `<div class="selfcare__item-subtitle">${item.subtitle}</div>` : ''}
                <div class="selfcare__item-desc">${item.desc}</div>
            </div>
            <span class="selfcare__item-check"></span>
        </label>
        ${item.id === 'food' ? renderMealPanel() : ''}
    `).join('');

    document.querySelectorAll('.selfcare__item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const id = el.dataset.id;
            if (checkedItems.has(id)) {
                checkedItems.delete(id);
                // food を外したら、その日の彩りも消す（食い違いを残さない）
                if (id === 'food') saveMeal({ colors: [], ferment: false });
            } else {
                checkedItems.add(id);
            }
            saveTodayData();
            renderAll();
        });
    });

    bindMealPanel();

    // 体内マップも再描画
    if (typeof renderBodyMap === 'function') {
        renderBodyMap('selfcare-bodymap', checkedItems, 1);
    }
}

/**
 * 「今日の彩り」パネル。
 * ★<label class="selfcare__item"> の【外】に置くこと。
 *   renderItems() は label 全体にクリックを張って preventDefault() しているので、
 *   中に入れると色を押すたびに food のチェックが反転する。
 *   中の要素に selfcare__item クラスを付けないこと（同じ理由）。
 */
function renderMealPanel() {
    const meal = loadMeal();
    const n = meal.colors.length;
    const summary = n === 0 && !meal.ferment
        ? '色をえらぶ'
        : `${n > 0 ? n + '色' : ''}${meal.ferment ? (n > 0 ? '・発酵' : '発酵') : ''}`;

    return `
        <div class="meal-detail ${mealPanelOpen ? 'meal-detail--open' : ''}">
            <button type="button" class="meal-detail__toggle" data-meal-toggle>
                <span class="meal-detail__toggle-label">今日の彩り</span>
                <span class="meal-detail__toggle-value">${summary}</span>
                <span class="meal-detail__toggle-arrow">${mealPanelOpen ? '▲' : '▼'}</span>
            </button>
            ${mealPanelOpen ? `
                <div class="meal-detail__body">
                    <div class="meal-detail__grid">
                        ${MEAL_COLORS.map(c => `
                            <button type="button"
                                    class="meal-detail__chip ${meal.colors.includes(c.id) ? 'meal-detail__chip--on' : ''}"
                                    data-meal-color="${c.id}">
                                <span class="meal-detail__chip-emoji">${c.emoji}</span>
                                <span class="meal-detail__chip-label">${c.label}</span>
                                <span class="meal-detail__chip-eg">${c.eg}</span>
                            </button>
                        `).join('')}
                    </div>
                    <button type="button"
                            class="meal-detail__ferment ${meal.ferment ? 'meal-detail__ferment--on' : ''}"
                            data-meal-ferment>
                        🫙 発酵したもの（ヨーグルト・納豆・味噌など）
                    </button>
                    <p class="meal-detail__note">
                        いろいろな色の野菜や果物をとっている人ほど、健康の指標が良いという関連が観察されています。ただしこれは関連であって、色そのものが原因と確かめられたわけではありません。
                    </p>
                    <p class="meal-detail__note">
                        腸内の環境が変わると、腸から出るエクソソームの様子も変わると考えられています。ここは研究が進められている段階です。
                    </p>
                    <p class="meal-detail__note meal-detail__note--fine">
                        色の数は食事の良し悪しを測るものではありません。気になることがあるときは、医療機関で医師にご相談ください。
                    </p>
                </div>
            ` : ''}
        </div>
    `;
}

function bindMealPanel() {
    const toggle = document.querySelector('[data-meal-toggle]');
    if (toggle) {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mealPanelOpen = !mealPanelOpen;
            renderItems();
        });
    }

    document.querySelectorAll('[data-meal-color]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = btn.dataset.mealColor;
            const meal = loadMeal();
            const i = meal.colors.indexOf(id);
            if (i >= 0) meal.colors.splice(i, 1); else meal.colors.push(id);
            saveMeal(meal);
            syncFoodCheck(meal);
            renderAll();
        });
    });

    const ferment = document.querySelector('[data-meal-ferment]');
    if (ferment) {
        ferment.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const meal = loadMeal();
            meal.ferment = !meal.ferment;
            saveMeal(meal);
            syncFoodCheck(meal);
            renderAll();
        });
    }
}

/**
 * 彩りを1つでも入れたら food のチェックも付ける（二度聞かない）。
 * ★HANDOFF §7-3 と同じ「二重管理を作らない」原則。
 *   saveTodayData() は改変せず呼ぶだけ。EP・ストリーク・履歴は既存経路に乗る。
 */
function syncFoodCheck(meal) {
    const any = meal.colors.length > 0 || meal.ferment;
    if (any && !checkedItems.has('food')) {
        checkedItems.add('food');
        saveTodayData();
    }
}

function renderGauge() {
    // 体内マップに変わったので、ゲージ描画は不要。
    // renderItems の中で renderBodyMap が呼ばれている。
}

function renderFeedback() {
    const score = (checkedItems.size / SELFCARE_ITEMS.length) * 100;
    let bucket = 0;
    if (score === 100) bucket = 100;
    else if (score >= 75) bucket = 75;
    else if (score >= 50) bucket = 50;
    else if (score >= 25) bucket = 25;

    const feedbacks = SELFCARE_FEEDBACK[bucket];
    const fb = feedbacks[Math.floor(Math.random() * feedbacks.length)];
    const char = CHARACTERS[fb.char];
    const charImg = getImagePath(fb.char, fb.expression, 1);

    const el = document.getElementById('selfcare-feedback');
    el.innerHTML = `
        <img class="selfcare__feedback-char" src="${charImg}" alt="${char.name}">
        <div class="selfcare__feedback-text">
            <strong style="color: ${char.color}">${char.name}：</strong><br>
            ${fb.text}
        </div>
    `;
}

function renderStreak() {
    const streak = getStreak();
    const el = document.getElementById('selfcare-streak');
    if (streak > 0) {
        el.style.display = 'inline-block';
        el.innerHTML = `🔥 ${streak}日連続達成中`;
    } else {
        el.style.display = 'none';
    }
}

function updateHistory() {
    // 過去7日のデータ
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = `selfcare_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const data = YEStorage.get(key, []);
        const score = (data.length / SELFCARE_ITEMS.length) * 100;
        days.push({
            date: d,
            score: score,
            label: d.getDate() + '日'
        });
    }

    const grid = document.getElementById('selfcare-history-grid');
    if (grid) {
        grid.innerHTML = days.map(d => `
            <div class="selfcare__history-cell ${d.score >= 50 ? 'selfcare__history-cell--filled' : ''}" title="${d.date.toLocaleDateString()}: ${Math.round(d.score)}%">
                ${d.label}
            </div>
        `).join('');
    }
}

function renderAll() {
    renderItems();
    renderGauge();
    renderFeedback();
    renderStreak();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('selfcare-items')) {
        // 今日のデータをロード
        checkedItems = new Set(loadTodayData());
        // 日付表示
        document.getElementById('selfcare-date').textContent = '今日：' + formatDateJp();
        // 初回描画
        renderAll();
        updateHistory();
    }
});
