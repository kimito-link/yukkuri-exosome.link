/**
 * ログイン必須ゲート（全画面の先頭で読む）
 *
 * ★このアプリは kimito.link 共通アカウントへのログインを前提にする。
 *   未ログインではアプリ本体を見せない。使うほど X のつながりが増える設計の土台。
 *
 * ★設計判断（2026-09-09）:
 *   以前は「すみわけ」＝未ログインでも全機能が使える設計だった。
 *   オーナー判断でログイン前提に切り替えた。利用者0人の時点なので移行配慮は不要。
 *
 * ★App Store Guideline 4.8 の遵守:
 *   X ログインを出す以上、Sign in with Apple も同列に出す義務がある。
 *   ボタン構成は Clerk Dashboard（共有インスタンス）が決めるので、
 *   ここでプロバイダを指定して直行させない。★Clerk 標準の openSignIn() だけを使う。
 *   surechigai-romi.link は build 524 で「SIWA は実装済みだが到達経路が1本しかなく、
 *   他11画面が X へ直行していた」ため 4.8 で却下された。同じ轍を踏まない。
 *
 * ★Guideline 2.1(a) への備え:
 *   ログイン必須にすると審査員がアプリの中身を見られない。
 *   ASC に審査用アカウントを登録すること（人手・_drafts/reviewer-notes に手順）。
 *
 * 依存: common.js（YEStorage）, auth.js（YEAuth）
 */

(function () {
    'use strict';

    /**
     * ★ゲートを掛けない画面。
     *   プライバシーポリシーと利用規約は、ログインの判断材料なので
     *   ログイン前に読めなければならない（審査でも見られる）。
     */
    var PUBLIC_PATHS = ['/privacy/', '/terms/', '/lp/', '/about/'];

    function isPublicPath() {
        var p = location.pathname;
        for (var i = 0; i < PUBLIC_PATHS.length; i++) {
            if (p.indexOf(PUBLIC_PATHS[i]) >= 0) return true;
        }
        return false;
    }

    /** アプリ本体を隠す（ログイン画面が出るまでの一瞬のちらつきを防ぐ） */
    function hideApp() {
        var s = document.createElement('style');
        s.id = 'ye-auth-gate-style';
        s.textContent = 'body > *:not(#ye-auth-gate) { visibility: hidden !important; }';
        document.head.appendChild(s);
    }

    function showApp() {
        var s = document.getElementById('ye-auth-gate-style');
        if (s) s.remove();
        var g = document.getElementById('ye-auth-gate');
        if (g) g.remove();
    }

    /** ログインを促す画面。★プロバイダを選ばせる（4.8） */
    function renderGate() {
        var el = document.createElement('div');
        el.id = 'ye-auth-gate';
        el.setAttribute('style', [
            'position:fixed', 'inset:0', 'z-index:99999',
            'background:linear-gradient(160deg,#faf6f1,#f4ede4)',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            'padding:32px 24px', 'text-align:center',
            'font-family:"Noto Sans JP",sans-serif'
        ].join(';'));

        el.innerHTML = [
            '<img src="' + basePath() + 'images/characters/link/link-yukkuri-smile-mouth-open.png"',
            '     alt="" style="width:104px;height:auto;margin-bottom:18px;">',
            '<h1 style="font-family:\'Noto Serif JP\',serif;font-size:1.25rem;font-weight:600;',
            '           color:#2e2622;margin:0 0 10px;line-height:1.6;">',
            'ゆっくりエクソソーム',
            '</h1>',
            '<p style="font-size:.86rem;line-height:1.9;color:#8a7d76;margin:0 0 26px;max-width:22em;">',
            'kimito.link のアカウントでログインすると、<br>3人組といっしょに記録をはじめられます。',
            '</p>',
            '<button id="ye-auth-gate-btn" type="button" style="',
            'background:linear-gradient(135deg,#c9899a,#c9a96e);color:#fff;border:none;',
            'border-radius:999px;padding:15px 40px;font-size:.95rem;font-weight:700;',
            'font-family:inherit;cursor:pointer;box-shadow:0 4px 16px rgba(46,38,34,.14);">',
            'ログインしてはじめる',
            '</button>',
            '<p id="ye-auth-gate-msg" style="font-size:.76rem;color:#b3a79f;margin:18px 0 0;min-height:1.2em;"></p>',
            '<p style="font-size:.72rem;color:#b3a79f;margin:22px 0 0;line-height:1.8;">',
            '<a href="' + basePath() + 'privacy/" style="color:#8a7d76;">プライバシーポリシー</a>',
            '</p>'
        ].join('');

        document.body.appendChild(el);

        document.getElementById('ye-auth-gate-btn').addEventListener('click', function () {
            var msg = document.getElementById('ye-auth-gate-msg');
            msg.textContent = 'ログイン画面をひらいています…';
            // ★provider を指定しない。Clerk 標準の選択画面を出す（4.8）。
            YEAuth.openSignIn().then(function () {
                // ★モーダルを閉じただけでは通さない。実セッションを確かめてから畳む。
                watchForSession();
            }).catch(function (e) {
                msg.textContent = 'ひらけませんでした。通信環境を確認してもう一度お試しください。';
                if (window.console) console.error('[auth-gate]', e);
            });
        });
    }

    /**
     * ログインが完了したらゲートを畳む。
     * ★Clerk は同一ページ内でモーダルを閉じるので、リロードを待たずに反映する。
     *   セッションが出来たかどうかだけを見る（何回押されても副作用が無い）。
     */
    function watchForSession() {
        var tries = 0;
        var timer = setInterval(function () {
            tries++;
            if (window.Clerk && window.Clerk.session) {
                clearInterval(timer);
                showApp();
                // 記録の引き継ぎを裏で走らせる（失敗しても画面には出さない）
                if (window.YESync && YESync.sync) YESync.sync().catch(function () {});
                return;
            }
            if (tries > 600) clearInterval(timer); // 5分で諦める
        }, 500);
    }

    /**
     * ルートまでの相対パスを URL から出す。
     * ★data-depth 属性に頼らない。7画面が未指定で、頼ると画像パスが壊れる。
     *   /            -> ''
     *   /me/         -> '../'
     *   /basics/x/   -> '../../'
     */
    function basePath() {
        var segs = location.pathname.split('/').filter(Boolean);
        // 末尾が index.html 等のファイル名なら1つ減らす
        if (segs.length && segs[segs.length - 1].indexOf('.') >= 0) segs.pop();
        return segs.length ? '../'.repeat(segs.length) : '';
    }

    function boot() {
        if (isPublicPath()) return;

        if (typeof YEAuth === 'undefined') {
            // ★auth.js が読まれていない画面。素通しさせない（fail-closed）。
            //   配線漏れを「たまたま見えるページ」にして隠さない。
            if (window.console) console.error('[auth-gate] auth.js が読み込まれていません');
            hideApp();
            renderGate();
            return;
        }

        // ローカルの軽いフラグで即判定（Clerk の読み込みを待たない）
        if (YEAuth.isSignedIn()) {
            // Clerk 側の実セッションを裏で確かめ、切れていたらゲートに戻す
            YEAuth.ensureSession().then(function (ok) {
                if (!ok) {
                    hideApp();
                    renderGate();
                }
            });
            return;
        }

        hideApp();
        renderGate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
