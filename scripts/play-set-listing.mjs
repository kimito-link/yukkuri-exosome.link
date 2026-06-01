/**
 * Google Play ストアの掲載情報を自動設定するスクリプト
 * - タイトル / 簡単な説明 / 詳しい説明
 * - アプリアイコン / フィーチャーグラフィック / スクリーンショット
 * - カテゴリ / 連絡先メール / ウェブサイト
 *
 * アプリ固有の値はすべて app.config.json から読み込む。
 * 詳しい説明 (FULL_DESC) は store-assets/play/listing-ja.txt から読み込む。
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { loadServiceAccount, makePlayClient, uploadListingImage } from './lib/play-api.mjs';
import { loadAppConfig } from './lib/app-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO     = path.resolve(__dirname, '..');
const LANGUAGE = 'ja-JP';
const PLAY_DIR = path.join(REPO, 'store-assets', 'play');
const SS_DIR   = path.join(PLAY_DIR, 'screenshots');

// ── app.config.json から読み込む ─────────────────────────
const cfg = loadAppConfig();

const PACKAGE      = cfg.stores.playPackageName;
const TITLE        = cfg.identity.displayName;
const APP_CATEGORY = cfg.stores.primaryCategory;

// SHORT_DESC: summaryJa を 80 文字以内に切り詰める
const _summaryJa = cfg.businessModel.summaryJa ?? '';
const SHORT_DESC  = _summaryJa.length > 80 ? _summaryJa.slice(0, 80) : _summaryJa;

// APP_DETAILS: contact フィールドから組み立てる
const APP_DETAILS = {
  contactEmail:    cfg.contact.email,
  contactWebsite:  cfg.contact.marketingUrl,
  defaultLanguage: LANGUAGE,
  privacyPolicy:   cfg.contact.privacyUrl,
};

// ── FULL_DESC: ファイルから読み込む ──────────────────────
const LISTING_FILE = path.join(PLAY_DIR, 'listing-ja.txt');
const FULL_DESC = fs.existsSync(LISTING_FILE)
  ? fs.readFileSync(LISTING_FILE, 'utf8').trim()
  : `${TITLE} の詳しい説明は現在準備中です。\n\n${cfg.contact.marketingUrl}`;

// ── メイン ───────────────────────────────────────────────
const sa  = loadServiceAccount();
const api = makePlayClient(sa, PACKAGE);

console.log('[1] Opening edit...');
const edit   = await api('POST', '/edits', {});
const editId = edit.id;
console.log(`  editId=${editId}`);

// テキスト掲載情報
console.log('[2] Setting listing text...');
await api('PUT', `/edits/${editId}/listings/${LANGUAGE}`, {
  language:         LANGUAGE,
  title:            TITLE,
  shortDescription: SHORT_DESC,
  fullDescription:  FULL_DESC,
});
console.log('  listing text OK');

// アプリ詳細（連絡先）
console.log('[3] Setting app details (contact)...');
await api('PUT', `/edits/${editId}/details`, APP_DETAILS);
console.log('  details OK');

// カテゴリは listings の appCategory フィールドで設定
// Play API v3 では listings PUT に含める
console.log('[3b] Setting category via listing update...');
await api('PATCH', `/edits/${editId}/listings/${LANGUAGE}`, {
  appCategory: APP_CATEGORY,
}).catch(() => {
  // PATCH 未対応なら無視（カテゴリは GUI で設定）
  console.log('  category PATCH not supported — set manually in Play Console');
});

// アプリアイコン
console.log('[4] Uploading app icon...');
const iconPath = path.join(PLAY_DIR, 'icon-512.png');
if (fs.existsSync(iconPath)) {
  await uploadListingImage(sa, PACKAGE, editId, LANGUAGE, 'icon', iconPath);
  console.log('  icon OK');
} else {
  console.log('  WARN: icon-512.png not found, skipping');
}

// フィーチャーグラフィック
console.log('[5] Uploading feature graphic...');
const fgPath = path.join(PLAY_DIR, 'feature-graphic-1024x500.png');
if (fs.existsSync(fgPath)) {
  await uploadListingImage(sa, PACKAGE, editId, LANGUAGE, 'featureGraphic', fgPath);
  console.log('  featureGraphic OK');
} else {
  console.log('  WARN: feature-graphic-1024x500.png not found, skipping');
}

// スクリーンショット
console.log('[6] Uploading phone screenshots...');
const ssFiles = fs.readdirSync(SS_DIR)
  .filter(f => /\.(png|jpe?g)$/i.test(f))
  .sort()
  .map(f => path.join(SS_DIR, f));

if (ssFiles.length > 0) {
  for (const f of ssFiles) {
    await uploadListingImage(sa, PACKAGE, editId, LANGUAGE, 'phoneScreenshots', f);
    console.log(`  uploaded: ${path.basename(f)}`);
  }
} else {
  console.log('  WARN: no screenshots found in', SS_DIR);
}

// commit
console.log('[7] Committing edit...');
const committed = await api('POST', `/edits/${editId}:commit`, {});
console.log(`  committed. id=${committed.id}`);
console.log('\nDONE.');
