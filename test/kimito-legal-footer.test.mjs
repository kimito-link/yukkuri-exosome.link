// kimito-legal-footer.js の契約テスト（node:test・依存ゼロ）。
// 使い方: 各サイトの tests/ にコピーし、下の FOOTER_JS を実際の配置に直して `node --test` で走らせる。
// ★document の無い環境で読むと、自動マウントはせず window.KimitoLegalFooter（純関数）だけが生える。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// ← サイトごとに直す（このリポの kimito-legal-footer.js の場所）
const FOOTER_JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'js', 'kimito-legal-footer.js');

function load() {
  const sandbox = { window: {} };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(FOOTER_JS, 'utf8'), sandbox, { filename: FOOTER_JS });
  return sandbox.window.KimitoLegalFooter;
}

test('運営表記が全サービス共通の文言で出る', () => {
  const html = load().buildHtml({ serviceName: 'テストサービス', terms: '/terms/', privacy: '/privacy/' });
  assert.match(html, /テストサービスは、<a href="https:\/\/kimito-link\.com\/" rel="noopener">kimito-link\.com<\/a>（Kimito-Link Project）と同じ運営による公式サービスです。/);
});

test('リンクの順序は 利用規約 → プライバシー → 特商法 → お問い合わせ（渡した分だけ）', () => {
  const f = load();
  const all = f.buildHtml({ serviceName: 'x', terms: '/t/', privacy: '/p/', tokusho: '/s/', support: '/h/' });
  const order = ['利用規約', 'プライバシーポリシー', '特定商取引法に基づく表記', 'お問い合わせ'].map((t) => all.indexOf(t));
  assert.ok(order.every((i) => i > 0) && order.join() === [...order].sort((a, b) => a - b).join());
  const some = f.buildHtml({ serviceName: 'x', privacy: '/p/' });
  assert.ok(some.includes('プライバシーポリシー') && !some.includes('利用規約') && !some.includes('特定商取引法'));
});

test('存在しないページへのリンクは出さない（何も渡さなければリンク一覧ごと出ない）', () => {
  assert.ok(!load().buildHtml({ serviceName: 'x' }).includes('<ul>'));
});

test('危険なURLは描画しない（javascript: / data: / プロトコル相対 / http:）', () => {
  const f = load();
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.example/', 'http://insecure.example/']) {
    assert.equal(f.safeUrl(bad), '');
  }
  assert.equal(f.safeUrl('/terms/'), '/terms/');
  assert.equal(f.safeUrl('https://example.com/terms'), 'https://example.com/terms');
  assert.ok(!f.buildHtml({ serviceName: 'x', terms: 'javascript:alert(1)' }).includes('javascript:'));
});

test('サービス名の HTML は無害化される', () => {
  const html = load().buildHtml({ serviceName: '<img src=x onerror=alert(1)>' });
  assert.ok(!html.includes('<img') && html.includes('&lt;img'));
});

test('情報ページの共通フッター（injectChrome）が部品を出す。マウント先を持ち、注入後に mountLegalFooter を呼ぶ', () => {
  const common = readFileSync(join(ROOT, 'src', 'js', 'common.js'), 'utf8');
  assert.match(common, /function mountLegalFooter\(depth = 0\)/);
  assert.match(common, /<div id="kimito-legal-footer"><\/div>/);
  const start = common.indexOf('function injectChrome');
  const body = common.slice(start, start + 6000);
  assert.ok(body.indexOf('mountLegalFooter(depth)') > body.indexOf('footer.innerHTML'), 'フッター注入の後に mountLegalFooter(depth) がありません');
  // 渡す法務ページは実在するものだけ（利用規約ページは未作成。作ったら terms を足す）
  assert.match(common, /privacy: '\/privacy\/'/);
  assert.doesNotMatch(common, /opts = \{[^}]*terms:/);
});

test('data-footer を持つ全ページが common.js を読み込む（＝新しい情報ページも自動で共通フッターが付く）', () => {
  const pages = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const f = join(dir, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.name === 'index.html') pages.push(f);
    }
  })(join(ROOT, 'src'));
  const withFooter = pages.filter((f) => readFileSync(f, 'utf8').includes('data-footer'));
  assert.ok(withFooter.length >= 10, `data-footer を持つページが少なすぎます(${withFooter.length})`);
  for (const f of withFooter) {
    assert.match(readFileSync(f, 'utf8'), /js\/common\.js/, `${f} が common.js を読み込んでいません`);
  }
});

test('Me 画面（アプリ内の入口）にも共通フッターのマウント先があり、描画後に mountLegalFooter を呼ぶ', () => {
  const me = readFileSync(join(ROOT, 'src', 'js', 'me.js'), 'utf8');
  assert.match(me, /<div id="kimito-legal-footer"/);
  assert.ok(me.indexOf('mountLegalFooter(1)') > me.indexOf("getElementById('me-screen').innerHTML = html"));
});

test('アプリ画面の各タブには出さない（タブバーと競合するため。Me だけ）', () => {
  for (const tab of ['advice', 'boost', 'garden', 'quiz', 'selfcare']) {
    const html = readFileSync(join(ROOT, 'src', tab, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /kimito-legal-footer/, `${tab} に共通フッターが入っています`);
  }
});

test('色の差し替え口（--klf-fg / --klf-bg）があり、既定は継承・透明', () => {
  const src = readFileSync(FOOTER_JS, 'utf8');
  assert.match(src, /color:var\(--klf-fg,inherit\)/);
  assert.match(src, /background:var\(--klf-bg,transparent\)/);
});

test('重なり順（position:relative + --klf-z）を持つ', () => {
  const src = readFileSync(FOOTER_JS, 'utf8');
  assert.match(src, /position:relative;z-index:var\(--klf-z,1\)/);
});
