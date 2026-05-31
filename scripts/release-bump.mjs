#!/usr/bin/env node
// Bump versions across the repo for a one-click 3-platform release.
//
// Updates (all atomic):
//   1. package.json    -> "version": "x.y.z"
//   2. android-twa/app/build.gradle  -> versionCode N, versionName "x.y.z"
//   3. sw.js           -> CACHE_NAME = 'fuji-direction-v<N+something>'  (auto-incremented)
//   4. Optionally appends to CHANGELOG.md from release-notes/CURRENT-ja.txt
//
// Usage:
//   node scripts/release-bump.mjs <new-version>
//   node scripts/release-bump.mjs --patch       (auto bump patch, e.g. 2.3.14 -> 2.3.15)
//   node scripts/release-bump.mjs --minor       (2.3.14 -> 2.4.0)
//   node scripts/release-bump.mjs --no-changelog
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

const PKG = path.join(REPO, 'package.json');
const GRADLE = path.join(REPO, 'android-twa', 'app', 'build.gradle');
const SW = path.join(REPO, 'sw.js');
const CHANGELOG = path.join(REPO, 'CHANGELOG.md');
const NOTES = path.join(REPO, 'release-notes', 'CURRENT-ja.txt');
// アプリ内に表示されるバージョン（app.js の resolveAppVersion が読む）。
// ここを bump し忘れると、ストア配信版と表示が食い違う（実際 2.4.7 のまま放置されていた）。
const INDEX_HTML = path.join(REPO, 'index.html');
const APP_JS = path.join(REPO, 'app.js');
// アプリ内アップデート通知が読む最新版 JSON。bump 時に ios/android を揃える。
const APP_LATEST = path.join(REPO, 'app-latest.json');

const args = process.argv.slice(2);
const skipChangelog = args.includes('--no-changelog');
const bumpKind = args.find((a) => ['--patch', '--minor', '--major'].includes(a));
const explicit = args.find((a) => /^\d+\.\d+\.\d+$/.test(a));

if (!bumpKind && !explicit) {
  console.error('Usage: node scripts/release-bump.mjs <x.y.z> | --patch | --minor | --major [--no-changelog]');
  process.exit(2);
}

function bump(curr, kind) {
  const [maj, min, pat] = curr.split('.').map(Number);
  if (kind === '--patch') return `${maj}.${min}.${pat + 1}`;
  if (kind === '--minor') return `${maj}.${min + 1}.0`;
  if (kind === '--major') return `${maj + 1}.0.0`;
  return curr;
}

const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
const fromVersion = pkg.version;
const toVersion = explicit || bump(fromVersion, bumpKind);

if (toVersion === fromVersion) {
  console.error(`Refusing to bump: ${fromVersion} -> ${toVersion} is identical.`);
  process.exit(2);
}

console.log(`Version: ${fromVersion} -> ${toVersion}`);

pkg.version = toVersion;
fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n');
console.log(`  package.json updated`);

let gradle = fs.readFileSync(GRADLE, 'utf8');
const codeMatch = gradle.match(/(versionCode\s+)(\d+)/);
if (!codeMatch) {
  throw new Error('Could not find versionCode in android-twa/app/build.gradle');
}
const oldCode = Number(codeMatch[2]);
const newCode = oldCode + 1;
gradle = gradle.replace(/(versionCode\s+)\d+/, `$1${newCode}`);
gradle = gradle.replace(/(versionName\s+)"[^"]*"/, `$1"${toVersion}"`);
fs.writeFileSync(GRADLE, gradle);
console.log(`  build.gradle updated (versionCode ${oldCode} -> ${newCode}, versionName ${toVersion})`);

let sw = fs.readFileSync(SW, 'utf8');
const swMatch = sw.match(/(CACHE_NAME\s*=\s*'fuji-direction-v)(\d+)(')/);
if (swMatch) {
  const oldCacheN = Number(swMatch[2]);
  const newCacheN = oldCacheN + 1;
  sw = sw.replace(swMatch[0], `${swMatch[1]}${newCacheN}${swMatch[3]}`);
  fs.writeFileSync(SW, sw);
  console.log(`  sw.js cache version ${oldCacheN} -> ${newCacheN}`);
} else {
  console.warn(`  [warn] sw.js: CACHE_NAME pattern not matched, leaving as-is`);
}

// アプリ内バージョン表示を package.json と必ず揃える。
// パターン不一致は throw する（黙ってスキップすると表示がズレ続けるため）。
let indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');
const metaRe = /(<meta\s+name="app-version"\s+content=")[^"]*(">)/;
if (!metaRe.test(indexHtml)) {
  throw new Error('release-bump: <meta name="app-version"> not found in index.html');
}
indexHtml = indexHtml.replace(metaRe, `$1${toVersion}$2`);
fs.writeFileSync(INDEX_HTML, indexHtml);
console.log(`  index.html app-version meta -> ${toVersion}`);

let appJs = fs.readFileSync(APP_JS, 'utf8');
const defaultVerRe = /(const DEFAULT_APP_VERSION = ')[^']*(';)/;
if (!defaultVerRe.test(appJs)) {
  throw new Error('release-bump: DEFAULT_APP_VERSION not found in app.js');
}
appJs = appJs.replace(defaultVerRe, `$1${toVersion}$2`);
fs.writeFileSync(APP_JS, appJs);
console.log(`  app.js DEFAULT_APP_VERSION -> ${toVersion}`);

// アプリ内アップデート通知用の最新版 JSON を揃える（ios/android を toVersion に）。
if (fs.existsSync(APP_LATEST)) {
  const latest = JSON.parse(fs.readFileSync(APP_LATEST, 'utf8'));
  latest.ios = toVersion;
  latest.android = toVersion;
  fs.writeFileSync(APP_LATEST, JSON.stringify(latest, null, 2) + '\n');
  console.log(`  app-latest.json ios/android -> ${toVersion}`);
} else {
  console.warn('  [warn] app-latest.json が無いためスキップ');
}

if (!skipChangelog && fs.existsSync(NOTES)) {
  const notes = fs.readFileSync(NOTES, 'utf8').replace(/\r\n/g, '\n').trim();
  if (!fs.existsSync(CHANGELOG)) {
    fs.writeFileSync(
      CHANGELOG,
      `# Changelog\n\n## ${toVersion} - ${new Date().toISOString().slice(0, 10)}\n\n${notes}\n`,
    );
  } else {
    const existing = fs.readFileSync(CHANGELOG, 'utf8');
    const header = `## ${toVersion} - ${new Date().toISOString().slice(0, 10)}\n\n${notes}\n\n`;
    if (existing.startsWith('# ')) {
      const [first, ...rest] = existing.split('\n\n');
      fs.writeFileSync(CHANGELOG, [first, header.trimEnd(), rest.join('\n\n')].join('\n\n') + '\n');
    } else {
      fs.writeFileSync(CHANGELOG, header + existing);
    }
  }
  console.log(`  CHANGELOG.md updated`);
}

// リリース履歴の雛形を release-history/X.Y.Z.json に生成する（5年運用視点）。
// 「いつ何を測って何を見て GO したか」の証跡を残すため、release workflow が
// 完了時に同ファイルに追記する設計（実装は別 PR でも段階的に可能）。
// 雛形だけでも、bump 時点でのコミット SHA・bump 元バージョンが記録される。
const RELEASE_HISTORY_DIR = path.join(REPO, 'release-history');
try {
  if (!fs.existsSync(RELEASE_HISTORY_DIR)) {
    fs.mkdirSync(RELEASE_HISTORY_DIR, { recursive: true });
  }
  const historyPath = path.join(RELEASE_HISTORY_DIR, `${toVersion}.json`);
  let notesText = '';
  if (fs.existsSync(NOTES)) {
    notesText = fs.readFileSync(NOTES, 'utf8').replace(/\r\n/g, '\n').trim();
  }
  const skeleton = {
    version: toVersion,
    bumped_from: fromVersion,
    bumped_at: new Date().toISOString(),
    release_notes: notesText,
    // 以下は release workflow が完了時に追記する想定（手動で埋めても良い）:
    gate_blackscreen_check_run_id: null,
    gate_blackscreen_check_result: null,
    gate_blackscreen_luma: null,
    released_at: null,
    released_git_sha: null,
    released_by: null,
  };
  fs.writeFileSync(historyPath, JSON.stringify(skeleton, null, 2) + '\n');
  console.log(`  release-history/${toVersion}.json (雛形を生成。release workflow / 手動で埋めて使う)`);
} catch (e) {
  const msg = (e && e.message ? e.message : String(e)).slice(0, 80);
  console.warn(`  [warn] release-history 雛形生成に失敗: ${msg}`);
}

console.log(`\nDone. Next:`);
console.log(`  git add -A`);
console.log(`  git commit -m "release: ${toVersion}"`);
console.log(`  git push        # iOS / Android workflows trigger automatically`);
