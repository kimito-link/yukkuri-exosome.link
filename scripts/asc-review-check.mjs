#!/usr/bin/env node
// Poll App Store Connect for partner-app review status.
// Detect REJECTED / METADATA_REJECTED / DEVELOPER_REJECTED / INVALID_BINARY versions
// and emit a JSON report. A companion workflow step creates GitHub Issues
// from the report so the user no longer needs to forward "your app was
// rejected" emails by hand.
//
// Reads:
//   env APPSTORE_CONNECT_KEY_ID
//   env APPSTORE_CONNECT_ISSUER_ID
//   env APPSTORE_CONNECT_API_KEY_P8_BASE64 (or _PATH or raw _P8)
//   env APP_BUNDLE_ID (default: com.reversehack.partner)
//
// Outputs (stdout):
//   {"appId":"...","bundleId":"...","rejections":[{...}],"timestamp":"..."}
//
// Exit codes:
//   0 = ran successfully (rejections list may be empty)
//   non-zero = api/auth error (workflow surfaces this directly)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeAscClient, findApp, listVersions } from './lib/asc-api.mjs';
import { classifyRejection, fetchRejectionFeedback } from './lib/asc-rejection-classify.mjs';

const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.reversehack.partner';

const REJECT_STATES = new Set([
  'REJECTED',
  'METADATA_REJECTED',
  'DEVELOPER_REJECTED',
  'INVALID_BINARY',
]);

function resolvePrivateKey() {
  const direct = process.env.APPSTORE_CONNECT_API_KEY_P8;
  if (direct && direct.includes('BEGIN PRIVATE KEY')) return direct;
  const filePath = process.env.APPSTORE_CONNECT_API_KEY_P8_PATH;
  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  const b64 = process.env.APPSTORE_CONNECT_API_KEY_P8_BASE64;
  if (b64) {
    return Buffer.from(b64.trim(), 'base64').toString('utf8');
  }
  throw new Error('Provide APPSTORE_CONNECT_API_KEY_P8_PATH, _BASE64, or _P8');
}

function emit(report) {
  process.stdout.write(JSON.stringify(report) + '\n');
}

(async () => {
  const keyId = process.env.APPSTORE_CONNECT_KEY_ID;
  const issuerId = process.env.APPSTORE_CONNECT_ISSUER_ID;
  if (!keyId || !issuerId) {
    throw new Error('Missing APPSTORE_CONNECT_KEY_ID / APPSTORE_CONNECT_ISSUER_ID');
  }
  const privateKey = resolvePrivateKey();
  const api = makeAscClient({ keyId, issuerId, privateKey });

  const app = await findApp(api, BUNDLE_ID);
  if (!app) {
    // No App Store Connect app record yet. Silently emit empty report.
    emit({
      bundleId: BUNDLE_ID,
      appId: null,
      rejections: [],
      timestamp: new Date().toISOString(),
      note: 'no_app_record_yet',
    });
    return;
  }

  const versions = await listVersions(api, app.id, 20);
  const rejected = versions.filter((v) => REJECT_STATES.has(v.appStoreState));
  const rejections = [];
  for (const v of rejected) {
    const feedbackText = await fetchRejectionFeedback(api, v.id);
    const classification = classifyRejection({ state: v.appStoreState, feedbackText });
    rejections.push({
      versionId: v.id,
      versionString: v.versionString,
      state: v.appStoreState,
      platform: v.platform,
      feedbackText,
      classification,
    });
  }

  emit({
    bundleId: BUNDLE_ID,
    appId: app.id,
    appName: app.attributes?.name || null,
    rejections,
    timestamp: new Date().toISOString(),
  });
})().catch((e) => {
  console.error(`asc-review-check FATAL: ${e.message}`);
  process.exit(1);
});
