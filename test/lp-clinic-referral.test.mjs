import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const ref = readFileSync(new URL('../src/js/refpartner.js', import.meta.url), 'utf8');
const wiring = readFileSync(new URL('../src/js/lp-clinic.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../src/lp/index.html', import.meta.url), 'utf8');

function openLP(query, { savedCode = '', native = false, brokenBridge = false } = {}) {
  const stored = new Map(savedCode ? [['ye_ref_partner', savedCode]] : []);
  const anchors = ['../', 'https://kimito.link/dashboard/longevity/', 'https://kimito.link/partner/', 'https://apps.apple.com/jp/app/id6775201794'].map(href => ({
    href, getAttribute(key) { return this[key]; }, setAttribute(key, value) { this[key] = value; },
  }));
  const terms = { hidden: true };
  const listeners = [];
  const location = new URL(`https://exosome.kimito.link/lp/${query}`);
  const localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
  const window = { location, localStorage, Capacitor: { isNativePlatform() { if (brokenBridge) throw new Error('unavailable'); return native; } } };
  const context = {
    window, URL, URLSearchParams,
    YEStorage: { get: (key, fallback) => localStorage.getItem(`ye_${key}`) ?? fallback, set: (key, value) => localStorage.setItem(`ye_${key}`, value) },
    document: {
      readyState: 'loading', addEventListener: (_, fn) => listeners.push(fn),
      querySelector: () => null, getElementById: () => null,
      querySelectorAll: selector => selector === '[data-ref-link]' ? anchors : [terms],
    },
  };
  runInNewContext(ref, context);
  runInNewContext(wiring, context);
  listeners.forEach(fn => fn());
  return { anchors, stored, terms };
}

test('LP → app → kimito links preserve the same partner code using shared storage', () => {
  const { anchors, stored } = openLP('?ref_partner=otani');
  assert.equal(stored.get('ye_ref_partner'), 'otani');
  for (const anchor of anchors.slice(0, 3)) assert.equal(new URL(anchor.href).searchParams.get('ref_partner'), 'otani');
  assert.equal(anchors[0].href, 'https://exosome.kimito.link/?ref_partner=otani');
  assert.equal(anchors[3].href, 'https://apps.apple.com/jp/app/id6775201794');
});

test('returning visitors retain attribution without a query, while malformed identifiers are rejected', () => {
  assert.equal(new URL(openLP('', { savedCode: 'otani' }).anchors[1].href).searchParams.get('ref_partner'), 'otani');
  for (const query of ['?ref_partner=user_private', '?ref_partner=%3Cscript%3E', '?ref_partner=https%3A%2F%2Fevil.example']) {
    const { stored, anchors } = openLP(query);
    assert.equal(stored.size, 0);
    assert.equal(new URL(anchors[1].href).searchParams.has('ref_partner'), false);
  }
});

test('commercial partner guidance is hidden in native shells and on bridge failures', () => {
  assert.equal(openLP('').terms.hidden, false);
  assert.equal(openLP('', { native: true }).terms.hidden, true);
  assert.equal(openLP('', { brokenBridge: true }).terms.hidden, true);
  assert.match(html, /data-lp-web-only hidden/);
});

test('LP has readable app and clinic sections, accurate local storage copy, and no automatic sync promise', () => {
  for (const id of ['lp-features', 'lp-screens', 'lp-privacy', 'clinic-partner', 'lp-faq']) assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /使っている端末・ブラウザに保存/);
  assert.doesNotMatch(html, /引き継ぎ用に kimito\.link へ複製|すべての機能を無料|記録は機種を変えても続きます/);
  assert.match(html, /運営が成果を確認/);
  assert.match(html, /紹介料の対象は、提携条件で定めるアプリ・サービスの利用料/);
});
