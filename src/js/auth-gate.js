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
 *   ボタン構成は kimito.link 本家のサインインページ（Clerk <SignIn/>、X 主役・Apple/Google 併記）
 *   が決める。★2026-09-16: 自前の Clerk モーダルをやめ、本家のサインインページへ送る形にした
 *   （kimito.link の LP と同じ体験。「りんくが鍵を開けています…」の演出も本家のもの）。
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

    /**
     * アプリ本体を隠す（ログイン画面が出るまでの一瞬のちらつきを防ぐ）
     *
     * ★2026-09-16 の地雷: 以前は `body > *:not(#ye-auth-gate) { visibility:hidden }` で
     *   body 直下を丸ごと隠していた。Clerk のログインモーダルは openSignIn() 時に
     *   body 直下へ `#clerk-components` を追加して描くので、それまで隠れてしまい
     *   「ログイン画面をひらいています…」のまま何も出ない（本番で実測）。
     *   → ゲートを出した時点で存在する要素だけに印を付けて隠す。
     *     あとから追加される要素（Clerk のモーダル等）は隠さない。
     */
    var HIDDEN_ATTR = 'data-ye-gate-hidden';

    function hideApp() {
        if (!document.getElementById('ye-auth-gate-style')) {
            var s = document.createElement('style');
            s.id = 'ye-auth-gate-style';
            s.textContent = '[' + HIDDEN_ATTR + '] { visibility: hidden !important; }';
            document.head.appendChild(s);
        }
        var kids = document.body.children;
        for (var i = 0; i < kids.length; i++) {
            var el = kids[i];
            if (el.id === 'ye-auth-gate' || el.id === 'clerk-components') continue;
            el.setAttribute(HIDDEN_ATTR, '');
        }
        // ★隠したアプリ本体の高さぶんスクロールできてしまうのを止める
        document.documentElement.style.overflow = 'hidden';
    }

    function showApp() {
        document.documentElement.style.overflow = '';
        var hidden = document.querySelectorAll('[' + HIDDEN_ATTR + ']');
        for (var i = 0; i < hidden.length; i++) hidden[i].removeAttribute(HIDDEN_ATTR);
        var s = document.getElementById('ye-auth-gate-style');
        if (s) s.remove();
        var g = document.getElementById('ye-auth-gate');
        if (g) g.remove();
    }

    /**
     * kimito.link のサインインから戻ってきた直後の処理。
     * ★ローカルの軽いフラグはまだ立っていない（ログインは別サイトで成立した）ので、
     *   Clerk を読み込んで実セッションを確かめる。.kimito.link の cookie 共有で見える。
     *   成立していればフラグが立ち（ensureSession が立てる）、記録の引き継ぎを裏で走らせる。
     */
    function finishReturnFromSignIn() {
        hideApp();
        YEAuth.ensureSession().then(function (ok) {
            YEAuth.clearReturnMark();
            if (!ok) { goToLp(); return; }
            showApp();
            if (window.YESync && YESync.sync) YESync.sync().catch(function () {});
        });
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
            goToLp();
            return;
        }

        // kimito.link のサインインから戻ってきた直後（?ye_auth=return）
        if (YEAuth.isReturningFromSignIn()) {
            finishReturnFromSignIn();
            return;
        }

        // ローカルの軽いフラグで即判定（Clerk の読み込みを待たない）
        if (YEAuth.isSignedIn()) {
            // Clerk 側の実セッションを裏で確かめ、切れていたら LP（ログインの入口）へ
            YEAuth.ensureSession().then(function (ok) {
                if (!ok) goToLp();
            });
            return;
        }

        goToLp();
    }

    /**
     * ★未ログインは素のゲートを見せず、LP（/lp/）へ送る（2026-09-16）。
     *   素のゲートは「キャラ1人とボタン1つ」の固定画面で、裏に隠したアプリ本体の高さぶん
     *   スクロールできてしまい「動かしても同じ画面」になっていた（ユーザー指摘）。
     *   LP はログインの入口として作ってあり（X ボタンで kimito.link のサインインへ）、
     *   ログインが成立すると ?ye_auth=return 付きで戻ってくる。/lp/ は PUBLIC_PATHS なのでループしない。
     *   遷移までの一瞬もアプリ本体は見せない（hideApp してから replace）。
     */
    function goToLp() {
        hideApp();
        location.replace(basePath() + 'lp/');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
