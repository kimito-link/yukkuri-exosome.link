// iOS アプリ（Capacitor WKWebView）内で「Googleで続ける」を出さないことを機械検査する。
// ★2026-10-27 実損: iOS 0.2.1 で Google を押すと外部 Safari の accounts.google.com が真っ白になった。
//   Google は埋め込み WebView の OAuth を拒否する（disallowed_useragent）ので、iOS シェルでは隠す。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const auth = readFileSync(join(ROOT, 'src/js/auth.js'), 'utf8');
const cap = readFileSync(join(ROOT, 'capacitor.config.ts'), 'utf8');

function extract(name) {
  const start = auth.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' が見つかりません');
  let depth = 0;
  for (let i = auth.indexOf('{', start); i < auth.length; i++) {
    if (auth[i] === '{') depth++;
    else if (auth[i] === '}' && --depth === 0) return auth.slice(start, i + 1);
  }
  throw new Error('括弧が閉じていません: ' + name);
}

const note = auth.match(/var IOS_SHELL_LOGIN_NOTE = '[^']*';/);

function load(windowObj) {
  const ctx = { window: windowObj, sessionStorage: windowObj.sessionStorage, Object };
  vm.createContext(ctx);
  vm.runInContext(note[0] + extract('isIosShell') + extract('withoutGoogleForIosShell'), ctx);
  return ctx;
}

const store = (v) => ({ getItem: (k) => (k === 'ye_shell' ? v : null) });

test('Capacitor の iOS、または ye_shell=ios のときだけ iOS シェルと判定する', () => {
  assert.equal(load({ Capacitor: { getPlatform: () => 'ios' }, sessionStorage: store(null) }).isIosShell(), true);
  assert.equal(load({ sessionStorage: store('ios') }).isIosShell(), true);
  assert.equal(load({ sessionStorage: store(null) }).isIosShell(), false);
  assert.equal(load({ Capacitor: { getPlatform: () => 'web' }, sessionStorage: store('android') }).isIosShell(), false);
});

test('iOS シェル用の設定は Google ボタンだけ隠し、X / Apple の見た目は残す', () => {
  assert.ok(note, 'IOS_SHELL_LOGIN_NOTE がありません');
  const ctx = load({ sessionStorage: store('ios') });
  const base = {
    appearance: { elements: { socialButtonsBlockButton__apple: { a: 1 }, socialButtonsBlockButton__google: { b: 1 } } },
    localization: { signIn: { start: { title: 'T' } } }
  };
  const out = ctx.withoutGoogleForIosShell(base);
  assert.equal(out.appearance.elements.socialButtonsBlockButton__google.display, 'none');
  assert.equal(out.appearance.elements.socialButtonsIconButton__google.display, 'none');
  assert.deepEqual(out.appearance.elements.socialButtonsBlockButton__apple, { a: 1 });
  assert.equal(out.localization.signIn.start.title, 'T');
  assert.match(out.localization.signIn.start.subtitle, /Apple/);
  assert.match(out.localization.signIn.start.subtitle, /Google/);
  // 元の共有オブジェクトは書き換えない（clerk-ui-options.js は姉妹サイト共通部品）
  assert.deepEqual(base.appearance.elements.socialButtonsBlockButton__google, { b: 1 });
  // 設定が空でも落ちない
  assert.equal(ctx.withoutGoogleForIosShell({}).appearance.elements.socialButtonsBlockButton__google.display, 'none');
});

test('loadUiOptions が iOS シェルで Google を外す処理と CSS の保険を通っている', () => {
  const body = extract('loadUiOptions');
  assert.match(body, /isIosShell\(\)\s*\?\s*withoutGoogleForIosShell\(opts\)/);
  assert.match(body, /hideGoogleInIosShell\(\)/);
  assert.match(extract('hideGoogleInIosShell'), /cl-socialButtonsBlockButton__google/);
});

test('accounts.google.com は allowNavigation に入れない（入れても WebView では拒否される）', () => {
  assert.doesNotMatch(cap, /'[^']*google\.com'/);
});
