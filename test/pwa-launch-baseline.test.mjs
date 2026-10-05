// PWA 起動画面の「地色1色」契約テスト（node:test・依存ゼロ）。
// 地色 #FFFAF3 を次の5か所でそろえる:
//   manifest.background_color / Capacitor backgroundColor / 共通CSSの html・body / 起動画像(PNG)の四隅
// あわせて、全ページで <meta name="theme-color"> の静的記述が高々1つであること。
// 設計: web-ios-android/_docs/DESIGN-pwa-launch-screen-2026-10-05.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import zlib from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const BASE = '#FFFAF3';
const read = (p) => readFileSync(p, 'utf8');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

test('manifest.background_color が地色 #FFFAF3', () => {
  const m = JSON.parse(read(join(SRC, 'manifest.webmanifest')));
  assert.equal(String(m.background_color).toUpperCase(), BASE);
});

test('capacitor.config.ts の backgroundColor（RGB部分）が地色と一致', () => {
  const ts = read(join(ROOT, 'capacitor.config.ts'));
  const found = [...ts.matchAll(/backgroundColor:\s*'(#[0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?'/g)].map((x) => x[1].toUpperCase());
  assert.ok(found.length > 0, 'backgroundColor が1つも見つからない（測れなかった）');
  for (const c of found) assert.equal(c, BASE);
});

test('共通CSSで html と body の背景が地色になる（変数の値も #FFFAF3）', () => {
  const css = read(join(SRC, 'css', 'style.css'));
  const v = css.match(/--color-bg:\s*(#[0-9a-fA-F]{6})/);
  assert.ok(v, '--color-bg が無い');
  assert.equal(v[1].toUpperCase(), BASE);
  const rule = (sel) => {
    const m = css.match(new RegExp('(?:^|\\n)' + sel + '\\s*\\{([^}]*)\\}'));
    assert.ok(m, `${sel} ルールが無い`);
    return m[1];
  };
  assert.match(rule('html'), /background-color:\s*var\(--color-bg\)/);
  assert.match(rule('body'), /background-color:\s*var\(--color-bg\)/);
});

test('全ページで theme-color の静的 meta は高々1つ', () => {
  const bad = [];
  for (const f of walk(SRC).filter((p) => p.endsWith('.html'))) {
    const n = (read(f).match(/<meta\s+name="theme-color"/g) || []).length;
    if (n > 1) bad.push(`${relative(ROOT, f)}: ${n}`);
  }
  assert.deepEqual(bad, []);
});

test('theme-color の値は manifest と common.js で同じ色（#c9899a）', () => {
  const m = JSON.parse(read(join(SRC, 'manifest.webmanifest')));
  const themed = new Set([m.theme_color.toLowerCase()]);
  const js = read(join(SRC, 'js', 'common.js'));
  for (const x of js.matchAll(/name="theme-color" content="(#[0-9a-fA-F]{6})"/g)) themed.add(x[1].toLowerCase());
  for (const f of walk(SRC).filter((p) => p.endsWith('.html'))) {
    for (const x of read(f).matchAll(/<meta\s+name="theme-color"\s+content="(#[0-9a-fA-F]{6})"/g)) themed.add(x[1].toLowerCase());
  }
  assert.deepEqual([...themed], ['#c9899a']);
});

// 最小の PNG 読み取り（8bit・RGB・非インターレースのみ）。四隅の画素だけ取り出す。
function cornerPixels(file) {
  const d = readFileSync(file);
  assert.equal(d.subarray(1, 4).toString(), 'PNG');
  const w = d.readUInt32BE(16), h = d.readUInt32BE(20);
  assert.equal(d[24], 8, '8bit のみ対応');
  assert.equal(d[25], 2, 'RGB(color type 2) のみ対応');
  assert.equal(d[28], 0, '非インターレースのみ対応');
  const idat = [];
  for (let o = 8; o < d.length;) {
    const len = d.readUInt32BE(o), type = d.subarray(o + 4, o + 8).toString();
    if (type === 'IDAT') idat.push(d.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 3, stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? px[y * stride + i - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + i] : 0;
      const c = i >= bpp && y > 0 ? px[(y - 1) * stride + i - bpp] : 0;
      let v = line[i];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * stride + i] = v & 255;
    }
  }
  const at = (x, y) => '#' + [0, 1, 2].map((k) => px[y * stride + x * bpp + k].toString(16).padStart(2, '0')).join('').toUpperCase();
  return [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
}

test('起動画像(apple-touch-startup-image)の四隅が地色 #FFFAF3', () => {
  const html = read(join(SRC, 'index.html'));
  const hrefs = [...html.matchAll(/rel="apple-touch-startup-image"\s+href="([^"]+)"/g)].map((m) => m[1].split('?')[0]);
  assert.ok(hrefs.length > 0, '起動画像の link が無い（測れなかった）');
  for (const href of hrefs) {
    const corners = cornerPixels(join(SRC, href));
    assert.deepEqual(corners, Array(4).fill(BASE), href);
  }
});
