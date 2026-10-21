/* LP-only wiring: reuse referral capture; never send health data or provision payments. */
(function () {
    'use strict';
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
        var native = false;
        try {
            native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        } catch (e) { native = true; }
        if (!native) {
            var webOnly = document.querySelectorAll('[data-lp-web-only]');
            for (var j = 0; j < webOnly.length; j++) webOnly[j].hidden = false;
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
