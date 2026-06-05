#!/usr/bin/env node
/**
 * App Store Connect のリジェクトを取得し、適切な返信テンプレを表示する。
 *
 * App Store Connect API には Resolution Center メッセージへの POST 公開
 * エンドポイントが存在しない（2026-06 時点）ため、返信は ASC GUI に手動コピペ
 * するしかない。
 *
 * このスクリプトは「リジェクト本文を読む → カテゴリ判定 → app-review-replies/
 * から該当テンプレを表示 → コピペで貼り付け」という流れを支援する。
 *
 * Usage:
 *   node scripts/asc-rejection-handle.mjs            # 最新リジェクトのみ表示
 *   node scripts/asc-rejection-handle.mjs --all      # 過去すべて
 *   node scripts/asc-rejection-handle.mjs --copy     # テンプレを stdout に流す（pbcopy 等にパイプ可）
 *
 * Env: 通常の ASC 認証情報（APPSTORE_CONNECT_KEY_ID / _ISSUER_ID / _API_KEY_P8_BASE64 等）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeAscClient, findApp, listVersions } from './lib/asc-api.mjs';
import { classifyRejection, fetchRejectionFeedback } from './lib/asc-rejection-classify.mjs';
import { loadAppConfig, getProjectRoot } from './lib/app-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = getProjectRoot();

const args = new Set(process.argv.slice(2));
const SHOW_ALL = args.has('--all');
const COPY_MODE = args.has('--copy');

const REJECT_STATES = new Set([
  'DEVELOPER_REJECTED',
  'METADATA_REJECTED',
  'REJECTED',
  'INVALID_BINARY',
]);

function resolvePrivateKey() {
  const direct = process.env.APPSTORE_CONNECT_API_KEY_P8;
  if (direct && direct.includes('BEGIN PRIVATE KEY')) return direct;
  const filePath = process.env.APPSTORE_CONNECT_API_KEY_P8_PATH;
  if (filePath && fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
  const b64 = process.env.APPSTORE_CONNECT_API_KEY_P8_BASE64;
  if (b64) return Buffer.from(b64.trim(), 'base64').toString('utf8');
  throw new Error('Provide APPSTORE_CONNECT_API_KEY_P8 / _PATH / _BASE64');
}

const config = loadAppConfig();
const BUNDLE_ID = process.env.APP_BUNDLE_ID || config.identity.bundleId;

const api = makeAscClient({
  keyId: process.env.APPSTORE_CONNECT_KEY_ID,
  issuerId: process.env.APPSTORE_CONNECT_ISSUER_ID,
  privateKey: resolvePrivateKey(),
});

const app = await findApp(api, BUNDLE_ID);
if (!app) {
  console.error(`App not found: ${BUNDLE_ID}`);
  process.exit(1);
}

const versions = await listVersions(api, app.id, 20);
const rejected = versions
  .filter((v) => REJECT_STATES.has(v.appStoreState))
  .sort((a, b) => (b.versionString || '').localeCompare(a.versionString || ''));

if (rejected.length === 0) {
  console.log('✓ No rejected versions found. Nothing to handle.');
  process.exit(0);
}

const targets = SHOW_ALL ? rejected : [rejected[0]];

for (const v of targets) {
  const feedback = await fetchRejectionFeedback(api, v.id);
  const cls = classifyRejection({ state: v.appStoreState, feedbackText: feedback });

  if (!COPY_MODE) {
    console.log(`\n${'='.repeat(72)}`);
    console.log(`Version: ${v.versionString} (${v.appStoreState})`);
    console.log(`Category: ${cls.code} — ${cls.label}`);
    console.log(`Action: ${cls.action}`);
    if (cls.replyTemplate) {
      console.log(`Reply Template: ${cls.replyTemplate}`);
    }
    console.log(`\nApple Feedback:\n${feedback || '(none)'}`);
    console.log(`\nHint:\n${cls.hint}`);
    console.log(`${'='.repeat(72)}`);
  }

  if (cls.replyTemplate) {
    const templatePath = path.join(ROOT, cls.replyTemplate);
    if (fs.existsSync(templatePath)) {
      const content = fs.readFileSync(templatePath, 'utf8');
      if (COPY_MODE) {
        // テンプレ本文だけ stdout（pbcopy / clip にパイプ可）
        process.stdout.write(content);
      } else {
        console.log(`\n--- Reply Template Content ---`);
        console.log(content);
        console.log(`--- End Template ---`);
        console.log(`\n💡 To copy to clipboard: node scripts/asc-rejection-handle.mjs --copy | clip   (Windows)`);
        console.log(`                       : node scripts/asc-rejection-handle.mjs --copy | pbcopy (macOS)`);
      }
    } else {
      console.log(`\n⚠️  Reply template file not found: ${templatePath}`);
      console.log(`Create one based on existing templates in app-review-replies/`);
    }
  } else if (!COPY_MODE) {
    console.log(`\n(No reply template registered for this category.`);
    console.log(`Consider creating app-review-replies/<guideline>.md and registering it`);
    console.log(`in scripts/lib/asc-rejection-classify.mjs PATTERNS.)`);
  }
}
