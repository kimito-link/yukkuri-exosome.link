/**
 * 紹介パートナーコード（?ref_partner=otani 等）の受け取りと保持。
 *
 * 銀座スマートクリニックの大谷先生のような外部のパートナーが患者に配る QR/URL:
 *   https://<このアプリ>/?ref_partner=otani
 * を踏んで来た人を、Exosome では「保存するだけ」にとどめ、kimito.link への
 * すべてのリンクに ?ref_partner を付け直して送り出す。
 *
 * 設計の背骨（設計書 §0）:
 *   Exosome は純静的・ログイン不要・端末内完結。ここでは紹介を「確定」しない。
 *   確定・集計・報酬計算はすべて kimito.link 側のバックエンドが行う。
 *   だから localStorage の値が改ざんされても実害はない（数える主は kimito）。
 *
 * このファイルは他システム（EP・体内マップ・スコア）へ書き込まない。
 * localStorage の 1 キー(ye_ref_partner)と、初回だけの歓迎バー描画に限る。
 */

(function () {
    'use strict';

    // YEStorage は内部でキーに 'ye_' を前置するので、ここでは前置しない（重複防止）。
    // 生 localStorage を使う WELCOME_SHOWN_KEY 側は自前で 'ye_' を付ける。
    var REF_PARTNER_KEY = 'ref_partner';
    var WELCOME_SHOWN_KEY = 'ye_ref_partner_welcomed';
    // kimito 側 lib/partner/registry.ts の isPartnerCode と同一形式。
    // ※真偽（台帳にあるか）は kimito が判定するので、静的側は形式チェックだけで十分。
    var PARTNER_CODE_RE = /^[a-z][a-z0-9-]{2,31}$/;

    function isPartnerCode(code) {
        return typeof code === 'string' && code.indexOf('user_') !== 0 && PARTNER_CODE_RE.test(code);
    }

    /** localStorage への薄いアクセス（YEStorage があれば使う・無ければ素の localStorage）。 */
    function readRefPartner() {
        try {
            if (typeof YEStorage !== 'undefined' && YEStorage.get) return YEStorage.get(REF_PARTNER_KEY, '') || '';
            return window.localStorage.getItem(REF_PARTNER_KEY) || '';
        } catch (e) { return ''; }
    }
    function writeRefPartner(code) {
        try {
            if (typeof YEStorage !== 'undefined' && YEStorage.set) { YEStorage.set(REF_PARTNER_KEY, code); return; }
            window.localStorage.setItem(REF_PARTNER_KEY, code);
        } catch (e) { /* localStorage 不可環境では黙って諦める（機能は落ちない） */ }
    }

    /**
     * URL の ?ref_partner を読み、正しければ localStorage に保存する。
     * 一度保存したら、後から ?ref_partner 無しで開いても保持され続ける（別の有効コードで来たら上書き）。
     */
    function captureFromUrl() {
        try {
            var code = new URLSearchParams(window.location.search).get('ref_partner');
            if (code && isPartnerCode(code)) writeRefPartner(code);
        } catch (e) { /* 解析失敗は黙殺 */ }
    }

    /**
     * kimito.link 系 URL に、保持中のパートナーコードを ?ref_partner= として付ける。
     * 既存クエリがあれば & で連結。ref_partner が無ければ base をそのまま返す。
     * 例) getKimitoUrlWithRef('https://kimito.link/') → 'https://kimito.link/?ref_partner=otani'
     */
    function getKimitoUrlWithRef(base) {
        var code = readRefPartner();
        if (!code || !isPartnerCode(code)) return base;
        var sep = base.indexOf('?') >= 0 ? '&' : '?';
        return base + sep + 'ref_partner=' + encodeURIComponent(code);
    }

    /** パートナーコードを持っているか（歓迎バーや監修表記の出し分けに使う）。 */
    function hasRefPartner() {
        var code = readRefPartner();
        return !!(code && isPartnerCode(code));
    }

    /**
     * 初回のみ、画面上部に小さな歓迎バーを1回だけ出す。
     * クリニック名は出さない（コードとクリニックの対応は kimito 台帳が持つ＝静的側は知らない）。
     * ロンジェビティ・スコアへ誘導する（大谷先生の関心の中心＝この機能）。
     */
    function showWelcomeOnce() {
        if (!hasRefPartner()) return;
        var shown = '';
        try { shown = window.localStorage.getItem(WELCOME_SHOWN_KEY) || ''; } catch (e) {}
        if (shown === '1') return;

        var mount = document.querySelector('.app-screen') || document.getElementById('today-screen');
        if (!mount) return;

        var bar = document.createElement('div');
        bar.className = 'refpartner-welcome';
        bar.setAttribute('role', 'note');
        bar.style.cssText = 'margin:12px 0; padding:12px 14px; background:linear-gradient(135deg,#c9899a14,#a78a6b14); border:1px solid #c9899a55; border-radius:16px; font-size:.8rem; color:#2e2622; line-height:1.6; letter-spacing:.03em;';
        bar.innerHTML =
            '🌿 <strong>クリニックからようこそ。</strong><br>' +
            'まずは今日の <button type="button" class="refpartner-welcome__go" style="background:none; border:none; padding:0; color:#c9899a; font-weight:700; text-decoration:underline; cursor:pointer; font-size:inherit; font-family:inherit;">ロンジェビティ・スコア</button> を見てみましょう。';

        // ロンジェビティ・スコアの直前に差し込む（無ければ先頭）。
        var anchor = document.getElementById('today-longevity');
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor);
        else mount.insertBefore(bar, mount.firstChild);

        var go = bar.querySelector('.refpartner-welcome__go');
        if (go) {
            go.addEventListener('click', function () {
                var t = document.getElementById('today-longevity');
                if (t && t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }

        try { window.localStorage.setItem(WELCOME_SHOWN_KEY, '1'); } catch (e) {}
    }

    // URL キャプチャは即時（描画を待たない）。歓迎バーは DOM 構築後。
    captureFromUrl();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showWelcomeOnce);
    } else {
        showWelcomeOnce();
    }

    // グローバル公開（他 widget から使う）。
    window.RefPartner = {
        get: readRefPartner,
        has: hasRefPartner,
        isPartnerCode: isPartnerCode,
        getKimitoUrlWithRef: getKimitoUrlWithRef,
        showWelcomeOnce: showWelcomeOnce
    };
    // 短縮エイリアス（mindcare/longevity から直接呼べるように）。
    window.getKimitoUrlWithRef = getKimitoUrlWithRef;
})();
