// Xワンタップログインの配線が、実際の src/js/auth.js と部品ファイルから外れていないかを機械検査する。
//
// 部品 src/js/x-one-tap-signin.js は web-ios-android/templates/web/auth-mode/x-one-tap-signin.js.example
// のバイト一致コピー（kit 側 check-drift の PAIRS で同期を見る）。ここでは「配線が生きているか」だけを見る。
// ★正本の設計: CLERK_X_LOGIN_PLAYBOOK §4.1（clickを奪わず送る）・§4.1.1（ネイティブでは発火しない）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const auth = readFileSync(join(ROOT, 'src/js/auth.js'), 'utf8');
const part = join(ROOT, 'src/js/x-one-tap-signin.js');

test('部品ファイルが src/js/ に存在し、window.KimitoXOneTapSignIn を公開している', () => {
  assert.ok(existsSync(part), 'src/js/x-one-tap-signin.js がありません');
  assert.match(readFileSync(part, 'utf8'), /window\.KimitoXOneTapSignIn\s*=/);
});

test('openSignIn() が Clerk.openSignIn の直後に triggerAutoXClick を呼んでいる', () => {
  const start = auth.indexOf('function openSignIn');
  assert.notEqual(start, -1, 'openSignIn関数が見つかりません');
  const body = auth.slice(start, start + 2800);
  const open = body.indexOf('Clerk.openSignIn(');
  const fire = body.indexOf('triggerAutoXClick');
  assert.ok(open !== -1 && fire > open, 'Clerk.openSignIn の後に triggerAutoXClick がありません');
});

test('Clerk の認証フローを直接呼ばない（authenticateWithRedirect / signIn.sso への置換は禁止）', () => {
  assert.doesNotMatch(auth, /authenticateWithRedirect|signIn\.sso\(/);
});

test('部品の読み込みはネイティブ（Capacitor）では行わず、失敗しても resolve する（fail-safe）', () => {
  const start = auth.indexOf('function loadOneTap');
  assert.notEqual(start, -1, 'loadOneTap関数が見つかりません');
  const body = auth.slice(start, start + 900);
  assert.match(body, /isNativePlatform/);
  assert.match(body, /s\.onerror\s*=\s*function\s*\(\)\s*\{\s*resolve\(\)/);
});

test('部品の場所は自分自身の src から導いている（ページ階層が違っても壊れない）', () => {
  assert.match(auth, /document\.currentScript/);
  assert.match(auth, /replace\(\/auth\\\.js/);
});

test('ワンタップは「人がタップした呼び出し」のときだけ（読み込み時の関所経由で強制遷移させない）', () => {
  const start = auth.indexOf('function openSignIn');
  const body = auth.slice(start, start + 2800);
  assert.match(body, /var viaTap\s*=\s*!!\(navigator\.userActivation && navigator\.userActivation\.isActive\)/);
  assert.match(body, /if \(viaTap && window\.KimitoXOneTapSignIn\)/);
  // 判定は非同期処理（Promise.all）より前に同期で行う（activation は約5秒で切れる）
  assert.ok(body.indexOf('var viaTap') < body.indexOf('Promise.all'), 'viaTap の判定が非同期処理より後にあります');
});

test('部品のフォールバック検索は Clerk の UI の中だけ（ページ自身の「X でログイン」ボタンを拾って再入しない）', () => {
  const src = readFileSync(part, 'utf8');
  assert.match(src, /var scope = document\.querySelector\('\.cl-rootBox, \.cl-modalBackdrop, \.cl-signIn-root'\)/);
  assert.match(src, /if \(!scope\) return null;/);
  assert.match(src, /scope\.querySelectorAll\('button, a, \[role="button"\]'\)/);
  // ページ全体の総当たりに戻っていない
  assert.doesNotMatch(src, /document\.querySelectorAll\('button, a, \[role="button"\]'\)/);
});
