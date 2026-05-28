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
    { id: 'quiz_perfect', emoji: '🧠', name: 'クイズ満点',     desc: '10問全問正解',     check: () => YEStorage.get('quiz_best', 0) >= 10 },
    { id: 'care_50',      emoji: '🌿', name: 'ケア50日',       desc: '累計50日',         check: () => YEStorage.get('app_total_days', 0) >= 50 },
    { id: 'care_100',     emoji: '🏆', name: 'ケア100日',      desc: '累計100日',        check: () => YEStorage.get('app_total_days', 0) >= 100 },
    { id: 'advice_10',    emoji: '💬', name: 'アドバイス10回', desc: 'アドバイス10回',   check: () => YEStorage.get('advice_count', 0) >= 10 }
];

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
