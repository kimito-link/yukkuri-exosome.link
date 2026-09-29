/**
 * 認証モード確認係（全画面の先頭で読む）
 *
 * ★このアプリは kimito.link 共通アカウントへのログインを前提にする。
 *   ただし「未ログインでは何も見せない」のではなく、未ログインでも中身は見せ、
 *   記録を保存する等の「使う」操作をした瞬間だけログインを求める（2段構成）。
 *
 * ★設計判断（2026-09-29、旧 auth-gate.js からの置き換え）:
 *   2026-09-09 の「ログイン前提にする」というオーナー判断そのものは変えない。
 *   変えるのは「未ログインなら問答無用で /lp/ へ強制送還する」という実装。
 *   未ログイン訪問者にとって「一瞬本来の画面が見える→隠される→別画面へ飛ぶ」という
 *   非同期判定の待ち時間が「ちらつき」として実際に報告された。
 *   設計書: web-ios-android/_docs/DESIGN-kimito-family-prepaint-auth-mode-2026-09-29.md
 *
 * ★ちらつきを構造的に消す仕組み:
 *   認証モードの判定は、このファイルではなく各ページ <head> 先頭のインラインスクリプトが
 *   ペイント前・同期的に行い、<html data-auth="member|guest"> を確定させる。
 *   表示の出し分けは CSS（.guest-only / .member-only）に任せ、JS は「後から裏取りする係」
 *   に徹する。location.replace は一切使わない。
 *
 * ★App Store Guideline 4.8 の遵守:
 *   X ログインを出す以上、Sign in with Apple も同列に出す義務がある。
 *   ログインを開く関数は YEAuth.openSignIn() の1つに限定し、provider を指定しない
 *   （Clerk 標準の選択画面＝X 主役・Apple/Google 併記）。
 *
 * ★Guideline 2.1(a) への備え:
 *   新設計では未ログインでも全画面の中身が見えるため、審査員が中身を確認できる。
 *   デモアカウントでの「使う」操作の確認は引き続き必要（ASC 審査ノート参照）。
 *
 * 依存: common.js（YEStorage）, auth.js（YEAuth）
 */

(function () {
    'use strict';

    /**
     * Clerk の認証 cookie __client_uat が「ログイン済み」を示すか。
     * 値は Unix 秒。'0' はゲスト、'0' 以外はログイン済み（中間状態なし）。
     * ★HttpOnly ではないので document.cookie から読める（実測）。
     * ★各ページ <head> 先頭のインラインスクリプトと同じ判定ロジック。
     *   両者がドリフトしないことは check-auth-head-snippet.mjs で機械検査する。
     */
    function hasLiveClerkCookie() {
        var m = document.cookie.match(/(?:^|;\s*)__client_uat[^=]*=([^;]*)/);
        return !!(m && m[1] && m[1] !== '0');
    }

    function getMode() {
        return document.documentElement.getAttribute('data-auth') || 'guest';
    }

    function setMode(mode) {
        document.documentElement.setAttribute('data-auth', mode);
    }

    /**
     * ★唯一許される「事後遷移」: member 判定だったが実セッションが切れていた場合、
     *   トーストで知らせてから guest 表示へ切り替える。リダイレクトはしない
     *   （設計書 C-5-3。黙って画面を差し替えない）。
     */
    function showSessionExpiredToast() {
        if (document.getElementById('ye-session-toast')) return;
        var t = document.createElement('div');
        t.id = 'ye-session-toast';
        t.setAttribute('role', 'status');
        t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
            'background:#2e2622;color:#fff;padding:10px 18px;border-radius:999px;' +
            'font-size:.82rem;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.2);' +
            'max-width:90vw;text-align:center;';
        t.textContent = 'ログインが切れました。もう一度サインインしてください。';
        document.body.appendChild(t);
        setTimeout(function () {
            if (t.parentNode) t.parentNode.removeChild(t);
        }, 5000);
    }

    function boot() {
        if (typeof YEAuth === 'undefined') {
            // ★auth.js が読まれていない画面。member 扱いにしない（fail-closed）。
            if (window.console) console.error('[auth-mode] auth.js が読み込まれていません');
            setMode('guest');
            return;
        }

        if (getMode() !== 'member') return; // guest はそのまま。裏取り不要。

        if (!hasLiveClerkCookie()) {
            // <head> スニペットは member と見たが、その後 cookie が失効した極小の隙間。
            setMode('guest');
            return;
        }

        // 裏で実セッションを確かめる。切れていればトースト＋guestへ（リダイレクトしない）。
        YEAuth.ensureSession().then(function (ok) {
            if (ok) {
                if (window.YESync && YESync.sync) YESync.sync().catch(function () {});
                // kimito.link のダッシュボードに出す利用サマリ（パスポート）を送る。
                // ★待たない・失敗しても画面に出さない。本業（記録）を巻き添えにしない。
                if (window.YESync && YESync.pushHubSummary) YESync.pushHubSummary().catch(function () {});
            } else {
                setMode('guest');
                showSessionExpiredToast();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.YEAuthMode = {
        getMode: getMode,
        setMode: setMode,
        hasLiveClerkCookie: hasLiveClerkCookie
    };
})();
