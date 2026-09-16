/**
 * kimito.link 共通アカウント（Clerk）ログイン — ★ログイン必須
 *
 * ★2026-09-09 にログイン前提へ切り替えた（利用者0人の時点で決断）。
 *   以前は「すみわけ」＝未ログインでも全機能が使える設計だった。
 *   ゲート本体は auth-gate.js。このファイルは Clerk との接続だけを持つ。
 *   premium.js のチケット検証と YEStorage の記録形式は変更していない。
 *
 * ★Clerk SDK は「サインイン」がタップされるまでネットワークに出さない。
 *   すれ違い通信（surechigai-romi.link）が実測した教訓の踏襲:
 *   未ログインユーザーにも Clerk SDK（762KB）を読み込ませていたのが
 *   体感速度の主因（TBT 1,780ms）と判明し、遅延読込に直した経緯がある。
 *   （参考: surechigai-romi.link/app/_layout.tsx:92-96）
 *
 * ★satellite は使わない（2026-09-05 実測で確定）。
 *   exosome.kimito.link は kimito.link と同一親ドメインなので、Clerk の
 *   __client cookie が .kimito.link で共有される。satellite 設定は不要
 *   （SHARED-ACCOUNT-SATELLITE-GUIDE.md:16-17「satellite 設定すら最小で済む」）。
 *   ★isSatellite: true のままだと Clerk 側で verified になっていない限り
 *     /v1/client/sync が {"code":"form_param_missing","param_name":"link_domain"}
 *     を返してログインに入れない。Dashboard の Satellites に登録が残っていても
 *     Unverified なら同じ。サブドメイン運用では登録自体が不要。
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

    // ★false 固定。別ドメインで配信する場合だけ true にする
    //   （その場合は Clerk Dashboard で verified にする必要がある）。
    var IS_SATELLITE = false;

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

    /**
     * サインインする = この画面のまま Clerk のログインモーダルを開く。
     *
     * ★2026-09-16: 本家 kimito.link/sign-in へ飛ばす方式は使えない（実測で確定）。
     *   本家は signInForceRedirectUrl="/dashboard/" を指定していて、redirect_url より
     *   強い FORCE リダイレクトが効くため、ログイン後に必ず kimito.link の dashboard へ
     *   着地してしまい exosome へ戻れなかった。すれ違ひ通信も本家へ飛ばさず、
     *   自分のドメインで Clerk のサインインを完結させている（surechigai.kimito.link/sign-in/）。
     *   exosome は静的サイトなので Next の <SignIn/> は使えず、Clerk 標準の openSignIn()
     *   モーダルを自ドメインで開く。satellite なしで .kimito.link cookie 共有が効く。
     *
     * ★provider は指定しない。Clerk 標準の選択画面（X 主役・Apple / Google 併記）を出す。
     *   App Store 4.8 の「Apple を他のログインと同列に出す」はこの標準画面が満たす。
     *
     * @returns {Promise<void>} モーダルを開いたら resolve。ログイン成立の監視は呼び出し側。
     */
    function openSignIn() {
        return loadClerk().then(function (Clerk) {
            Clerk.addListener(function (payload) {
                var signedIn = !!(payload && payload.session);
                YEStorage.set(AUTH_STATE_KEY, signedIn);
            });
            // signInFallbackRedirectUrl は「モーダルではなくページ遷移でログインした場合」の
            // 戻り先。モーダル運用では基本使われないが、念のため今の画面を指定する。
            Clerk.openSignIn({
                signInFallbackRedirectUrl: location.href,
                signUpFallbackRedirectUrl: location.href
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

    /**
     * Clerk 側に本物のセッションがあるか確かめる。
     *
     * ★isSignedIn() はローカルの軽いフラグを見るだけなので、
     *   Clerk 側でセッションが切れていても true を返しうる。
     *   ログイン必須ゲート（auth-gate.js）はそれを信じて通してしまうので、
     *   裏で実セッションを確かめてフラグを正す。
     *
     * @returns {Promise<boolean>} 本物のセッションがあれば true
     */
    function ensureSession() {
        return loadClerk().then(function (Clerk) {
            var ok = !!(Clerk && Clerk.session);
            // 実態に合わせてフラグを直す（次回の初期表示が正しくなる）
            if (ok) {
                YEStorage.set(AUTH_STATE_KEY, true);
            } else {
                YEStorage.remove(AUTH_STATE_KEY);
            }
            return ok;
        }).catch(function () {
            // ★読み込めなかったときは「切れている」とみなさない。
            //   通信が細いだけで締め出すと、記録が見られなくなる。
            //   ゲートは既にローカルフラグで通しているので、ここでは何もしない。
            return true;
        });
    }

    /**
     * ログイン中のアカウント情報を取る（ヘッダーのアカウント表示用）。
     * ★すれ違ひ通信と同じく「誰として入っているか」を常時見せるために使う。
     *   Clerk を読み込んで user から表示名・ユーザー名・アイコンを取る。
     *   未ログイン・読み込み失敗時は null（呼び出し側で出さない）。
     * @returns {Promise<{name:string, username:string|null, imageUrl:string|null}|null>}
     */
    function getUser() {
        // ★ローカルフラグ（isSignedIn）ではなく Clerk の実セッションで判定する。
        //   フラグはモーダルでログインしたタブにしか立たず、別タブ・別端末・ticket
        //   ログインでは Clerk セッションが生きていてもフラグが無い（＝アカウント表示が
        //   出ない）ことがある。Clerk.user を実際に見る（2026-09-16 E2E で検出）。
        return loadClerk().then(function (Clerk) {
            var u = Clerk && Clerk.user;
            if (!u) return null;
            return {
                name: u.fullName || u.username || u.firstName || 'あなた',
                username: u.username || null,
                imageUrl: u.imageUrl || u.profileImageUrl || null
            };
        }).catch(function () { return null; });
    }

    window.YEAuth = {
        isSignedIn: isSignedIn,
        ensureSession: ensureSession,
        openSignIn: openSignIn,
        signOut: signOut,
        getSyncToken: getSyncToken,
        getUser: getUser,
        _loadClerk: loadClerk // フェーズ0.5の疎通検証で直接呼べるように公開
    };
})();
