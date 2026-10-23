/**
 * 紹介ページ（/guide/）専用。
 * いま開いているアドレス（保存済みの紹介コードがあればそれを付ける）を表示し、QR にする。
 * コードの値はページに書かない。refpartner.js が受け取ったものだけを使う。
 * LINE の追加リンクはスマホだけ有効。iPad・パソコンはページ内の QR のまま。
 */
(function () {
    'use strict';

    function lineAppLikely() {
        var ua = navigator.userAgent || '';
        if (/iPhone|iPod/.test(ua)) return true;
        if (/Android/.test(ua) && /Mobile/.test(ua)) return true;
        return false;
    }

    function upgradeLine() {
        if (!lineAppLikely()) return;
        var links = document.querySelectorAll('[data-line-add]');
        for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute('data-line-href');
            if (!href) continue;
            links[i].setAttribute('href', href);
            links[i].setAttribute('target', '_blank');
            links[i].setAttribute('rel', 'noopener');
        }
    }

    function pageUrl() {
        var url = new URL(window.location.href);
        url.hash = '';
        if (url.searchParams.get('ref_partner')) return url.href;
        if (window.RefPartner && typeof window.RefPartner.getKimitoUrlWithRef === 'function') {
            return window.RefPartner.getKimitoUrlWithRef(url.href);
        }
        return url.href;
    }

    function fillShare() {
        var share = pageUrl();
        var readable = share.replace(/([/?&=])/g, '$1\u200b');
        var slots = document.querySelectorAll('[data-guide-url]');
        for (var i = 0; i < slots.length; i++) slots[i].textContent = readable;

        var img = document.querySelector('[data-guide-qr]');
        if (!img || typeof qrcode !== 'function') return;
        try {
            if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
                qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
            }
            var qr = qrcode(0, 'M');
            qr.addData(share);
            qr.make();
            img.src = qr.createDataURL(6, 2);
            img.hidden = false;
        } catch (e) {
            img.hidden = true;
        }
    }

    function init() {
        upgradeLine();
        fillShare();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
