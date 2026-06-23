/**
 * Garden 画面（育成・バッジ）
 */

const BADGES = [
    { id: 'first_login',  emoji: '🎉', name: 'はじめの一歩', desc: '初めてのログイン', check: () => YEStorage.get('app_ep', 0) > 0 },
    { id: 'streak_3',     emoji: '🔥', name: '3日達成',       desc: '3日連続',          check: () => YEStorage.get('app_streak', 0) >= 3 || YEStorage.get('badge_streak_3', false) },
    { id: 'streak_7',     emoji: '🌟', name: '一週間',         desc: '7日連続',          check: () => YEStorage.get('app_streak', 0) >= 7 || YEStorage.get('badge_streak_7', false) },
    { id: 'streak_30',    emoji: '💎', name: 'ひと月',         desc: '30日連続',         check: () => YEStorage.get('app_streak', 0) >= 30 || YEStorage.get('badge_streak_30', false) },
    { id: 'level_5',      emoji: '⭐', name: 'Lv.5到達',      desc: 'レベル5',          check: () => App.getLevel().lv >= 5 },
    { id: 'level_10',     emoji: '✨', name: 'Lv.10到達',     desc: 'レベル10',         check: () => App.getLevel().lv >= 10 },
    { id: 'level_20',     emoji: '🌸', name: 'Lv.20到達',     desc: 'レベル20',         check: () => App.getLevel().lv >= 20 },
    { id: 'level_30',     emoji: '🌌', name: 'マスター',       desc: 'レベル30',         check: () => App.getLevel().lv >= 30 },
    { id: 'quiz_perfect', emoji: '🧠', name: 'クイズ満点',     desc: '全問正解',         check: () => { const t = (typeof QUIZ_QUESTIONS !== 'undefined') ? QUIZ_QUESTIONS.length : 10; return YEStorage.get('quiz_best', 0) >= t; } },
    { id: 'care_50',      emoji: '🌿', name: 'ケア50日',       desc: '累計50日',         check: () => YEStorage.get('app_total_days', 0) >= 50 },
    { id: 'care_100',     emoji: '🏆', name: 'ケア100日',      desc: '累計100日',        check: () => YEStorage.get('app_total_days', 0) >= 100 },
    { id: 'advice_10',    emoji: '💬', name: 'アドバイス10回', desc: 'アドバイス10回',   check: () => YEStorage.get('advice_count', 0) >= 10 },
    // --- 学び・つながり（ロンジェビティ）系バッジ ---
    { id: 'mind_first',   emoji: '🌷', name: '心のケア',       desc: '心と社会のケアを初記録', check: () => (typeof getMindLearnDays === 'function') && getMindLearnDays() >= 1 },
    { id: 'learn_7',      emoji: '📚', name: 'いきいき脳',     desc: '学び・生きがいを7日',   check: () => (typeof getMindLearnDays === 'function') && getMindLearnDays() >= 7 }
];

/**
 * 「心と社会のケア（生きがい/学び）」を記録した日数を数える。
 * mindcare の保存キー（mindcare_YYYY-MM-DD）を直近90日ぶん走査。
 * mindcare.js が読み込まれていなくても動くよう、ストレージを直接見る。
 */
function getMindLearnDays() {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 90; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = `mindcare_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const arr = YEStorage.get(key, []);
        if (Array.isArray(arr) && arr.length > 0) count++;
    }
    return count;
}

const STAGE_NAMES = {
    egg: 'たまご期',
    sprout: 'めばえ期',
    bloom: '満開期',
    galaxy: '銀河期'
};

const STAGE_EMOJI = {
    egg: '🥚',
    sprout: '🌱',
    bloom: '🌸',
    galaxy: '🌌'
};

(function() {
    const lv = App.getLevel();
    const stage = lv.stage;
    const stageEmoji = STAGE_EMOJI[stage];
    const stageName = STAGE_NAMES[stage];

    // バッジ取得チェック（取得済みフラグを保存）
    const earnedBadges = [];
    BADGES.forEach(b => {
        const earned = b.check();
        if (earned) {
            // 連続日数バッジは取れたら永続保存（リセットされても残す）
            if (b.id === 'streak_3') YEStorage.set('badge_streak_3', true);
            if (b.id === 'streak_7') YEStorage.set('badge_streak_7', true);
            if (b.id === 'streak_30') YEStorage.set('badge_streak_30', true);
            earnedBadges.push(b.id);
        }
    });

    const html = `
        <div class="app-screen">
            <header class="today-greeting">
                <div class="today-greeting__date">あなたの細胞</div>
                <div class="today-greeting__hello" style="font-size: 1.2rem;">Garden 🌱</div>
            </header>

            <!-- 育っている細胞 -->
            <div class="garden-hero">
                <div class="garden-cell garden-cell--${stage}">
                    <div class="garden-cell__ring garden-cell__ring--1"></div>
                    <div class="garden-cell__ring garden-cell__ring--2"></div>
                    <div class="garden-cell__core"></div>
                    <div class="garden-cell__emoji">${stageEmoji}</div>
                </div>
                <div class="garden-hero__level">Lv.${lv.lv} ${lv.name}</div>
                <div class="garden-hero__stage">${stageName}</div>

                ${lv.next ? `
                    <div class="garden-hero__next">
                        次のレベルまで <strong>${lv.next.ep - lv.ep} EP</strong>
                        <div class="garden-hero__progress">
                            <div class="garden-hero__progress-fill" style="width:${lv.percent}%"></div>
                        </div>
                    </div>
                ` : `<div class="garden-hero__next"><strong>🏆 MAX レベル到達！</strong></div>`}
            </div>

            <!-- 脳の若々しさ（学び・生きがいメーター） -->
            ${(function(){
                const learnDays = (typeof getMindLearnDays === 'function') ? getMindLearnDays() : 0;
                const quizBest = YEStorage.get('quiz_best', 0);
                const quizMax = (typeof QUIZ_QUESTIONS !== 'undefined') ? QUIZ_QUESTIONS.length : 13;
                // 学び度 = 学び日数(最大30で頭打ち)70% + クイズ正解率30%
                const learnPct = Math.min(1, learnDays / 30) * 70 + (quizMax ? (quizBest / quizMax) : 0) * 30;
                const pct = Math.round(learnPct);
                let brainLabel, brainEmoji, brainColor;
                if (pct >= 70)      { brainLabel = 'いきいき脳細胞'; brainEmoji = '✨🧠'; brainColor = '#7ca97a'; }
                else if (pct >= 40) { brainLabel = 'すくすく学び中'; brainEmoji = '📚🧠'; brainColor = '#8eb4c7'; }
                else if (pct >= 15) { brainLabel = 'めばえ脳';       brainEmoji = '🌱🧠'; brainColor = '#c9a96e'; }
                else                { brainLabel = 'これから脳';     brainEmoji = '🥚🧠'; brainColor = '#b39a8b'; }
                return `
                    <div style="background:#fff; border-radius:18px; padding:16px 18px; box-shadow:0 4px 16px rgba(46,38,34,.06); margin:0 0 4px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <div style="font-family:'Noto Serif JP',serif; font-size:.92rem; font-weight:600; letter-spacing:.06em;">${brainEmoji} 脳の若々しさ</div>
                            <div style="font-size:.72rem; color:${brainColor}; font-weight:700;">${brainLabel}</div>
                        </div>
                        <div style="height:10px; background:#f0e8df; border-radius:99px; overflow:hidden;">
                            <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, ${brainColor}, #c9899a); border-radius:99px; transition:width .4s;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:.64rem; color:#8a7d76; margin-top:6px;">
                            <span>学び・生きがい ${learnDays}日</span>
                            <span>クイズ最高 ${quizBest}/${quizMax}</span>
                        </div>
                        <div style="font-size:.62rem; color:#8a7d76; margin-top:8px; line-height:1.5; letter-spacing:.02em;">
                            🧬 学び続ける脳は若い。リスキリングは長寿スキルの柱。「心と社会のケア」とクイズで育ちます。
                        </div>
                    </div>
                `;
            })()}

            <!-- 3人組 -->
            <div class="garden-chars">
                <div class="garden-char">
                    <div class="garden-char__img"><img src="${getImagePath('rink', 'smile', 1)}" alt="りんく"></div>
                    <div class="garden-char__name" style="color:#ff8fa3;">りんく</div>
                </div>
                <div class="garden-char">
                    <div class="garden-char__img"><img src="${getImagePath('konta', 'smile', 1)}" alt="こん太"></div>
                    <div class="garden-char__name" style="color:#ffb347;">こん太</div>
                </div>
                <div class="garden-char">
                    <div class="garden-char__img"><img src="${getImagePath('tanunee', 'smile', 1)}" alt="たぬ姉"></div>
                    <div class="garden-char__name" style="color:#c19a6b;">たぬ姉</div>
                </div>
            </div>

            <!-- バッジ -->
            <h2 class="app-section-title">
                <span class="app-section-title__emoji">🏅</span>
                バッジ ${earnedBadges.length}/${BADGES.length}
            </h2>
            <div class="badge-grid">
                ${BADGES.map(b => {
                    const earned = earnedBadges.includes(b.id);
                    return `
                        <div class="badge ${earned ? '' : 'badge--locked'}" title="${b.name}: ${b.desc}">
                            <div class="badge__emoji">${b.emoji}</div>
                            <div class="badge__name">${b.name}</div>
                            <div class="badge__desc">${b.desc}</div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- レベルロードマップ -->
            <h2 class="app-section-title">
                <span class="app-section-title__emoji">🗺️</span>
                レベルロードマップ
            </h2>
            <div class="level-roadmap">
                ${LEVELS.filter((_, i) => i < 17).map(l => {
                    let cls = '';
                    if (l.lv === lv.lv) cls = 'level-roadmap__item--current';
                    else if (l.lv < lv.lv) cls = 'level-roadmap__item--reached';
                    return `
                        <div class="level-roadmap__item ${cls}">
                            <div class="level-roadmap__lv">${l.lv}</div>
                            <div class="level-roadmap__info">
                                <div class="level-roadmap__name">${l.name}</div>
                                <div class="level-roadmap__ep">${l.ep}EP 〜</div>
                            </div>
                            <div class="level-roadmap__stage">${STAGE_EMOJI[l.stage]}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    document.getElementById('garden-screen').innerHTML = html;
})();
