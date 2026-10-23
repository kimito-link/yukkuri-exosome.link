import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const guide = readFileSync(new URL('../src/guide/index.html', import.meta.url), 'utf8');
const price = readFileSync(new URL('../src/price/index.html', import.meta.url), 'utf8');
const lp = readFileSync(new URL('../src/lp/index.html', import.meta.url), 'utf8');
const about = readFileSync(new URL('../src/about/index.html', import.meta.url), 'utf8');
const guideJs = readFileSync(new URL('../src/js/guide-page.js', import.meta.url), 'utf8');
const ref = readFileSync(new URL('../src/js/refpartner.js', import.meta.url), 'utf8');
const wiring = readFileSync(new URL('../src/js/lp-clinic.js', import.meta.url), 'utf8');

const pages = { guide, price };

function hrefs(html) {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)].map((m) => ({
    href: m[1],
    ref: /\sdata-ref-link(?:\s|>)/.test(m[0]) || /data-ref-link\s/.test(m[0]),
    tag: m[0],
  }));
}

test('guide and price stay on directory URLs and do not bake in a partner code', () => {
  for (const [name, html] of Object.entries(pages)) {
    assert.doesNotMatch(html, /ref_partner=/);
    assert.doesNotMatch(html, /完全無料|若返|治る|アンチエイジング/);
    assert.match(html, /基本無料/);
    assert.match(html, /診断・治療を目的としたものではありません/);
    assert.match(html, /演出であり、身体の測定値や施術の効果を示すものではありません/);
    assert.match(html, /js\/refpartner\.js/);
    assert.match(html, /js\/lp-clinic\.js/);
    for (const link of hrefs(html)) {
      assert.doesNotMatch(link.href, /index\.html/);
      if (link.ref) assert.doesNotMatch(link.href, /^https:\/\/lin\.ee\//);
    }
    assert.ok(name);
  }
  assert.match(guide, /このアプリでできること/);
  assert.match(guide, /使うと、こんなところが良い/);
  assert.match(guide, /はじめ方/);
  assert.match(guide, /data-guide-qr/);
  assert.match(guide, /data-line-add/);
  assert.match(price, /要相談/);
  assert.match(price, /パートナー条件による/);
  assert.match(price, /無料（0円）/);
  assert.match(price, /data-lp-web-only hidden/);
  assert.doesNotMatch(price, /20%|５%|5%/);
  assert.doesNotMatch(guideJs, /ref_partner=/);
  assert.doesNotMatch(guide + price, /1億|980円|月額[0-9]/);
});

test('LP and about link into the guide and the price table', () => {
  assert.match(lp, /href="\.\.\/guide\/"/);
  assert.match(lp, /href="\.\.\/price\/"/);
  assert.match(about, /href="\.\.\/guide\/"/);
  assert.match(about, /href="\.\.\/price\/"/);
});

function openPage(html, query, { native = false } = {}) {
  const found = hrefs(html).filter((link) => link.ref);
  const anchors = found.map((link) => ({
    href: link.href,
    getAttribute(key) { return this[key]; },
    setAttribute(key, value) { this[key] = value; },
  }));
  const hidden = [];
  const re = /data-lp-web-only hidden/g;
  while (re.exec(html)) hidden.push({ hidden: true });
  const listeners = [];
  const stored = new Map();
  const location = new URL(`https://exosome.kimito.link/guide/${query}`);
  const localStorage = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  };
  const window = {
    location,
    localStorage,
    Capacitor: { isNativePlatform() { return native; } },
  };
  const context = {
    window,
    URL,
    URLSearchParams,
    YEStorage: {
      get: (key, fallback) => localStorage.getItem(`ye_${key}`) ?? fallback,
      set: (key, value) => localStorage.setItem(`ye_${key}`, value),
    },
    document: {
      readyState: 'loading',
      addEventListener: (_, fn) => listeners.push(fn),
      querySelector: () => null,
      getElementById: () => null,
      querySelectorAll: (selector) => selector === '[data-ref-link]' ? anchors : hidden,
    },
  };
  runInNewContext(ref, context);
  runInNewContext(wiring, context);
  listeners.forEach((fn) => fn());
  return { anchors, stored, hidden };
}

test('a partner code on the page is copied onto registration links and not invented', () => {
  const opened = openPage(guide, '?ref_partner=otani');
  assert.equal(opened.stored.get('ye_ref_partner'), 'otani');
  assert.ok(opened.anchors.length >= 2);
  for (const anchor of opened.anchors) {
    const url = new URL(anchor.href, 'https://exosome.kimito.link/guide/');
    assert.equal(url.searchParams.get('ref_partner'), 'otani');
  }
  const bare = openPage(guide, '');
  for (const anchor of bare.anchors) {
    assert.equal(new URL(anchor.href, 'https://exosome.kimito.link/guide/').searchParams.has('ref_partner'), false);
  }
});

test('clinic commercial terms stay hidden in the native shell', () => {
  assert.equal(openPage(price, '').hidden.every((node) => node.hidden === false), true);
  assert.equal(openPage(price, '', { native: true }).hidden.every((node) => node.hidden === true), true);
});
