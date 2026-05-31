#!/usr/bin/env node
/**
 * PENDING_DEVELOPER_RELEASE の App Store バージョンを公開する。
 * 任意で ja の whatsNew を CURRENT-ja.txt で更新してからリリースする。
 *
 * Env:
 *   APPSTORE_CONNECT_KEY_ID, APPSTORE_CONNECT_ISSUER_ID, APPSTORE_CONNECT_API_KEY_P8_BASE64
 *   APP_BUNDLE_ID (default com.kimito.link.fujisancompass)
 *   RELEASE_VERSION (default 2.4.0)
 *   UPDATE_WHATS_NEW (default 1) — 0 でスキップ
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  makeAscClient,
  findApp,
  listVersions,
  getLocalizations,
  requestAppStoreVersionRelease,
  sleep,
} from './lib/asc-api.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.kimito.link.fujisancompass';
const PLATFORM = 'IOS';
const RELEASE_VERSION = (process.env.RELEASE_VERSION || '2.4.0').trim();
const UPDATE_WHATS_NEW = process.env.UPDATE_WHATS_NEW !== '0';

const BANNED_IN_IOS_WHATS_NEW = [
  'Android',
  'Google Play',
  'Play Store',
  'Play Console',
  'Galaxy Store',
  'Amazon Appstore',
];

function resolvePrivateKey() {
  const direct = process.env.APPSTORE_CONNECT_API_KEY_P8;
  if (direct && direct.includes('BEGIN PRIVATE KEY')) return direct;
  const b64 = process.env.APPSTORE_CONNECT_API_KEY_P8_BASE64;
  if (b64) return Buffer.from(b64.trim(), 'base64').toString('utf8');
  throw new Error('Provide APPSTORE_CONNECT_API_KEY_P8_BASE64');
}

function readWhatsNew() {
  const p = path.join(REPO, 'release-notes', 'CURRENT-ja.txt');
  const text = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').trim();
  const hits = BANNED_IN_IOS_WHATS_NEW.filter((w) => text.toLowerCase().includes(w.toLowerCase()));
  if (hits.length) {
    throw new Error(`CURRENT-ja.txt contains banned platform names for iOS: ${hits.join(', ')}`);
  }
  return text;
}

async function patchJaWhatsNew(api, versionId, whatsNew) {
  const locs = await getLocalizations(api, versionId);
  const ja = locs.find((l) => l.attributes?.locale === 'ja');
  if (!ja) {
    throw new Error(`ja localization not found for version ${versionId}`);
  }
  console.log(`  patch ja whatsNew only (${whatsNew.length} chars) id=${ja.id}`);
  try {
    await api('PATCH', `/v1/appStoreVersionLocalizations/${ja.id}`, {
      data: {
        type: 'appStoreVersionLocalizations',
        id: ja.id,
        attributes: { whatsNew },
      },
    });
  } catch (e) {
    if (String(e.message).includes('409') || String(e.message).includes('cannot be edited')) {
      console.warn(`  whatsNew not editable in current state; continuing to release without update.`);
      return;
    }
    throw e;
  }
}

(async () => {
  const keyId = process.env.APPSTORE_CONNECT_KEY_ID;
  const issuerId = process.env.APPSTORE_CONNECT_ISSUER_ID;
  if (!keyId || !issuerId) throw new Error('Set APPSTORE_CONNECT_KEY_ID and APPSTORE_CONNECT_ISSUER_ID');

  const api = makeAscClient({ keyId, issuerId, privateKey: resolvePrivateKey() });

  console.log(`[1] Find app bundleId=${BUNDLE_ID}`);
  const app = await findApp(api, BUNDLE_ID);
  if (!app) throw new Error(`App not found: ${BUNDLE_ID}`);
  console.log(`  appId=${app.id} name="${app.attributes.name}"`);

  console.log(`\n[2] Find version ${RELEASE_VERSION}...`);
  const versions = await listVersions(api, app.id, 50);
  const target = versions.find(
    (v) => v.platform === PLATFORM && v.versionString === RELEASE_VERSION,
  );
  if (!target) {
    throw new Error(`Version ${RELEASE_VERSION} not found on App Store Connect`);
  }
  console.log(`  id=${target.id} state=${target.appStoreState}`);

  if (target.appStoreState === 'READY_FOR_SALE') {
    console.log(`  ${RELEASE_VERSION} is already READY_FOR_SALE. Nothing to release.`);
    process.exit(0);
  }
  if (target.appStoreState !== 'PENDING_DEVELOPER_RELEASE') {
    throw new Error(
      `Version ${RELEASE_VERSION} is ${target.appStoreState}, not PENDING_DEVELOPER_RELEASE. ` +
        'Release manually in App Store Connect or pick another RELEASE_VERSION.',
    );
  }

  if (UPDATE_WHATS_NEW) {
    console.log('\n[3] Update ja whatsNew before release...');
    await patchJaWhatsNew(api, target.id, readWhatsNew());
  } else {
    console.log('\n[3] Skipping whatsNew update (UPDATE_WHATS_NEW=0)');
  }

  console.log('\n[4] Request App Store release...');
  await requestAppStoreVersionRelease(api, target.id);
  console.log('  release request accepted');

  console.log('\n[5] Poll until version leaves PENDING_DEVELOPER_RELEASE...');
  const maxLoops = 40;
  for (let i = 0; i < maxLoops; i++) {
    await sleep(15_000);
    const fresh = (await listVersions(api, app.id, 50)).find(
      (v) => v.id === target.id,
    );
    const state = fresh?.appStoreState || 'unknown';
    console.log(`  poll ${i + 1}/${maxLoops}: ${RELEASE_VERSION} -> ${state}`);
    if (state === 'READY_FOR_SALE' || state === 'PENDING_APPLE_RELEASE' || state === 'PROCESSING_FOR_APP_STORE') {
      console.log(`\nDONE. ${RELEASE_VERSION} is now ${state}.`);
      process.exit(0);
    }
    if (state !== 'PENDING_DEVELOPER_RELEASE') {
      console.log(`\nDONE. ${RELEASE_VERSION} moved to ${state}.`);
      process.exit(0);
    }
  }
  console.warn(`\nWARN: ${RELEASE_VERSION} still PENDING_DEVELOPER_RELEASE after polling. Check App Store Connect.`);
})().catch((e) => {
  console.error(`\nFATAL: ${e.message}`);
  process.exit(1);
});
