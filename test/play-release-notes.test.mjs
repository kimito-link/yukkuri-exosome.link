// Google Play のリリースノートの読み先と文字数を機械検査する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('play-publish は PLAY-ja.txt を優先し、無ければ CURRENT-ja.txt を読む', () => {
  const src = read('scripts/play-publish.mjs');
  assert.match(src, /'PLAY-ja\.txt'/);
  assert.match(src, /'CURRENT-ja\.txt'/);
});

test('PLAY-ja.txt は Play の上限 500 文字以内で、効果をうたわない', () => {
  if (!existsSync(join(ROOT, 'release-notes/PLAY-ja.txt'))) return;
  const text = read('release-notes/PLAY-ja.txt').replace(/\r\n/g, '\n').trim();
  assert.ok(text.length > 0 && text.length <= 500, `${text.length} chars`);
  assert.doesNotMatch(text, /若返|老化を|改善され(?:る|ます)|治療|効果|活性化/);
});

test('Android の minSdk は 24（Play の自動保護の最低要件）', () => {
  assert.match(read('android-twa/app/build.gradle'), /minSdkVersion 24\b/);
  assert.equal(JSON.parse(read('android-twa/twa-manifest.json')).minSdkVersion, 24);
});
