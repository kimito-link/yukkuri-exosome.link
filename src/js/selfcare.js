/**
 * セルフケアチェッカー
 */

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
    `).join('');

    document.querySelectorAll('.selfcare__item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const id = el.dataset.id;
            if (checkedItems.has(id)) {
                checkedItems.delete(id);
            } else {
                checkedItems.add(id);
            }
            saveTodayData();
            renderAll();
        });
    });

    // 体内マップも再描画
    if (typeof renderBodyMap === 'function') {
        renderBodyMap('selfcare-bodymap', checkedItems, 1);
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
