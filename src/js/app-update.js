/**
 * 画面の更新案内。
 *
 * Web（このサイトの新しいデプロイ）:
 *   このファイルに焼き込んだ webBuild と、no-store で取り直した /app-release.json を比べる。
 *   HTML や JS が WebView に残っていても、JSON だけ新しければ「新しいバージョンがあります」を出す。
 *   ストアの審査は不要。本番の Web を出したあと、いま入っている iOS / Android アプリにも届く
 *   （どちらも https://exosome.kimito.link を表示しているため）。
 *
 * ストアのアプリ本体（スプラッシュや WebView のピンチ禁止など）:
 *   シェルが自分のバージョンを教えてきたときだけ比べる。
 *   iOS は次のバイナリが WKUserScript で sessionStorage に入れる。
 *   Android は次の TWA が起動 URL に ye_shell / ye_shell_ver を付ける。
 *   いま公開中の 0.2.0（iOS）はバージョンを送らないので、ストア更新の案内は出せない。
 *   その案内を出すこと自体に、次のストア申請が要る。
 */
(function () {
    'use strict';

    var YE_WEB_BUILD = '20261025.1';
    var SELF = (document.currentScript && document.currentScript.src) || '';
    var ROOT = SELF.replace(/js\/app-update\.js(\?.*)?$/, '');

    function captureShellHint() {
        var params;
        try { params = new URLSearchParams(location.search); }
        catch (e) { return; }
        var platform = params.get('ye_shell');
        var ver = params.get('ye_shell_ver');
        if (platform && ver) {
            try {
                sessionStorage.setItem('ye_shell', platform);
                sessionStorage.setItem('ye_shell_ver', ver);
            } catch (e) {}
        }
        if (!params.has('ye_shell') && !params.has('ye_shell_ver') && !params.has('ye_fresh')) return;
        params.delete('ye_shell');
        params.delete('ye_shell_ver');
        params.delete('ye_fresh');
        var next = params.toString();
        try {
            history.replaceState(null, '', location.pathname + (next ? '?' + next : '') + location.hash);
        } catch (e) {}
    }

    function shellHint() {
        try {
            return {
                platform: sessionStorage.getItem('ye_shell') || '',
                version: sessionStorage.getItem('ye_shell_ver') || ''
            };
        } catch (e) {
            return { platform: '', version: '' };
        }
    }

    /** "1.2.3" を比較。a < b なら -1。 */
    function compareVersions(a, b) {
        var pa = String(a || '').split('.');
        var pb = String(b || '').split('.');
        var n = Math.max(pa.length, pb.length, 3);
        for (var i = 0; i < n; i++) {
            var da = parseInt(pa[i], 10);
            var db = parseInt(pb[i], 10);
            if (isNaN(da)) da = 0;
            if (isNaN(db)) db = 0;
            if (da < db) return -1;
            if (da > db) return 1;
        }
        return 0;
    }

    function showBanner(opts) {
        if (document.getElementById('ye-update-banner')) return;
        var key = opts.key || 'web';
        try {
            if (sessionStorage.getItem('ye-update-dismissed') === key) return;
        } catch (e) {}
        var bar = document.createElement('div');
        bar.id = 'ye-update-banner';
        bar.className = 'ye-update';
        bar.setAttribute('role', 'status');
        var text = document.createElement('p');
        text.className = 'ye-update__text';
        text.textContent = opts.message;
        bar.appendChild(text);
        if (opts.href) {
            var link = document.createElement('a');
            link.className = 'ye-update__go';
            link.href = opts.href;
            link.rel = 'noopener';
            link.textContent = 'ストアを開く';
            bar.appendChild(link);
        } else {
            var go = document.createElement('button');
            go.type = 'button';
            go.className = 'ye-update__go';
            go.textContent = '更新する';
            go.addEventListener('click', function () {
                var url;
                try { url = new URL(location.href); }
                catch (e) { location.reload(); return; }
                url.searchParams.set('ye_fresh', String(Date.now()));
                location.replace(url.pathname + url.search + url.hash);
            });
            bar.appendChild(go);
        }
        var later = document.createElement('button');
        later.type = 'button';
        later.className = 'ye-update__later';
        later.textContent = 'あとで';
        later.addEventListener('click', function () {
            try { sessionStorage.setItem('ye-update-dismissed', key); } catch (e) {}
            bar.remove();
        });
        bar.appendChild(later);
        document.body.appendChild(bar);
    }

    function watchServiceWorker() {
        if (!('serviceWorker' in navigator) || !ROOT) return;
        navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT || '/' }).then(function (reg) {
            if (reg.update) reg.update().catch(function () {});
            reg.addEventListener('updatefound', function () {
                var worker = reg.installing;
                if (!worker) return;
                worker.addEventListener('statechange', function () {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        showBanner({
                            key: 'sw',
                            message: '新しいバージョンがあります'
                        });
                    }
                });
            });
        }).catch(function () {});
    }

    function checkRelease() {
        if (!ROOT) return;
        fetch(ROOT + 'app-release.json', { cache: 'no-store', credentials: 'same-origin' })
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (data) {
                if (!data) return;
                var hint = shellHint();
                var shellLatest = data.shell && hint.platform ? data.shell[hint.platform] : '';
                if (hint.version && shellLatest && compareVersions(hint.version, shellLatest) < 0) {
                    var storeName = hint.platform === 'android' ? 'Google Play' : 'App Store';
                    var href = (data.storeUrl && data.storeUrl[hint.platform]) || '';
                    showBanner({
                        key: 'shell:' + shellLatest,
                        message: storeName + ' に新しいバージョンがあります',
                        href: href
                    });
                    return;
                }
                if (data.webBuild && data.webBuild !== YE_WEB_BUILD) {
                    showBanner({
                        key: 'web:' + data.webBuild,
                        message: '新しいバージョンがあります'
                    });
                }
            })
            .catch(function () {});
    }

    captureShellHint();
    watchServiceWorker();
    checkRelease();
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') checkRelease();
    });

    window.YEAppUpdate = {
        webBuild: YE_WEB_BUILD,
        compareVersions: compareVersions
    };
})();
