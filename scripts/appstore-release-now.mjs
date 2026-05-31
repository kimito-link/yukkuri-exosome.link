#!/usr/bin/env node
// Trigger Apple to release an approved iOS version to the App Store.
//
// Submissions in this repo use releaseType=MANUAL so the developer can
// coordinate launch timing. After Apple approves a version it sits in
// PENDING_DEVELOPER_RELEASE waiting for the developer to click "Release"
// in App Store Connect. This script does that click via the API:
// POST /v1/appStoreVersionReleaseRequests.
//
// Reads:
//   env APPSTORE_CONNECT_KEY_ID
//   env APPSTORE_CONNECT_ISSUER_ID
//   env APPSTORE_CONNECT_API_KEY_P8_PATH OR _BASE64
//   env APP_BUNDLE_ID (default: com.reversehack.partner)
//   ./package.json -> version (defaults to current marketing version)
//
// Behavior:
//   1. Find app by bundleId.
//   2. List versions; find the one matching package.json version that is
//      currently PENDING_DEVELOPER_RELEASE.
//   3. POST /v1/appStoreVersionReleaseRequests with that version's id.
//   4. Log final state. If the version is already READY_FOR_SALE this is
//      a no-op (clean exit) so the script is safe to re-run.
//
// Idempotent. Safe to call from a workflow_dispatch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeAscClient, findApp, listVersions } from './lib/asc-api.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.reversehack.partner';
const PLATFORM = 'IOS';

function readMarketingVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  return String(pkg.version).trim();
}

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
  throw new Error('Provide APPSTORE_CONNECT_API_KEY_P8_PATH, _BASE64, or _P8 env');
}

(async () => {
  const keyId = process.env.APPSTORE_CONNECT_KEY_ID;
  const issuerId = process.env.APPSTORE_CONNECT_ISSUER_ID;
  if (!keyId || !issuerId) {
    throw new Error('Set APPSTORE_CONNECT_KEY_ID and APPSTORE_CONNECT_ISSUER_ID');
  }
  const privateKey = resolvePrivateKey();
  const targetVersion = (process.env.IOS_RELEASE_VERSION || readMarketingVersion()).trim();

  console.log(`bundleId=${BUNDLE_ID} targetVersion=${targetVersion}`);

  const api = makeAscClient({ keyId, issuerId, privateKey });

  console.log('\n[1] Find app...');
  const app = await findApp(api, BUNDLE_ID);
  if (!app) throw new Error(`App not found for bundleId=${BUNDLE_ID}`);
  console.log(`  appId=${app.id} name="${app.attributes.name}"`);

  console.log('\n[2] Find version...');
  const versions = await listVersions(api, app.id, 50);
  const target = versions.find(
    (v) => v.platform === PLATFORM && v.versionString === targetVersion,
  );
  if (!target) {
    throw new Error(
      `No appStoreVersion found for versionString=${targetVersion}. ` +
        `Bump package.json or set IOS_RELEASE_VERSION env to a version Apple has approved.`,
    );
  }
  console.log(`  versionId=${target.id} state=${target.appStoreState}`);

  if (target.appStoreState === 'READY_FOR_SALE') {
    console.log(`  version ${targetVersion} is already READY_FOR_SALE. Nothing to do.`);
    return;
  }
  if (target.appStoreState !== 'PENDING_DEVELOPER_RELEASE') {
    throw new Error(
      `Version ${targetVersion} is in state ${target.appStoreState}, not PENDING_DEVELOPER_RELEASE. ` +
        `Either Apple has not approved it yet (wait), or it has already been released, ` +
        `or it was rejected (fix and resubmit).`,
    );
  }

  console.log('\n[3] POST appStoreVersionReleaseRequest...');
  const created = await api('POST', '/v1/appStoreVersionReleaseRequests', {
    data: {
      type: 'appStoreVersionReleaseRequests',
      relationships: {
        appStoreVersion: { data: { type: 'appStoreVersions', id: target.id } },
      },
    },
  });
  console.log(`  release request id=${created.data.id}`);

  console.log('\n[4] Verify state transition...');
  // Refetch — Apple may take a few seconds to update appStoreState.
  for (let i = 0; i < 6; i++) {
    const r = await api('GET', `/v1/appStoreVersions/${target.id}`);
    const state = r.data.attributes.appStoreState;
    console.log(`  attempt ${i + 1}/6: state=${state}`);
    if (state !== 'PENDING_DEVELOPER_RELEASE') {
      console.log('\nDONE. Release initiated.');
      return;
    }
    await new Promise((res) => setTimeout(res, 5000));
  }
  console.log(
    '\nRelease request accepted but state has not transitioned yet. ' +
      'Apple usually updates within minutes. Re-run to verify, or check App Store Connect.',
  );
})().catch((e) => {
  console.error(`\nFATAL: ${e.message}`);
  process.exit(1);
});
