#!/usr/bin/env node
/**
 * setup-new-app.mjs
 *
 * Interactive CLI wizard that sets up a new app from the template.
 * Reads app.config.json, validates required fields, runs setup steps,
 * then prints GitHub Secrets and Play Console GUI checklists.
 *
 * Usage:
 *   node scripts/setup-new-app.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadAppConfig, getProjectRoot } from './lib/app-config.mjs';

const ROOT = getProjectRoot();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function header(title) {
  const bar = '='.repeat(60);
  console.log('');
  console.log(bar);
  console.log(`  ${title}`);
  console.log(bar);
}

function step(n, total, msg) {
  console.log(`\n[${n}/${total}] ${msg}`);
}

function ok(msg) {
  console.log(`  OK  ${msg}`);
}

function warn(msg) {
  console.log(`  WARN  ${msg}`);
}

function fail(msg) {
  console.error(`  FAIL  ${msg}`);
}

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
}

// ---------------------------------------------------------------------------
// Step 1: Load and validate config
// ---------------------------------------------------------------------------

header('setup-new-app: loading app.config.json');

let config;
try {
  config = loadAppConfig();
} catch (e) {
  fail(e.message);
  process.exit(1);
}

const PLACEHOLDER_PATTERNS = [
  /^YOUR_/i,
  /^PLACEHOLDER/i,
  /^TODO/i,
  /^CHANGE_ME/i,
  /^example\./i,
  /^com\.example/i,
];

/**
 * Returns true if the value looks like it has not been filled in.
 * @param {unknown} v
 */
function isPlaceholder(v) {
  if (typeof v !== 'string') return false;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(v));
}

const REQUIRED_FIELDS = [
  ['identity.displayName',      config.identity.displayName],
  ['identity.displayNameEn',    config.identity.displayNameEn],
  ['identity.shortName',        config.identity.shortName],
  ['identity.bundleId',         config.identity.bundleId],
  ['identity.iosScheme',        config.identity.iosScheme],
  ['identity.productionDomain', config.identity.productionDomain],
  ['stores.playPackageName',    config.stores.playPackageName],
  ['contact.email',             config.contact.email],
  ['contact.supportUrl',        config.contact.supportUrl],
  ['contact.privacyUrl',        config.contact.privacyUrl],
  ['contact.marketingUrl',      config.contact.marketingUrl],
  ['ownership.organization',    config.ownership.organization],
  ['ownership.githubOrg',       config.ownership.githubOrg],
  ['ownership.githubRepo',      config.ownership.githubRepo],
];

header('Validating required fields');

let validationErrors = 0;
for (const [field, value] of REQUIRED_FIELDS) {
  if (!value || isPlaceholder(value)) {
    fail(`${field} is not set (got: ${JSON.stringify(value)})`);
    validationErrors++;
  } else {
    ok(`${field} = ${value}`);
  }
}

if (validationErrors > 0) {
  console.error(
    `\nValidation failed: ${validationErrors} field(s) need to be filled in app.config.json.`,
  );
  process.exit(1);
}

// Derived values used throughout the script
const {
  displayName,
  displayNameEn,
  shortName,
  bundleId,
  productionDomain,
} = config.identity;

const { playPackageName } = config.stores;
const { email, privacyUrl, marketingUrl } = config.contact;
const { organization } = config.ownership;

// Windows: prefer "python", elsewhere "python3"
const PYTHON = process.platform === 'win32' ? 'python' : 'python3';

const TOTAL_STEPS = 7;

// ---------------------------------------------------------------------------
// Step 2a: Generate all icon sizes
// ---------------------------------------------------------------------------

header('Setup Steps');

step(1, TOTAL_STEPS, 'Generate all icon sizes (make_icons.py)');
const makeIconsScript = path.join(ROOT, 'scripts', 'icon-gen', 'make_icons.py');
if (!fs.existsSync(makeIconsScript)) {
  warn(`${makeIconsScript} not found — skipping icon generation.`);
} else {
  try {
    run(`${PYTHON} scripts/icon-gen/make_icons.py`);
    ok('Icons generated.');
  } catch {
    fail('make_icons.py failed. Ensure Pillow is installed: pip install Pillow');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Step 2b: Generate store assets
// ---------------------------------------------------------------------------

step(2, TOTAL_STEPS, 'Generate store assets (make_play_assets.py)');
const makePlayAssetsScript = path.join(ROOT, 'scripts', 'icon-gen', 'make_play_assets.py');
if (!fs.existsSync(makePlayAssetsScript)) {
  warn(`${makePlayAssetsScript} not found — skipping store asset generation.`);
} else {
  try {
    run(`${PYTHON} scripts/icon-gen/make_play_assets.py`);
    ok('Store assets generated.');
  } catch {
    fail('make_play_assets.py failed.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Step 2c: Generate screenshots
// ---------------------------------------------------------------------------

step(3, TOTAL_STEPS, 'Generate screenshots (make_screenshots.py)');
const makeScreenshotsScript = path.join(ROOT, 'scripts', 'icon-gen', 'make_screenshots.py');
if (!fs.existsSync(makeScreenshotsScript)) {
  warn(`${makeScreenshotsScript} not found — skipping screenshot generation.`);
} else {
  try {
    run(`${PYTHON} scripts/icon-gen/make_screenshots.py`);
    ok('Screenshots generated.');
  } catch {
    fail('make_screenshots.py failed.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Step 2d: Create src/privacy/index.html from template
// ---------------------------------------------------------------------------

step(4, TOTAL_STEPS, 'Create src/privacy/index.html');

const privacyDir = path.join(ROOT, 'src', 'privacy');
const privacyFile = path.join(privacyDir, 'index.html');
const today = new Date().toLocaleDateString('ja-JP', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const privacyHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>プライバシーポリシー | ${displayName}</title>
    <meta name="description" content="${displayName}のプライバシーポリシー。個人情報の取り扱いについて説明します。">
    <link rel="manifest" href="../manifest.webmanifest">
    <meta name="theme-color" content="${config.brand.primaryColor}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
</head>
<body data-depth="1">
    <div data-header></div>

    <nav class="breadcrumb">
        <a href="../">ホーム</a>
        <span class="breadcrumb__sep">/</span>
        <span>プライバシーポリシー</span>
    </nav>

    <main>
        <article class="article">
            <div class="container container--narrow">
                <header class="article__header">
                    <h1 class="article__title">プライバシーポリシー</h1>
                    <p class="article__meta">最終更新日：${today}</p>
                </header>

                <section class="article__section">
                    <h2 class="article__h2">基本方針</h2>
                    <p>「${displayName}」（以下「本アプリ」）は、ユーザーのプライバシーを最優先に設計されています。本アプリは、ユーザーの個人情報を収集・送信・共有しません。</p>
                </section>

                <section class="article__section">
                    <h2 class="article__h2">収集する情報</h2>
                    <p>本アプリは、いかなる個人情報も収集しません。具体的には以下のとおりです：</p>
                    <ul>
                        <li>氏名・メールアドレス・電話番号などの個人識別情報：<strong>収集しません</strong></li>
                        <li>位置情報：<strong>収集しません</strong></li>
                        <li>端末識別子・広告ID：<strong>使用しません</strong></li>
                        <li>健康・フィットネスデータ：<strong>端末内にのみ保存し、外部に送信しません</strong></li>
                    </ul>
                </section>

                <section class="article__section">
                    <h2 class="article__h2">データの保存場所</h2>
                    <p>ユーザーが入力したデータはすべて、ユーザーの端末内（ブラウザのローカルストレージ）にのみ保存されます。サーバーへの送信は行いません。</p>
                </section>

                <section class="article__section">
                    <h2 class="article__h2">第三者への提供</h2>
                    <p>本アプリはユーザーデータを第三者に提供・販売・共有しません。</p>
                </section>

                <section class="article__section">
                    <h2 class="article__h2">広告</h2>
                    <p>本アプリには広告は含まれていません。広告SDKも使用していません。</p>
                </section>

                <section class="article__section">
                    <h2 class="article__h2">アカウント</h2>
                    <p>本アプリはアカウント登録不要です。ユーザー認証を行わないため、サーバー上にユーザーアカウントは存在しません。</p>
                </section>

                <section class="article__section">
                    <h2 class="article__h2">子どものプライバシー</h2>
                    <p>本アプリは18歳以上のユーザーを対象としています。13歳未満の子どもからの情報を意図的に収集することはありません。</p>
                </section>

                <section class="article__section">
                    <h2 class="article__h2">本ポリシーの変更</h2>
                    <p>プライバシーポリシーを変更する場合は、このページを更新します。重大な変更がある場合はアプリ内でお知らせします。</p>
                </section>

                <section class="article__section">
                    <h2 class="article__h2">お問い合わせ</h2>
                    <p>プライバシーに関するご質問は、以下までご連絡ください。</p>
                    <p>メール：<a href="mailto:${email}">${email}</a></p>
                    <p>運営：${organization}（<a href="${marketingUrl}">${marketingUrl}</a>）</p>
                </section>
            </div>
        </article>
    </main>

    <div data-footer></div>
    <script src="../js/components.js"></script>
</body>
</html>
`;

if (!fs.existsSync(privacyDir)) {
  fs.mkdirSync(privacyDir, { recursive: true });
  ok(`Created directory: src/privacy/`);
}

if (fs.existsSync(privacyFile)) {
  warn('src/privacy/index.html already exists — overwriting with config values.');
}

fs.writeFileSync(privacyFile, privacyHtml, 'utf8');
ok(`Written: src/privacy/index.html  (appName=${displayName}, email=${email})`);

// ---------------------------------------------------------------------------
// Step 2e: Initialize Android TWA
// ---------------------------------------------------------------------------

step(5, TOTAL_STEPS, 'Initialize Android TWA (android-twa/)');

const twaDir = path.join(ROOT, 'android-twa');

if (fs.existsSync(twaDir)) {
  ok('android-twa/ already exists — skipping bubblewrap init.');
} else {
  console.log('  android-twa/ not found. Running bubblewrap init...');
  console.log(`  domain: https://${productionDomain}`);
  console.log(`  packageId: ${playPackageName}`);
  console.log('');
  console.log('  NOTE: bubblewrap init is interactive. Answer the prompts then re-run');
  console.log('  this script to complete the remaining steps.');
  console.log('');
  try {
    // bubblewrap init requires interactive input for some questions.
    // We pass the manifest URL as the required positional arg and let the
    // user answer remaining prompts in their terminal.
    run(
      `npx @bubblewrap/cli init --manifest https://${productionDomain}/manifest.webmanifest`,
      { stdio: 'inherit' },
    );
    ok('bubblewrap init completed.');
  } catch {
    warn('bubblewrap init did not complete cleanly. Check output above, then re-run this script.');
    // Non-fatal: user may need to answer prompts manually.
  }
}

// ---------------------------------------------------------------------------
// Step 2f: Update android-twa/app/build.gradle with correct package name
// ---------------------------------------------------------------------------

step(6, TOTAL_STEPS, 'Update android-twa/app/build.gradle');

const gradlePath = path.join(ROOT, 'android-twa', 'app', 'build.gradle');

if (!fs.existsSync(gradlePath)) {
  warn(`${gradlePath} not found — skipping. Run bubblewrap init first.`);
} else {
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  let gradleChanged = false;

  // Update applicationId
  const newApplicationId = `applicationId "${playPackageName}"`;
  if (!gradle.includes(newApplicationId)) {
    gradle = gradle.replace(/applicationId\s+"[^"]*"/, newApplicationId);
    gradleChanged = true;
    ok(`  applicationId -> ${playPackageName}`);
  } else {
    ok(`  applicationId already set to ${playPackageName}`);
  }

  // Update namespace
  const newNamespace = `namespace "${playPackageName}"`;
  if (!gradle.includes(newNamespace)) {
    gradle = gradle.replace(/namespace\s+"[^"]*"/, newNamespace);
    gradleChanged = true;
    ok(`  namespace -> ${playPackageName}`);
  } else {
    ok(`  namespace already set to ${playPackageName}`);
  }

  // Update hostName in twaManifest map
  const newHostName = `hostName: '${productionDomain}'`;
  if (!gradle.includes(newHostName)) {
    gradle = gradle.replace(/hostName:\s*'[^']*'/, newHostName);
    gradleChanged = true;
    ok(`  hostName -> ${productionDomain}`);
  } else {
    ok(`  hostName already set to ${productionDomain}`);
  }

  // Update app name
  const newAppName = `name: '${displayName}'`;
  if (!gradle.includes(newAppName)) {
    // Only replace the `name:` field inside twaManifest (not `applicationId`)
    gradle = gradle.replace(/(\bname:\s*')[^']*('.*\/\/ The application name\.)/, `$1${displayName}$2`);
    gradleChanged = true;
    ok(`  name -> ${displayName}`);
  } else {
    ok(`  name already set to ${displayName}`);
  }

  if (gradleChanged) {
    fs.writeFileSync(gradlePath, gradle, 'utf8');
    ok('android-twa/app/build.gradle saved.');
  } else {
    ok('android-twa/app/build.gradle already up to date.');
  }
}

// ---------------------------------------------------------------------------
// Step 2g: Update web_app_manifest.json with domain
// ---------------------------------------------------------------------------

step(7, TOTAL_STEPS, 'Update android-twa/app/src/main/res/raw/web_app_manifest.json');

const manifestPath = path.join(
  ROOT,
  'android-twa',
  'app',
  'src',
  'main',
  'res',
  'raw',
  'web_app_manifest.json',
);

if (!fs.existsSync(manifestPath)) {
  warn(`${manifestPath} not found — skipping. Run bubblewrap init first.`);
} else {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    fail(`Could not parse web_app_manifest.json: ${e.message}`);
    process.exit(1);
  }

  let manifestChanged = false;

  const wantedName = displayName;
  const wantedShortName = shortName;
  const wantedThemeColor = config.brand.primaryColor;
  const wantedBgColor = '#fffaf3';

  if (manifest.name !== wantedName) {
    manifest.name = wantedName;
    manifestChanged = true;
    ok(`  name -> ${wantedName}`);
  }

  if (manifest.short_name !== wantedShortName) {
    manifest.short_name = wantedShortName;
    manifestChanged = true;
    ok(`  short_name -> ${wantedShortName}`);
  }

  if (manifest.theme_color !== wantedThemeColor) {
    manifest.theme_color = wantedThemeColor;
    manifestChanged = true;
    ok(`  theme_color -> ${wantedThemeColor}`);
  }

  if (manifest.background_color !== wantedBgColor) {
    manifest.background_color = wantedBgColor;
    manifestChanged = true;
    ok(`  background_color -> ${wantedBgColor}`);
  }

  // Ensure icon paths are canonical
  const wantedIcons = [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ];
  const currentIconsJson = JSON.stringify(manifest.icons);
  const wantedIconsJson = JSON.stringify(wantedIcons);
  if (currentIconsJson !== wantedIconsJson) {
    manifest.icons = wantedIcons;
    manifestChanged = true;
    ok('  icons -> canonical PWA icon list');
  }

  if (manifestChanged) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8');
    ok('web_app_manifest.json saved.');
  } else {
    ok('web_app_manifest.json already up to date.');
  }
}

// ---------------------------------------------------------------------------
// Checklist: GitHub Secrets
// ---------------------------------------------------------------------------

header('GitHub Secrets — set these in your repo Settings > Secrets > Actions');

const secrets = [
  ['APPLE_TEAM_ID',                 'Apple Developer Team ID (10-char alphanumeric)'],
  ['ASC_KEY_ID',                    'App Store Connect API key ID'],
  ['ASC_ISSUER_ID',                 'App Store Connect API issuer UUID'],
  ['ASC_API_KEY_P8_BASE64',         'Contents of the .p8 private key, base64-encoded'],
  ['IOS_DIST_CERT_P12_BASE64',      'iOS Distribution Certificate (.p12), base64-encoded'],
  ['IOS_APPSTORE_PROFILE_BASE64',   'iOS App Store provisioning profile (.mobileprovision), base64-encoded'],
  ['IOS_DIST_CERT_PASSWORD',        'Password for the .p12 certificate'],
  ['ANDROID_KEYSTORE_BASE64',       'Android upload keystore (.jks), base64-encoded'],
  ['ANDROID_KEYSTORE_PROPERTIES',   'Contents of keystore.properties (storePassword/keyAlias/keyPassword)'],
  ['GOOGLE_PLAY_SA_JSON_BASE64',    'Google Play service account JSON key, base64-encoded'],
];

console.log('');
for (const [name, description] of secrets) {
  console.log(`  [ ] ${name}`);
  console.log(`        ${description}`);
}

console.log('');
console.log('  Tip: base64-encode a file on macOS/Linux:');
console.log('    base64 -i my-file.p12 | pbcopy');
console.log('  On Windows (PowerShell):');
console.log('    [Convert]::ToBase64String([IO.File]::ReadAllBytes("my-file.p12")) | Set-Clipboard');

// ---------------------------------------------------------------------------
// Checklist: Play Console one-time GUI tasks
// ---------------------------------------------------------------------------

header('Play Console — one-time GUI tasks (cannot be automated via API)');

const playTasks = [
  '広告ID申告（広告ID使用なし）',
  '広告申告（広告なし）',
  'ターゲットユーザー（18歳以上）',
  'データセーフティ',
  'コンテンツレーティング（IARCアンケート）',
  '健康アプリ申告',
  '行政アプリ申告（該当なしで送信）',
];

console.log('');
for (const task of playTasks) {
  console.log(`  [ ] ${task}`);
}

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

header('setup-new-app: DONE');
console.log('');
console.log(`  App:    ${displayName} (${displayNameEn})`);
console.log(`  Bundle: ${bundleId}`);
console.log(`  Domain: https://${productionDomain}`);
console.log(`  Privacy: ${privacyUrl}`);
console.log('');
console.log('  Next steps:');
console.log('  1. Fill in all GitHub Secrets listed above.');
console.log('  2. Complete Play Console GUI tasks listed above.');
console.log('  3. Create the app in App Store Connect (run: node scripts/asc-create-app.mjs).');
console.log('  4. Run: node scripts/android-patch-signing.mjs');
console.log('  5. Commit generated assets:  git add -A && git commit -m "chore: init app assets"');
console.log('');
