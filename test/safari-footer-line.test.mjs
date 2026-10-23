// Safari の固定フッターと「開く」/LINE 導線の契約（node:test・依存ゼロ）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('アプリ先頭に Safari のスマートアプリバナー（apple-itunes-app）が無い', () => {
  const html = read('src/index.html');
  assert.equal(/<meta\s+name="apple-itunes-app"/.test(html), false);
  assert.equal(html.includes('app-id=6775201794'), false);
});

test('タブバーの高さは 64px にセーフエリアを足す（内側の padding で潰さない）', () => {
  const css = read('src/css/app.css');
  const block = css.match(/\.app-tabs\s*\{([^}]*)\}/);
  assert.ok(block, '.app-tabs が無い');
  assert.match(block[1], /height:\s*calc\(var\(--app-tab-h\)\s*\+\s*var\(--app-safe-bottom\)\)/);
  assert.doesNotMatch(block[1], /height:\s*var\(--app-tab-h\)\s*;/);
  assert.match(css, /--app-safe-bottom:\s*env\(safe-area-inset-bottom,\s*0px\)/);
  assert.match(css, /padding-top:\s*calc\(var\(--app-brand-h\)\s*\+\s*var\(--app-status-h\)\s*\+\s*var\(--app-safe-top\)\)/);
});

test('LINE のボタンは既定でページ内の QR を指し、スマホ用の https は data 属性に置く', () => {
  for (const file of ['src/line/index.html', 'src/index.html']) {
    const html = read(file);
    const tags = html.match(/<a\b[^>]*data-line-add[^>]*>/g) || [];
    assert.ok(tags.length >= 1, `${file} に data-line-add が無い`);
    for (const tag of tags) {
      assert.match(tag, /href="#line-add-qr"/, tag);
      assert.match(tag, /data-line-href="https:\/\/lin\.ee\//, tag);
      assert.equal(tag.includes('target='), false, tag);
      assert.equal(tag.includes('line://'), false, tag);
    }
  }
  const js = read('src/js/common.js');
  assert.match(js, /function upgradeLineAddLinks/);
  assert.match(js, /iPhone\|iPod/);
});
