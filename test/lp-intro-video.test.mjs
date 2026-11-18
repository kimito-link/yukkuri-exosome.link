import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const wiring = readFileSync(new URL('../src/js/lp-clinic.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../src/lp/index.html', import.meta.url), 'utf8');
const APP_SRC = '../videos/exosome-intro-app.mp4';
const WEB_SRC = '../videos/exosome-intro-web.mp4';

// LP を開いたときの紹介動画を再現する（app / web どちらの動画になるか）。
function openLP({ native = false, brokenBridge = false, shell = '', standalone = false, referrer = '' } = {}) {
  const source = { attrs: { src: APP_SRC }, getAttribute(k) { return this.attrs[k] ?? null; }, setAttribute(k, v) { this.attrs[k] = v; } };
  let loads = 0;
  const video = {
    attrs: { 'data-web-src': WEB_SRC },
    getAttribute(k) { return this.attrs[k] ?? null; }, setAttribute(k, v) { this.attrs[k] = v; },
    querySelector: sel => (sel === 'source' ? source : null), load() { loads++; },
  };
  const listeners = [];
  const window = {
    location: new URL('https://exosome.kimito.link/lp/'),
    Capacitor: { isNativePlatform() { if (brokenBridge) throw new Error('unavailable'); return native; } },
    sessionStorage: { getItem: k => (k === 'ye_shell' && shell ? shell : null) },
    matchMedia: q => ({ matches: standalone && q === '(display-mode: standalone)' }),
  };
  const context = {
    window, URL,
    document: {
      readyState: 'loading', referrer, addEventListener: (_, fn) => listeners.push(fn),
      querySelectorAll: sel => (sel === '[data-lp-intro-video]' ? [video] : []),
    },
  };
  runInNewContext(wiring, context);
  listeners.forEach(fn => fn());
  return { src: source.attrs.src, variant: video.attrs['data-variant'], loads };
}

test('browsers get the Web/SNS intro video', () => {
  const r = openLP();
  assert.equal(r.src, WEB_SRC);
  assert.equal(r.variant, 'web');
  assert.equal(r.loads, 1);
});

test('iOS / Android app shells and unclear cases keep the store-safe video (no LINE or paid wording)', () => {
  for (const opts of [{ native: true }, { brokenBridge: true }, { shell: 'ios' }, { shell: 'android' }, { standalone: true }, { referrer: 'android-app://com.kimito.link.yukkuriexosome/' }]) {
    const r = openLP(opts);
    assert.equal(r.src, APP_SRC, JSON.stringify(opts));
    assert.equal(r.variant, 'app', JSON.stringify(opts));
    assert.equal(r.loads, 0, JSON.stringify(opts));
  }
});

test('markup defaults to the store-safe video and stays lightweight (tap to play, no autoplay)', () => {
  const m = html.match(/<video[^>]*data-lp-intro-video[^>]*>[\s\S]*?<\/video>/);
  assert.ok(m, 'intro video exists');
  const tag = m[0];
  assert.match(tag, /<source src="\.\.\/videos\/exosome-intro-app\.mp4" type="video\/mp4">/);
  assert.match(tag, /data-web-src="\.\.\/videos\/exosome-intro-web\.mp4"/);
  assert.match(tag, /preload="none"/);
  assert.match(tag, /playsinline/);
  assert.match(tag, /controls/);
  assert.match(tag, /poster="\.\.\/images\/movie\/exosome-intro-poster\.jpg"/);
  assert.doesNotMatch(tag, /autoplay|muted|loop/);
  // 価値（使い方）を先に読んでから動画へ。
  assert.ok(html.indexOf('id="lp-use"') < html.indexOf('id="lp-intro"'));
  assert.ok(html.indexOf('id="lp-intro"') < html.indexOf('id="lp-features"'));
  assert.match(html, /診断・治療のためのアプリではありません/);
});

test('video files are small enough for the LP', () => {
  for (const f of ['exosome-intro-app.mp4', 'exosome-intro-web.mp4']) {
    const size = statSync(new URL(`../src/videos/${f}`, import.meta.url)).size;
    assert.ok(size < 6 * 1024 * 1024, `${f} is ${size} bytes`);
  }
  assert.ok(statSync(new URL('../src/images/movie/exosome-intro-poster.jpg', import.meta.url)).size < 200 * 1024);
});
