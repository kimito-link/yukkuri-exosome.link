/**
 * アプリ全体のコア機能
 * - レベル・経験値・連続日数
 * - クエスト状態管理
 * - ボトムタブ
 * - 共通UI（ステータスバー・トースト）
 */

// レベル定義
const LEVELS = [
    { lv: 1,  name: '細胞のたまご',   ep: 0,    stage: 'egg' },
    { lv: 2,  name: 'ちっちゃい細胞', ep: 50,   stage: 'egg' },
    { lv: 3,  name: 'ちっちゃい細胞', ep: 120,  stage: 'egg' },
    { lv: 4,  name: 'うごく細胞',     ep: 220,  stage: 'egg' },
    { lv: 5,  name: 'うごく細胞',     ep: 350,  stage: 'egg' },
    { lv: 6,  name: 'めばえ',         ep: 520,  stage: 'sprout' },
    { lv: 7,  name: 'めばえ',         ep: 720,  stage: 'sprout' },
    { lv: 8,  name: 'すくすく細胞',   ep: 960,  stage: 'sprout' },
    { lv: 9,  name: 'すくすく細胞',   ep: 1240, stage: 'sprout' },
    { lv: 10, name: '元気いっぱい',   ep: 1560, stage: 'sprout' },
    { lv: 12, name: '元気いっぱい',   ep: 2300, stage: 'sprout' },
    { lv: 15, name: 'おとな細胞',     ep: 3700, stage: 'bloom' },
    { lv: 18, name: 'おとな細胞',     ep: 5500, stage: 'bloom' },
    { lv: 20, name: '熟練細胞',       ep: 7000, stage: 'bloom' },
    { lv: 25, name: '達人細胞',       ep: 11500,stage: 'bloom' },
    { lv: 26, name: '銀河細胞',       ep: 12500,stage: 'galaxy' },
    { lv: 30, name: 'マスター',       ep: 18000,stage: 'galaxy' }
];

// ステージ別の絵文字
const STAGE_ICONS = {
    egg: '🥚',
    sprout: '🌱',
    bloom: '🌸',
    galaxy: '🌌'
};

// EP取得テーブル
const EP_REWARDS = {
    selfcare_item: 10,      // セルフケア1項目達成
    selfcare_full: 30,      // 全部達成ボーナス
    quiz_correct: 20,       // クイズ1問正解
    quiz_perfect: 100,      // 全問正解
    daily_login: 5,         // ログインボーナス
    streak_3: 50,           // 3日連続
    streak_7: 150,          // 7日連続
    streak_30: 800          // 30日連続
};

// アプリ状態
const App = {
    /** 現在のEPを取得 */
    getEP() {
        return YEStorage.get('app_ep', 0);
    },

    /** EPを追加（レベルアップ検知あり） */
    addEP(amount, source = '') {
        if (amount <= 0) return null;
        const before = this.getEP();
        const after = before + amount;
        YEStorage.set('app_ep', after);

        const beforeLv = this.calcLevel(before);
        const afterLv = this.calcLevel(after);

        // ログ保存
        const log = YEStorage.get('app_ep_log', []);
        log.push({ date: getTodayKey(), source, amount, ts: Date.now() });
        if (log.length > 200) log.splice(0, log.length - 200);
        YEStorage.set('app_ep_log', log);

        const leveledUp = afterLv.lv > beforeLv.lv;
        return { before, after, beforeLv, afterLv, leveledUp, gained: amount };
    },

    /** EPからレベル情報を計算 */
    calcLevel(ep) {
        let current = LEVELS[0];
        let next = LEVELS[1] || null;
        for (let i = 0; i < LEVELS.length; i++) {
            if (ep >= LEVELS[i].ep) {
                current = LEVELS[i];
                next = LEVELS[i + 1] || null;
            } else {
                break;
            }
        }
        const progressEp = ep - current.ep;
        const neededEp = next ? (next.ep - current.ep) : 0;
        const percent = next ? Math.min(100, (progressEp / neededEp) * 100) : 100;
        return {
            ...current,
            ep,
            next,
            progressEp,
            neededEp,
            percent
        };
    },

    /** 現在のレベル情報を取得 */
    getLevel() {
        return this.calcLevel(this.getEP());
    },

    /** 連続日数 */
    getStreak() {
        const lastDate = YEStorage.get('app_last_active', null);
        const today = getTodayKey();
        if (!lastDate) return 0;

        const last = new Date(lastDate);
        const t = new Date(today);
        const diffDays = Math.floor((t - last) / (1000 * 60 * 60 * 24));

        // 2日以上空いたらリセット表示
        if (diffDays > 1) return 0;
        return YEStorage.get('app_streak', 0);
    },

    /** チェックイン処理（1日1回） */
    checkIn() {
        const today = getTodayKey();
        const last = YEStorage.get('app_last_active', null);
        if (last === today) return { newDay: false };

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        let newStreak;
        if (last === yKey) {
            // 昨日来てた = 連続
            newStreak = YEStorage.get('app_streak', 0) + 1;
        } else {
            // 久しぶり = リセット
            newStreak = 1;
        }
        YEStorage.set('app_streak', newStreak);
        YEStorage.set('app_last_active', today);

        // ログインボーナス
        const result = this.addEP(EP_REWARDS.daily_login, 'daily_login');

        // ストリーク報酬チェック
        if (newStreak === 3) this.addEP(EP_REWARDS.streak_3, 'streak_3');
        if (newStreak === 7) this.addEP(EP_REWARDS.streak_7, 'streak_7');
        if (newStreak === 30) this.addEP(EP_REWARDS.streak_30, 'streak_30');

        return { newDay: true, streak: newStreak, epResult: result };
    },

    /** 今日のクエスト達成状況 */
    getTodayQuests() {
        const today = getTodayKey();
        const careData = YEStorage.get(`selfcare_${today}`, []);
        const quizData = YEStorage.get(`daily_quiz_${today}`, { answered: 0, correct: 0 });
        const adviceData = YEStorage.get(`advice_${today}`, false);

        return {
            care: {
                done: careData.length >= 3,
                progress: careData.length,
                total: 6
            },
            quiz: {
                done: quizData.answered >= 3,
                progress: quizData.answered,
                correct: quizData.correct,
                total: 3
            },
            advice: {
                done: adviceData === true
            }
        };
    },

    /** アドバイス引いた記録 */
    markAdviceDone() {
        const today = getTodayKey();
        const key = `advice_${today}`;
        if (YEStorage.get(key, false)) return false;
        YEStorage.set(key, true);
        return true;
    },

    /** 今日のキャラ気分（連続日数で変化） */
    getMoodCharacter() {
        const streak = this.getStreak();
        const lastDate = YEStorage.get('app_last_active', null);
        const today = getTodayKey();
        const isToday = lastDate === today;

        if (!isToday) {
            // 久しぶり
            return {
                charKey: 'rink',
                expression: 'half',
                message: 'おかえりなのだ！また会えてうれしいのだ。今日のチェックイン、しよう？'
            };
        }
        if (streak >= 7) {
            return {
                charKey: 'tanunee',
                expression: 'smileOpen',
                message: `${streak}日連続！素晴らしい習慣ね。あなたの細胞も喜んでいるわよ。`
            };
        }
        if (streak >= 3) {
            return {
                charKey: 'konta',
                expression: 'smileOpen',
                message: `${streak}日連続だね！この調子だよ。今日も一緒に頑張ろう！`
            };
        }
        return {
            charKey: 'rink',
            expression: 'smile',
            message: 'やっほー！今日のセルフケア、何からはじめるのだ？'
        };
    },

    /** トースト表示 */
    showToast(text, icon = '🎉', duration = 2400) {
        const existing = document.querySelector('.app-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'app-toast';
        toast.innerHTML = `<span class="app-toast__icon">${icon}</span><span class="app-toast__text">${text}</span>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('app-toast--show'));
        setTimeout(() => {
            toast.classList.remove('app-toast--show');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    },

    /** レベルアップ通知 */
    notifyLevelUp(result) {
        if (!result || !result.leveledUp) return;
        this.showToast(`Lv.${result.afterLv.lv} ${result.afterLv.name}！`, '🎉', 3500);
    },

    /** EP獲得通知 */
    notifyEP(amount, label) {
        if (amount <= 0) return;
        this.showToast(`+${amount} EP ${label || ''}`, '✨', 2000);
    }
};

/**
 * アプリシェル（ステータスバー＋タブ）を挿入
 * @param {string} activeTab - 'today'|'care'|'quiz'|'garden'|'me'
 * @param {number} depth - パス階層
 */
function injectAppShell(activeTab = 'today', depth = 0) {
    const base = getBasePath(depth);

    // チェックイン処理（1日1回）
    const ci = App.checkIn();
    if (ci.newDay && ci.streak > 1) {
        setTimeout(() => {
            App.showToast(`${ci.streak}日連続！ +${EP_REWARDS.daily_login}EP`, '🔥', 2400);
        }, 500);
    }

    const lv = App.getLevel();
    const streak = App.getStreak();
    const stageIcon = STAGE_ICONS[lv.stage];

    // ブランドヘッダー（最上部）
    const brandEl = document.createElement('header');
    brandEl.className = 'app-brand';
    brandEl.innerHTML = `
        <a href="${base}" class="app-brand__combo">
            <img src="${base}images/kimito-link-logo/logo_kimito-link_RGB_color.png" alt="Kimito-Link" class="app-brand__combo-logo">
            <span class="app-brand__combo-no">の</span>
            <span class="app-brand__combo-name">ゆっくりエクソソーム</span>
        </a>
    `;
    document.body.insertBefore(brandEl, document.body.firstChild);

    // ステータスバー
    const statusEl = document.createElement('div');
    statusEl.className = 'app-status';
    statusEl.innerHTML = `
        <div class="app-status__level">
            <div class="app-status__level-badge">${lv.lv}</div>
            <div class="app-status__level-info">
                <div class="app-status__level-label">${stageIcon} ${lv.name}</div>
                <div class="app-status__level-name">${lv.next ? `次まで ${lv.next.ep - lv.ep}EP` : 'MAX'}</div>
            </div>
        </div>
        <div class="app-status__ep-bar">
            <div class="app-status__ep-fill" style="width: ${lv.percent}%"></div>
        </div>
        ${streak > 0 ? `<div class="app-status__streak">🔥 ${streak}</div>` : ''}
    `;
    document.body.insertBefore(statusEl, document.body.firstChild);

    // ボトムタブ
    const tabsEl = document.createElement('nav');
    tabsEl.className = 'app-tabs';

    const tabs = [
        { key: 'today',  icon: '🏠', label: 'Today',  href: `${base}` },
        { key: 'care',   icon: '✅', label: 'Care',   href: `${base}selfcare/` },
        { key: 'boost',  icon: '💊', label: 'Boost',  href: `${base}boost/` },
        { key: 'garden', icon: '🌱', label: 'Garden', href: `${base}garden/` },
        { key: 'me',     icon: '👤', label: 'Me',     href: `${base}me/` }
    ];

    const quests = App.getTodayQuests();
    const undoneCount = (!quests.care.done ? 1 : 0) + (!quests.quiz.done ? 1 : 0) + (!quests.advice.done ? 1 : 0);

    tabsEl.innerHTML = tabs.map(t => {
        const active = t.key === activeTab ? 'app-tab--active' : '';
        const badge = t.key === 'today' && undoneCount > 0
            ? `<span class="app-tab__badge">${undoneCount}</span>` : '';
        return `
            <a href="${t.href}" class="app-tab ${active}">
                ${badge}
                <span class="app-tab__icon">${t.icon}</span>
                <span class="app-tab__label">${t.label}</span>
            </a>
        `;
    }).join('');

    document.body.appendChild(tabsEl);
    document.body.classList.add('app-mode');
}

/** アプリ画面ラッパー作成 */
function appScreen(html) {
    return `<div class="app-screen">${html}</div>`;
}
