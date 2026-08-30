/**
 * 通知（notify.js）
 *
 * 安全側に倒した設計。ここは意図的に「できること」を狭めてある。
 *
 *   - 通知は 1日1回まで。就寝リマインダーのみ
 *   - 記録の途切れ、スコアの低下、連続日数、食事の間隔については通知しない
 *   - 権限要求はユーザーが明示的にボタンを押したときだけ
 *   - 文面は急かさない。責めない
 *
 * 技術的な現状：
 *   本当の意味でのバックグラウンドPush（アプリを閉じていても届く）には
 *   Push API + 配信サーバーが必要。ここでは Service Worker を登録したうえで、
 *   アプリを開いているあいだに指定時刻を過ぎたら通知を出す方式にしている。
 *   iOS ではホーム画面に追加した状態でのみ通知が使える点にも注意。
 */

const NotifyCenter = {

    STORE_KEY: 'notify_settings',

    defaults() {
        return { enabled: false, bedtime: '23:00', lastSentDate: null };
    },

    get() {
        return Object.assign(this.defaults(), YEStorage.get(this.STORE_KEY, {}));
    },

    save(patch) {
        const next = Object.assign(this.get(), patch);
        YEStorage.set(this.STORE_KEY, next);
        return next;
    },

    supported() {
        return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
    },

    permission() {
        return this.supported() ? Notification.permission : 'unsupported';
    },

    /** Service Worker を登録（通知の配信口として使う） */
    async registerSW(basePath = '../') {
        if (!('serviceWorker' in navigator)) return null;
        try {
            return await navigator.serviceWorker.register(`${basePath}sw.js`, { scope: basePath });
        } catch (e) {
            return null;
        }
    },

    /** 権限リクエスト。必ずユーザー操作の中から呼ぶこと */
    async requestPermission() {
        if (!this.supported()) return 'unsupported';
        if (Notification.permission === 'granted') return 'granted';
        if (Notification.permission === 'denied') return 'denied';
        return await Notification.requestPermission();
    },

    /** 通知を1件出す（Service Worker 経由。無ければ直接） */
    async show(title, body) {
        if (this.permission() !== 'granted') return false;
        const opts = {
            body,
            tag: 'ye-bedtime',
            requireInteraction: false,
            silent: false
        };
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && reg.showNotification) {
                await reg.showNotification(title, opts);
            } else {
                new Notification(title, opts);
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * 就寝時刻を過ぎていて、今日まだ送っていなければ1件だけ出す。
     * 1日1回の上限はここで担保している。
     */
    async checkAndSend() {
        const s = this.get();
        if (!s.enabled || this.permission() !== 'granted') return false;

        const today = getTodayKey();
        if (s.lastSentDate === today) return false;

        const [h, m] = (s.bedtime || '23:00').split(':').map(Number);
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const target = h * 60 + m;

        // 就寝時刻から2時間以内のあいだだけ出す（深夜に叩き起こさない）
        if (nowMin < target || nowMin > target + 120) return false;

        const sent = await this.show(
            'そろそろ、今日を閉じる時間です',
            '明かりを一段落とすと、体が眠る準備に入りやすくなります。記録は明日でも大丈夫です。'
        );
        if (sent) this.save({ lastSentDate: today });
        return sent;
    },

    /** アプリが開いているあいだ、1分ごとに時刻を見る */
    startWatch() {
        this.checkAndSend();
        setInterval(() => this.checkAndSend(), 60 * 1000);
    }
};
