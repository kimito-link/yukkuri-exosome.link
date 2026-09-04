/**
 * kimito.link 共通アカウント（Clerk）ログイン — すみわけ方式
 *
 * ★このアプリの土台は「ログイン不要・端末内完結」（premium.js と同じ思想）。
 *   このファイルは【任意】のログインを足すだけで、premium.js のチケット検証・
 *   YEStorage の記録は一切変更しない。ログインしない人には今まで通り何も起きない。
 *
 * ★Clerk SDK は「サインイン」がタップされるまでネットワークに出さない。
 *   すれ違い通信（surechigai-romi.link）が実測した教訓の踏襲:
 *   未ログインユーザーにも Clerk SDK（762KB）を読み込ませていたのが
 *   体感速度の主因（TBT 1,780ms）と判明し、遅延読込に直した経緯がある。
 *   （参考: surechigai-romi.link/app/_layout.tsx:92-96）
 *
 * ★フェーズ0.5（疎通検証）段階の実装:
 *   本番ドメイン（exosome.kimito.link）への移行前は、Clerk Dashboard の
 *   satellite domains に Vercel preview URL を一時登録して検証する。
 *   IS_SATELLITE / CLERK_FRONTEND_API は移行後に isSatellite が不要になるか
 *   実測してから確定する（SHARED-ACCOUNT-SATELLITE-GUIDE.md:17-18 参照 —
 *   同一親ドメイン *.kimito.link なら cookie 共有で足りる可能性が高い）。
 *
 * ★セッショントークンは保存しない。
 *   Clerk.session.getToken() を都度呼ぶだけにする。Clerk 自身が cookie と
 *   メモリキャッシュでセッションを管理しているので、こちら側で独自に
 *   永続化コードを書くこと自体が「自前セッションを持たない」鉄則
 *   （CLERK_X_LOGIN_PLAYBOOK.md §1 / SHARED-ACCOUNT-SATELLITE-GUIDE.md）に
 *   抵触するリスクがある。書かないのが正しい設計。
 *
 * 依存: common.js（YEStorage）
 */

(function () {
    'use strict';

    // kimito.link 本番の公開可能キー（Clerk Dashboard > kimitolink-linktree > API Keys）。
    // ★公開可能キーなので静的サイトに平文で置いてよい。秘密鍵(sk_live_)は絶対に置かない。
    var CLERK_PUBLISHABLE_KEY = 'pk_live_Y2xlcmsua2ltaXRvLmxpbmsk';

    // kimito.link の Clerk Frontend API カスタムドメイン。
    var CLERK_FRONTEND_API = 'clerk.kimito.link';

    // exosome.kimito.link 移行前（別ドメインのまま検証する間）は true。
    // 移行後、cookie 共有だけで足りると実測できたら false に切り替える。
    var IS_SATELLITE = true;

    // すみわけ用の軽いフラグ。トークンそのものは入れない。
    var AUTH_STATE_KEY = 'auth_signed_in'; // YEStorage 経由 → 実キーは ye_auth_signed_in

    var clerkLoadPromise = null;

    /** Clerk SDK を <script> タグで動的に読み込む。呼ばれるまでネットワークに出ない。 */
    function loadClerk() {
        if (clerkLoadPromise) return clerkLoadPromise;
        clerkLoadPromise = new Promise(function (resolve, reject) {
            if (window.Clerk) { resolve(window.Clerk); return; }
            var script = document.createElement('script');
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.setAttribute('data-clerk-publishable-key', CLERK_PUBLISHABLE_KEY);
            // ★satellite は script タグの属性で渡す必要がある。
            //   Clerk.load() のオプションだけでは
            //   「Missing domain and proxyUrl」で初期化に失敗する（実測）。
            if (IS_SATELLITE) {
                script.setAttribute('data-clerk-is-satellite', 'true');
                script.setAttribute('data-clerk-domain', CLERK_FRONTEND_API);
            }
            // Clerk のバージョンタグは実装直前に公式ドキュメントで最新を確認すること。
            script.src = 'https://' + CLERK_FRONTEND_API + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
            script.onload = function () {
                if (!window.Clerk || typeof window.Clerk.load !== 'function') {
                    reject(new Error('Clerk SDK の初期化に失敗しました（publishableKey を確認してください）'));
                    return;
                }
                var loadOpts = IS_SATELLITE
                    ? { isSatellite: true, domain: CLERK_FRONTEND_API }
                    : {};
                window.Clerk.load(loadOpts).then(function () {
                    resolve(window.Clerk);
                }).catch(reject);
            };
            script.onerror = function () { reject(new Error('Clerk SDK の読み込みに失敗しました')); };
            document.head.appendChild(script);
        });
        return clerkLoadPromise;
    }

    /** ログイン済みかどうか（Clerk未読込の間はローカルの軽いフラグで即答） */
    function isSignedIn() {
        if (window.Clerk && window.Clerk.session) return true;
        return !!YEStorage.get(AUTH_STATE_KEY, false);
    }

    /** サインインを開く。Clerk標準の openSignIn をそのまま使う（自前フォームを書かない）。 */
    function openSignIn() {
        return loadClerk().then(function (Clerk) {
            Clerk.addListener(function (payload) {
                var signedIn = !!(payload && payload.session);
                YEStorage.set(AUTH_STATE_KEY, signedIn);
            });
            Clerk.openSignIn({
                afterSignInUrl: location.href,
                afterSignUpUrl: location.href
            });
        });
    }

    /** サインアウト。 */
    function signOut() {
        return loadClerk().then(function (Clerk) {
            return Clerk.signOut();
        }).then(function () {
            YEStorage.remove(AUTH_STATE_KEY);
        });
    }

    /**
     * 同期API呼び出し用のBearerトークンを取得する。
     * 都度呼ぶだけで、返り値をどこにも保存しないこと。
     */
    function getSyncToken() {
        if (!window.Clerk || !window.Clerk.session) return Promise.resolve(null);
        return window.Clerk.session.getToken();
    }

    window.YEAuth = {
        isSignedIn: isSignedIn,
        openSignIn: openSignIn,
        signOut: signOut,
        getSyncToken: getSyncToken,
        _loadClerk: loadClerk // フェーズ0.5の疎通検証で直接呼べるように公開
    };
})();
