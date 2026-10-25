// ログイン導線・更新案内・viewport / 横はみ出しの契約。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const VIEW = 'width=device-width, initial-scale=1, viewport-fit=cover';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

test('未ログインのヘッダーにログインボタンがあり、Me でもログインと分かる', () => {
  const app = read('src/js/app.js');
  assert.match(app, /id="app-brand-login"/);
  assert.match(app, /class="guest-only app-brand__login"/);
  assert.match(app, /YEAuth\.openSignIn\(\)/);
  const me = read('src/js/me.js');
  assert.match(me, /ログインしていません/);
  assert.match(me, /ログアウト/);
  assert.match(me, /https:\/\/kimito\.link\/dashboard\//);
  assert.match(me, /class="me-list__item member-only"/);
});

test('ログイン成立で data-auth を member に合わせる', () => {
  const auth = read('src/js/auth.js');
  assert.match(auth, /function syncAuthFlag/);
  assert.match(auth, /reloadOnSessionChange/);
  assert.match(auth, /setAttribute\('data-auth', signedIn \? 'member' : 'guest'\)/);
});

test('webBuild は app-update.js と app-release.json で一致し、ストア版の数字は上げていない', () => {
  const js = read('src/js/app-update.js');
  const rel = JSON.parse(read('src/app-release.json'));
  const m = js.match(/var YE_WEB_BUILD = '([^']+)'/);
  assert.ok(m, 'YE_WEB_BUILD が無い');
  assert.equal(m[1], rel.webBuild);
  assert.equal(rel.shell.ios, '0.2.0');
  const pkg = JSON.parse(read('package.json'));
  const cfg = JSON.parse(read('app.config.json'));
  assert.equal(pkg.version, '0.2.1');
  assert.equal(cfg.stores.marketingVersion, '0.2.0');
  assert.match(read('src/sw.js'), /caches\.keys\(\)/);
  assert.match(read('vercel.json'), /\/app-release\.json/);
  assert.match(read('src/js/common.js'), /bootYeAppUpdate/);
});

test('全HTMLの viewport が device-width / initial-scale=1 / viewport-fit=cover', () => {
  const bad = [];
  for (const f of walk(join(ROOT, 'src')).filter((p) => p.endsWith('.html'))) {
    const html = readFileSync(f, 'utf8');
    const tags = html.match(/<meta\s+name="viewport"\s+content="[^"]*"/g) || [];
    if (tags.length !== 1 || !tags[0].includes(`content="${VIEW}"`)) {
      bad.push(`${relative(ROOT, f)}: ${tags.join(' | ') || 'missing'}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('横スクロールと入力ズームを止める指定がある', () => {
  const css = read('src/css/style.css');
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /input,\s*select,\s*textarea\s*\{[^}]*font-size:\s*16px\s*!important/s);
  assert.match(read('src/css/boost.css'), /\.boost-cats\s*\{[^}]*touch-action:\s*pan-x pan-y/s);
  assert.match(read('src/css/app.css'), /app-brand__login/);
  assert.match(read('src/css/app.css'), /text-overflow:\s*ellipsis/);
});

test('掲載文はログイン必須・アプリ内課金なしで、古い「登録も課金もなし」を残さない', () => {
  const files = [
    'store-assets/appstore/description-ja.txt',
    'store-assets/appstore/promotional-text-ja.txt',
    'store-assets/play/listing-ja.txt',
    'store-assets/drafts/release-notes-ja.txt',
    'app.config.json',
  ].map(read).join('\n');
  assert.match(files, /kimito\.link/);
  assert.match(files, /アプリ内課金はありません/);
  assert.match(files, /今週の手ごたえ/);
  assert.doesNotMatch(files, /アカウント登録も課金もありません/);
  assert.doesNotMatch(files, /完全無料/);
  assert.doesNotMatch(files, /課金・広告なし/);
  assert.doesNotMatch(files, /若返/);
  assert.doesNotMatch(files, /活性化/);
  assert.doesNotMatch(files, /インターネット接続なし/);
  const promo = read('store-assets/appstore/promotional-text-ja.txt').trim();
  assert.ok(promo.length <= 170, `promotional text ${promo.length} > 170`);
  const summary = JSON.parse(read('app.config.json')).businessModel.summaryJa;
  assert.ok([...summary].length <= 80, `summaryJa ${[...summary].length} > 80`);
  assert.equal(JSON.parse(read('app.config.json')).businessModel.hasInAppPurchase, false);
  const notes = read('store-assets/drafts/release-notes-ja.txt').trim();
  assert.ok([...notes].length <= 500, 'release notes draft exceeds Play 500');
  assert.match(read('release-notes/CURRENT-ja.txt'), /スプラッシュ/);
});

test('iOS WebView パッチはテンプレートにピンチ禁止と版の受け渡しを足し、二度目は増やさない', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ye-ios-'));
  const app = join(dir, 'App');
  mkdirSync(join(app, 'App', 'Base.lproj'), { recursive: true });
  mkdirSync(join(app, 'App.xcodeproj'), { recursive: true });
  writeFileSync(
    join(app, 'App', 'Base.lproj', 'Main.storyboard'),
    '<viewController customClass="CAPBridgeViewController" customModule="Capacitor" />\n'
  );
  writeFileSync(join(app, 'App.xcodeproj', 'project.pbxproj'), [
    '\t\t504EC3081FED79650016851F /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 504EC3071FED79650016851F /* AppDelegate.swift */; };',
    '\t\t504EC3071FED79650016851F /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };',
    '\t\t\t\t504EC3071FED79650016851F /* AppDelegate.swift */,',
    '\t\t\t\t504EC3081FED79650016851F /* AppDelegate.swift in Sources */,',
    '',
  ].join('\n'));
  const run = () => execFileSync('node', ['scripts/patch-ios-webview.mjs'], {
    cwd: ROOT,
    env: { ...process.env, YE_IOS_ROOT: app },
    encoding: 'utf8',
  });
  run();
  run();
  const story = readFileSync(join(app, 'App', 'Base.lproj', 'Main.storyboard'), 'utf8');
  const swift = readFileSync(join(app, 'App', 'YeBridgeViewController.swift'), 'utf8');
  const pbx = readFileSync(join(app, 'App.xcodeproj', 'project.pbxproj'), 'utf8');
  assert.match(story, /customClass="YeBridgeViewController" customModule="App"/);
  assert.match(swift, /pinchGestureRecognizer\?\.isEnabled = false/);
  assert.match(swift, /ye_shell_ver/);
  const swiftLines = pbx.split('\n').filter((line) => line.includes('YeBridgeViewController.swift'));
  assert.equal(swiftLines.length, 4);
  rmSync(dir, { recursive: true, force: true });
});

test('Android の TWA は次のビルドでシェル版を起動 URL に載せる（versionName は変えない）', () => {
  const java = read('android-twa/app/src/main/java/com/kimito/link/yukkuriexosome/LauncherActivity.java');
  assert.match(java, /ye_shell/);
  assert.match(java, /ye_shell_ver/);
  assert.match(java, /BuildConfig\.VERSION_NAME/);
  assert.match(read('android-twa/app/build.gradle'), /versionName "0\.2\.1"/);
  assert.match(read('android-twa/app/build.gradle'), /versionCode 6/);
});
