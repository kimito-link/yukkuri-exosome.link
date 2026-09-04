/**
 * Me 画面 - プロフィール・設定
 */

(function() {
    const lv = App.getLevel();
    const streak = App.getStreak();
    const totalDays = YEStorage.get('app_total_days', 0);
    const ep = lv.ep;
    const adviceCount = YEStorage.get('advice_count', 0);
    const quizBest = YEStorage.get('quiz_best', 0);
    const notifEnabled = YEStorage.get('notif_enabled', false);
    const notifTime = YEStorage.get('notif_time', '09:00');

    const titleByLevel = (() => {
        if (lv.lv >= 26) return '銀河マスター';
        if (lv.lv >= 20) return 'エクソソーム達人';
        if (lv.lv >= 15) return 'セルフケアの達人';
        if (lv.lv >= 10) return 'エクソソーム上級者';
        if (lv.lv >= 5)  return 'エクソソーム中級者';
        return 'エクソソーム入門者';
    })();

    const html = `
        <div class="app-screen">
            <header class="today-greeting">
                <div class="today-greeting__date">マイページ</div>
                <div class="today-greeting__hello" style="font-size: 1.2rem;">Me 👤</div>
            </header>

            <!-- プロフィール -->
            <div class="me-profile">
                <div class="me-profile__avatar">🧬</div>
                <div class="me-profile__name">あなた</div>
                <div class="me-profile__title">${titleByLevel}</div>
            </div>

            <!-- 統計 -->
            <h2 class="app-section-title">
                <span class="app-section-title__emoji">📊</span>
                これまでの記録
            </h2>
            <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
                <div class="stat-card">
                    <div class="stat-card__emoji">🔥</div>
                    <div class="stat-card__value">${streak}</div>
                    <div class="stat-card__label">連続日数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__emoji">📅</div>
                    <div class="stat-card__value">${totalDays}</div>
                    <div class="stat-card__label">累計日数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__emoji">⭐</div>
                    <div class="stat-card__value">Lv.${lv.lv}</div>
                    <div class="stat-card__label">${lv.name}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__emoji">✨</div>
                    <div class="stat-card__value">${ep}</div>
                    <div class="stat-card__label">総獲得EP</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__emoji">🧠</div>
                    <div class="stat-card__value">${quizBest}</div>
                    <div class="stat-card__label">クイズ最高</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__emoji">💬</div>
                    <div class="stat-card__value">${adviceCount}</div>
                    <div class="stat-card__label">アドバイス</div>
                </div>
            </div>

            <!-- 設定 -->
            <h2 class="app-section-title">
                <span class="app-section-title__emoji">⚙️</span>
                設定
            </h2>
            <div class="me-list">
                <div class="me-list__item" id="notif-toggle-row">
                    <div class="me-list__icon">🔔</div>
                    <div class="me-list__label">毎日のリマインダー</div>
                    <div class="toggle ${notifEnabled ? 'toggle--on' : ''}" id="notif-toggle">
                        <div class="toggle__knob"></div>
                    </div>
                </div>
                <div class="me-list__item" id="notif-time-row" style="${notifEnabled ? '' : 'display:none;'}">
                    <div class="me-list__icon">⏰</div>
                    <div class="me-list__label">通知時刻</div>
                    <input type="time" id="notif-time-input" value="${notifTime}" style="border:none; background: transparent; font-family: inherit; font-size: 0.95rem; text-align: right;">
                </div>
            </div>

            <!-- アカウント（kimito.link 共通アカウント・すみわけ）
                 ★ログインは任意。ここを一切触らなくても、今まで通りアプリは
                 フルに使える。ログインした人だけ、記録の端末間引き継ぎと
                 他サービスへの導線が増える。premium.js のチケット検証・
                 YEStorage の記録はログインの有無に関係なく動く。 -->
            <h2 class="app-section-title">
                <span class="app-section-title__emoji">🔗</span>
                アカウント
            </h2>
            <div class="me-list">
                <div class="me-list__item" id="account-row">
                    <div class="me-list__icon">👤</div>
                    <div class="me-list__label" id="account-label">kimito.link でログイン</div>
                    <div class="me-list__arrow" id="account-arrow">→</div>
                </div>
            </div>
            <p style="font-size:.72rem; color:var(--color-text-muted); margin:6px 2px 0; line-height:1.6;">
                ログインしなくても、このアプリは今まで通り使えます。ログインすると、記録の端末間引き継ぎと他サービスへの行き来ができるようになります。
            </p>

            <!-- 詳しく知る -->
            <h2 class="app-section-title">
                <span class="app-section-title__emoji">📚</span>
                もっと詳しく
            </h2>
            <div class="me-list">
                <a href="../glossary/" class="me-list__item">
                    <div class="me-list__icon">📖</div>
                    <div class="me-list__label">用語集</div>
                    <div class="me-list__arrow">→</div>
                </a>
                <a href="../basics/what-is-exosome/" class="me-list__item">
                    <div class="me-list__icon">🧬</div>
                    <div class="me-list__label">エクソソームって何？</div>
                    <div class="me-list__arrow">→</div>
                </a>
                <a href="../basics/vs-stem-cell/" class="me-list__item">
                    <div class="me-list__icon">🔬</div>
                    <div class="me-list__label">幹細胞との違い</div>
                    <div class="me-list__arrow">→</div>
                </a>
                <a href="../basics/vs-supernatant/" class="me-list__item">
                    <div class="me-list__icon">💧</div>
                    <div class="me-list__label">培養上清液とは</div>
                    <div class="me-list__arrow">→</div>
                </a>
                <a href="../treatment/types/" class="me-list__item">
                    <div class="me-list__icon">💉</div>
                    <div class="me-list__label">施術の種類</div>
                    <div class="me-list__arrow">→</div>
                </a>
                <a href="../treatment/choose/" class="me-list__item">
                    <div class="me-list__icon">✅</div>
                    <div class="me-list__label">施術を選ぶ5つのポイント</div>
                    <div class="me-list__arrow">→</div>
                </a>
                <a href="../characters/" class="me-list__item">
                    <div class="me-list__icon">🎭</div>
                    <div class="me-list__label">3人組について</div>
                    <div class="me-list__arrow">→</div>
                </a>
            </div>

            <!-- その他 -->
            <h2 class="app-section-title">
                <span class="app-section-title__emoji">ℹ️</span>
                サイト情報
            </h2>
            <div class="me-list">
                <div class="me-list__item" id="replay-onboarding">
                    <div class="me-list__icon">✨</div>
                    <div class="me-list__label">アプリ紹介をもう一度見る</div>
                    <div class="me-list__arrow">→</div>
                </div>
                <a href="../about/" class="me-list__item">
                    <div class="me-list__icon">📝</div>
                    <div class="me-list__label">サイトについて</div>
                    <div class="me-list__arrow">→</div>
                </a>
                <a href="https://kimito-link.com/" target="_blank" rel="noopener" class="me-list__item">
                    <div class="me-list__icon">🔗</div>
                    <div class="me-list__label">Kimito-Link</div>
                    <div class="me-list__arrow">↗</div>
                </a>
            </div>

            <!-- データリセット -->
            <div class="me-danger" id="reset-data">
                ⚠️ アプリのデータをリセットする
            </div>

            <div style="text-align:center; padding: 24px 0 8px; color: var(--color-text-muted); font-size: 0.75rem;">
                exosome.kimito.link<br>
                v0.1.0 — 2026年5月
            </div>
        </div>
    `;

    document.getElementById('me-screen').innerHTML = html;

    // アカウント（kimito.link ログイン・すみわけ）
    if (typeof YEAuth !== 'undefined') {
        const accountLabel = document.getElementById('account-label');
        const accountArrow = document.getElementById('account-arrow');
        if (YEAuth.isSignedIn()) {
            accountLabel.textContent = 'kimito.link でログイン中';
            accountArrow.textContent = '';
        }
        document.getElementById('account-row').addEventListener('click', () => {
            if (YEAuth.isSignedIn()) {
                if (confirm('ログアウトしますか？\n記録は端末に残ります。')) {
                    YEAuth.signOut().then(() => {
                        App.showToast('ログアウトしました', '👋');
                        setTimeout(() => location.reload(), 600);
                    });
                }
            } else {
                YEAuth.openSignIn().catch(() => {
                    App.showToast('ログインを開けませんでした。時間をおいて試してください', '⚠️', 3000);
                });
            }
        });
    }

    // 通知トグル
    document.getElementById('notif-toggle').addEventListener('click', async () => {
        const current = YEStorage.get('notif_enabled', false);
        if (!current) {
            // ON にする → 権限要求
            if ('Notification' in window) {
                const result = await Notification.requestPermission();
                if (result === 'granted') {
                    YEStorage.set('notif_enabled', true);
                    App.showToast('通知をオンにしました', '🔔');
                    scheduleNotification();
                } else {
                    App.showToast('ブラウザで通知が拒否されています', '⚠️', 3000);
                    return;
                }
            } else {
                App.showToast('お使いの環境では通知非対応です', '⚠️', 3000);
                return;
            }
        } else {
            YEStorage.set('notif_enabled', false);
            App.showToast('通知をオフにしました', '🔕');
            clearScheduledNotification();
        }
        // 再描画
        location.reload();
    });

    // 時刻変更
    const timeInput = document.getElementById('notif-time-input');
    if (timeInput) {
        timeInput.addEventListener('change', (e) => {
            YEStorage.set('notif_time', e.target.value);
            App.showToast(`通知時刻を ${e.target.value} に変更`, '⏰');
            scheduleNotification();
        });
    }

    // オンボーディング再生
    const replayBtn = document.getElementById('replay-onboarding');
    if (replayBtn) {
        replayBtn.addEventListener('click', () => {
            if (typeof resetOnboarding === 'function') resetOnboarding();
            if (typeof showOnboarding === 'function') showOnboarding(1);
        });
    }

    // リセット
    document.getElementById('reset-data').addEventListener('click', () => {
        if (confirm('本当にすべてのデータをリセットしますか？\nレベル・ストリーク・履歴がすべて消えます。')) {
            // ye_ プレフィックスのものだけ削除
            const keys = Object.keys(localStorage).filter(k => k.startsWith('ye_'));
            keys.forEach(k => localStorage.removeItem(k));
            App.showToast('データをリセットしました', '🔄');
            setTimeout(() => location.href = '../', 800);
        }
    });
})();

/** ブラウザ通知のスケジュール */
function scheduleNotification() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const time = YEStorage.get('notif_time', '09:00');
    const [hh, mm] = time.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hh, mm, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;
    if (delay < 0 || delay > 24 * 60 * 60 * 1000) return;

    // タブが開いている間だけ動く簡易スケジューラ
    if (window._notifTimer) clearTimeout(window._notifTimer);
    window._notifTimer = setTimeout(() => {
        new Notification('ゆっくりエクソソーム', {
            body: '今日のチェックインしようよ！',
            icon: '../images/characters/link/link-yukkuri-smile-mouth-open.png'
        });
        scheduleNotification(); // 次回も
    }, delay);
}

function clearScheduledNotification() {
    if (window._notifTimer) {
        clearTimeout(window._notifTimer);
        window._notifTimer = null;
    }
}

// ページ読み込み時、通知がONなら次回スケジュール
if (YEStorage.get('notif_enabled', false)) {
    scheduleNotification();
}
