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

test('全ページで__client_uatスニペットが存在する（21ページ全て、privacy/lp含む）', () => {
  const files = listHtmlFiles(join(ROOT, 'src'));
  const withSnippet = files.filter((f) => readFileSync(f, 'utf8').includes('__client_uat'));
  // 2026-09-29時点で21ページ。ページが増減したらこの数も更新すること。
  assert.equal(withSnippet.length, 21, `__client_uatスニペットを持つページ数が想定と違う: ${withSnippet.length}件`);
});
