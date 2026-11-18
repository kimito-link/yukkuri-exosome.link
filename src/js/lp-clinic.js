/* LP-only wiring: reuse referral capture; never send health data or provision payments. */
(function () {
    'use strict';
    /**
     * iOS（Capacitor）・Android（TWA）・ホーム画面のウェブアプリで開いているか。
     * アプリは本番Webをそのまま表示するので、迷ったら「アプリ」とみなす（外部の購入・LINE導線を出さない側に倒す）。
     */
    function isAppShell() {
        try {
            if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return true;
        } catch (e) { return true; }
        try {
            if (window.sessionStorage && window.sessionStorage.getItem('ye_shell')) return true;
        } catch (e) {}
        try {
            if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
        } catch (e) {}
        try {
            if (typeof document.referrer === 'string' && document.referrer.indexOf('android-app://') === 0) return true;
        } catch (e) {}
        return false;
    }
    function init() {
        var links = document.querySelectorAll('[data-ref-link]');
        if (window.RefPartner) {
            for (var i = 0; i < links.length; i++) {
                var base = links[i].getAttribute('href');
                if (!base) continue;
                // Destinations come only from the owned LP markup, never from query input.
                var target = new URL(base, window.location.href);
                if (target.origin !== window.location.origin && target.origin !== 'https://kimito.link') continue;
                links[i].setAttribute('href', window.RefPartner.getKimitoUrlWithRef(target.href));
            }
        }
        var app = isAppShell();
        if (!app) {
            var webOnly = document.querySelectorAll('[data-lp-web-only]');
            for (var j = 0; j < webOnly.length; j++) webOnly[j].hidden = false;
        }
        // 紹介動画：既定はストア向け版。ブラウザのときだけ Web/SNS 版（LINE・料金の案内を含む）へ差し替える。
        var videos = document.querySelectorAll('[data-lp-intro-video]');
        for (var k = 0; k < videos.length; k++) {
            var v = videos[k];
            var webSrc = v.getAttribute('data-web-src');
            if (app || !webSrc) { v.setAttribute('data-variant', 'app'); continue; }
            var source = v.querySelector('source');
            if (source) source.setAttribute('src', webSrc);
            else v.setAttribute('src', webSrc);
            v.setAttribute('data-variant', 'web');
            if (typeof v.load === 'function') v.load();
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
