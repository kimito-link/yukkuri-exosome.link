// 本家マイページ導線（kimito.link/dashboard/）の配線が、実際の src/js/app.js・me.js から外れていないかを機械検査する。
//
// 部品 src/js/kimito-dashboard-link.js は web-ios-android/templates/web/auth-mode/kimito-dashboard-link.js.example
// のバイト一致コピー（kit 側 check-drift の PAIRS で同期を見る）。部品の中身の契約は
// test/kimito-dashboard-link.test.mjs が見る。ここでは「配線が生きているか」だけを見る。
// ★設計: kit templates/web/auth-mode/README.md「③本家マイページへの導線」
//   - ログイン後の画面（共通ヘッダー）に置く。LP には置かない
//   - コンテナに member-only を付け、ペイント前から隠す（style.css の data-auth 規約）
//   - 姉妹から本家の sign-in へは送らない（ログイン中だけ出す部品なので、未ログイン導線は作らない）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(ROOT, 'src/js/app.js'), 'utf8');
const me = readFileSync(join(ROOT, 'src/js/me.js'), 'utf8');
const css = readFileSync(join(ROOT, 'src/css/style.css'), 'utf8');
const part = join(ROOT, 'src/js/kimito-dashboard-link.js');

test('部品ファイルが src/js/ に存在し、window.KimitoDashboardLink を公開している', () => {
  assert.ok(existsSync(part), 'src/js/kimito-dashboard-link.js がありません');
  assert.match(readFileSync(part, 'utf8'), /window\.KimitoDashboardLink\s*=/);
});

test('共通ヘッダー（injectAppShell）に member-only 付きのコンテナがあり、UserButton の隣に置かれている', () => {
  const start = app.indexOf('function injectAppShell');
  assert.notEqual(start, -1, 'injectAppShell関数が見つかりません');
  const body = app.slice(start, start + 4000);
  const container = body.indexOf('data-kimito-dashboard-link');
  const account = body.indexOf('id="app-brand-account"');
  assert.notEqual(container, -1, 'data-kimito-dashboard-link コンテナがありません');
  assert.notEqual(account, -1, 'app-brand-account がありません');
  assert.ok(container < account, 'コンテナは UserButton（app-brand-account）の直前に置く');
  assert.match(body, /class="member-only app-brand__dashboard-link" data-kimito-dashboard-link/);
});

test('部品のスクリプトは共通ヘッダーを描く app.js が base 付きで1回だけ読み込む（ページ階層が違っても壊れない）', () => {
  assert.match(app, /dashLinkScript\.src = `\$\{base\}js\/kimito-dashboard-link\.js`/);
  assert.match(app, /script\[data-kimito-dashboard-link-script\]/, '二重読み込み防止の印がありません');
});

test('member-only は style.css の data-auth 規約でペイント前から隠れる', () => {
  assert.match(css, /html\[data-auth="guest"\] \.member-only \{ display: none !important; \}/);
});

test('Me 画面の「kimito.link」導線は本家マイページ（/dashboard/、ログイン必須画面）を指す', () => {
  assert.match(me, /href="https:\/\/kimito\.link\/dashboard\/"/);
  assert.doesNotMatch(me, /href="https:\/\/kimito\.link\/"/, 'トップ（LP）へ送る旧リンクが残っています');
});

test('姉妹から本家の sign-in へは送らない（ログイン後に姉妹へ戻れない。README 地雷4）', () => {
  assert.doesNotMatch(app, /kimito\.link\/sign-in/);
  assert.doesNotMatch(me, /kimito\.link\/sign-in/);
});
