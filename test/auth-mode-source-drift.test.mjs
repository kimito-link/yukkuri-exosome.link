// auth-mode-cookie-parsing.test.mjs が検証しているロジックが、実際の
// src/js/auth-mode.js・全ページ<head>スニペットと乖離していないかを機械検査する。
//
// 「テストは緑だが、ソース側は直っていない（またはロジックが変わった）」という
// ドリフトを防ぐ。auth-mode-cookie-parsing.test.mjs は文字列上の実装を手で複製
// しているため、この検査が無いと片方だけ更新されても気づけない
// （CLAUDE.md「共有部品は複製したら契約テストでドリフト検知する」の適用）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// execループ（グローバルフラグ+while+exec）による全件走査を使っているか。
// String#match（グローバルフラグ無し）に戻っていないことを保証する。
const USES_EXEC_LOOP = /\bre\.exec\(/;
const USES_GLOBAL_FLAG = /__client_uat\[\^=\]\*=\(\[\^;\]\*\)\/g/;

function listHtmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(full));
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

test('src/js/auth-mode.js の hasLiveClerkCookie() が exec-loop を使っている（String#match単体に戻っていない）', () => {
  const content = readFileSync(join(ROOT, 'src/js/auth-mode.js'), 'utf8');
  const start = content.indexOf('function hasLiveClerkCookie');
  assert.notEqual(start, -1, 'hasLiveClerkCookie関数が見つかりません');
  const body = content.slice(start, start + 400);
  assert.match(body, USES_EXEC_LOOP, 'exec-loopを使っていません（.matchに戻っていないか確認）');
});

test('全ページの<head>先頭スニペットが、グローバルフラグ付き正規表現でexec-loopを使っている', () => {
  const files = listHtmlFiles(join(ROOT, 'src'));
  const missing = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (!content.includes('__client_uat')) continue; // このスニペットを持たないページ（無いはずだが念のため）
    if (!USES_GLOBAL_FLAG.test(content) || !USES_EXEC_LOOP.test(content)) {
      missing.push(file.replace(ROOT, ''));
    }
  }
  assert.deepEqual(missing, [], `exec-loopでない旧ロジックのページ: ${missing.join(', ')}`);
});

test('★全ページに__client_uatスニペットがある（漏れたページを名指しする）', () => {
  // ★以前は「21ページあること」と**数を固定**していたが、これは2つの意味で弱かった:
  //   1. ページが増えるたびに人間が数字を直す必要があり、**実際に放置されて赤いまま**だった
  //      （21→22に増えた時点で失敗し続けていた）
  //   2. ★数が合っていても**どのページが漏れたか分からない**。
  //      仮に1ページ追加・1ページ漏れが同時に起きたら、数は合うので**素通りする**
  // → 「どのページに無いか」を名指しする形にした。人間が数を直す作業も消える。
  const files = listHtmlFiles(join(ROOT, 'src'));
  const missing = files
    .filter((f) => !readFileSync(f, 'utf8').includes('__client_uat'))
    .map((f) => f.replace(ROOT, ''));
  assert.deepEqual(
    missing,
    [],
    `__client_uatスニペットが無いページ: ${missing.join(', ')}（ログイン状態を判定できず、ちらつきが出る）`,
  );
});

test('★ページが1枚も見つからない状態を「合格」にしない', () => {
  // ★listHtmlFiles が壊れて空配列を返すと、上のテストは「漏れゼロ」で緑になる。
  //   件数0を緑にしないための歯止め。
  const files = listHtmlFiles(join(ROOT, 'src'));
  assert.ok(files.length >= 20, `HTMLページが ${files.length} 件しか見つからない。走査が壊れている可能性`);
});
