import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const ref = readFileSync(new URL('../src/js/refpartner.js', import.meta.url), 'utf8');
const wiring = readFileSync(new URL('../src/js/lp-clinic.js', import.meta.url), 'utf8');
const lineHtml = readFileSync(new URL('../src/line/index.html', import.meta.url), 'utf8');
const srcRoot = join(here, '../src');
const knowledgeRoot = join(here, '../knowledge-pack');

function openRef(query, { savedCode, native = false } = {}) {
  const stored = new Map();
  if (savedCode !== undefined && savedCode !== null) stored.set('ye_ref_partner', savedCode);
  const listeners = [];
  const location = new URL(`https://exosome.kimito.link/line/${query}`);
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
      querySelectorAll: () => [],
    },
  };
  runInNewContext(ref, context);
  return { stored, window, listeners, context };
}

function openLine(query, { savedCode = '' } = {}) {
  const hrefs = [...lineHtml.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)].map((m) => ({
    href: m[1],
    tag: m[0],
    ref: /\sdata-ref-link(?:\s|>|\/)/.test(m[0]),
  }));
  const anchors = hrefs.filter((link) => link.ref).map((link) => ({
    href: link.href,
    getAttribute(key) { return this[key]; },
    setAttribute(key, value) { this[key] = value; },
  }));
  const hidden = [];
  const listeners = [];
  const stored = new Map(savedCode ? [['ye_ref_partner', savedCode]] : []);
  const location = new URL(`https://exosome.kimito.link/line/${query}`);
  const localStorage = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  };
  const window = {
    location,
    localStorage,
    Capacitor: { isNativePlatform() { return false; } },
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
      querySelectorAll: (selector) => (
        selector === '[data-ref-link]' ? anchors
          : selector === '[data-lp-web-only]' ? hidden
            : []
      ),
    },
  };
  runInNewContext(ref, context);
  runInNewContext(wiring, context);
  listeners.forEach((fn) => fn());
  return { anchors, stored, hrefs };
}

test('すでに有効な紹介コードがあるときは、あとから来たコードで上書きしない（先着）', () => {
  const first = openRef('?ref_partner=clinic-a');
  assert.equal(first.stored.get('ye_ref_partner'), 'clinic-a');

  const again = openRef('?ref_partner=clinic-b', { savedCode: 'clinic-a' });
  assert.equal(again.stored.get('ye_ref_partner'), 'clinic-a');
  assert.equal(
    again.window.RefPartner.getKimitoUrlWithRef('https://kimito.link/partner/'),
    'https://kimito.link/partner/?ref_partner=clinic-a',
  );
});

test('保存が無いときだけ URL の有効なコードを受け取り、形式が違う値は残さない', () => {
  const fresh = openRef('?ref_partner=clinic-a');
  assert.equal(fresh.stored.get('ye_ref_partner'), 'clinic-a');
  const rejected = openRef('?ref_partner=user_private');
  assert.equal(rejected.stored.has('ye_ref_partner'), false);
  const replaced = openRef('?ref_partner=clinic-a', { savedCode: 'user_private' });
  assert.equal(replaced.stored.get('ye_ref_partner'), 'clinic-a');
});

test('すでに pt= または ref_partner= がある URL には ref_partner を足さない', () => {
  const { window } = openRef('?ref_partner=clinic-a');
  const withPt = 'https://kimito.link/api/ref-line?pt=RH-AB12&next=/dashboard/longevity/';
  assert.equal(window.RefPartner.getKimitoUrlWithRef(withPt), withPt);
  const already = 'https://kimito.link/partner/?ref_partner=clinic-b';
  assert.equal(window.RefPartner.getKimitoUrlWithRef(already), already);
  const bare = window.RefPartner.getKimitoUrlWithRef('https://kimito.link/');
  assert.equal(bare, 'https://kimito.link/?ref_partner=clinic-a');
  assert.equal(new URL(bare).searchParams.getAll('ref_partner').length, 1);
});

test('/line/ は紹介コードを受け取り、アプリへのリンクにだけ付け、LINEの追加リンクには付けない', () => {
  assert.match(lineHtml, /js\/refpartner\.js/);
  assert.match(lineHtml, /js\/lp-clinic\.js/);
  assert.doesNotMatch(lineHtml, /ref_partner=/);
  const opened = openLine('?ref_partner=clinic-a');
  assert.equal(opened.stored.get('ye_ref_partner'), 'clinic-a');
  assert.ok(opened.anchors.length >= 1);
  for (const anchor of opened.anchors) {
    const url = new URL(anchor.href, 'https://exosome.kimito.link/line/');
    assert.equal(url.searchParams.get('ref_partner'), 'clinic-a');
    assert.doesNotMatch(anchor.href, /lin\.ee/);
  }
  for (const link of opened.hrefs) {
    if (link.href.includes('lin.ee') || (link.tag.includes('lin.ee'))) {
      assert.equal(link.ref, false);
    }
  }
  const later = openLine('?ref_partner=clinic-b', { savedCode: 'clinic-a' });
  assert.equal(later.stored.get('ye_ref_partner'), 'clinic-a');
  assert.equal(
    new URL(later.anchors[0].href, 'https://exosome.kimito.link/line/').searchParams.get('ref_partner'),
    'clinic-a',
  );
});

function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

test('ページと知識パックに、既定の紹介コードは埋め込んでいない', () => {
  const files = [...walkFiles(srcRoot), ...walkFiles(knowledgeRoot)];
  const hits = [];
  for (const file of files) {
    const body = readFileSync(file, 'utf8');
    if (/ref_partner=otani/.test(body)) hits.push(file.replace(join(here, '..') + '/', ''));
  }
  assert.deepEqual(hits, []);
  const htmlFiles = walkFiles(srcRoot).filter((f) => f.endsWith('.html'));
  const missing = htmlFiles.filter((f) => !readFileSync(f, 'utf8').includes('refpartner.js'));
  assert.deepEqual(missing, []);
});
