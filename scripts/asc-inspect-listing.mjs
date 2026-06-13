#!/usr/bin/env node
// READ-ONLY: dump the current App Store Connect listing text so we can see
// exactly what Apple has stored (name / subtitle / description / promotional
// text / keywords / what's new) for each version. Makes no writes.
//
// Reads:
//   env APPSTORE_CONNECT_KEY_ID
//   env APPSTORE_CONNECT_ISSUER_ID
//   env APPSTORE_CONNECT_API_KEY_P8_PATH (or _BASE64 or raw _P8)
//   env APP_BUNDLE_ID (default: app.config bundleId)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeAscClient, findApp, listVersions, getLocalizations } from './lib/asc-api.mjs';
import { loadAppConfig } from './lib/app-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_CONFIG = loadAppConfig();
const BUNDLE_ID = process.env.APP_BUNDLE_ID || APP_CONFIG.identity.bundleId;

function resolvePrivateKey() {
  const direct = process.env.APPSTORE_CONNECT_API_KEY_P8;
  if (direct && direct.includes('BEGIN PRIVATE KEY')) return direct;
  const filePath = process.env.APPSTORE_CONNECT_API_KEY_P8_PATH;
  if (filePath && fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
  const b64 = process.env.APPSTORE_CONNECT_API_KEY_P8_BASE64;
  if (b64) return Buffer.from(b64.trim(), 'base64').toString('utf8');
  throw new Error('Provide APPSTORE_CONNECT_API_KEY_P8_PATH, _BASE64, or _P8');
}

function line() { console.log('─'.repeat(72)); }

(async () => {
  const keyId = process.env.APPSTORE_CONNECT_KEY_ID;
  const issuerId = process.env.APPSTORE_CONNECT_ISSUER_ID;
  if (!keyId || !issuerId) throw new Error('Missing APPSTORE_CONNECT_KEY_ID / ISSUER_ID');
  const api = makeAscClient({ keyId, issuerId, privateKey: resolvePrivateKey() });

  const app = await findApp(api, BUNDLE_ID);
  if (!app) { console.log(`No App Store Connect app for bundleId=${BUNDLE_ID}`); return; }
  console.log(`App: ${app.attributes?.name}  (bundleId=${BUNDLE_ID}, id=${app.id})`);

  // App-level info localizations (name / subtitle)
  try {
    const infos = await api('GET', `/v1/apps/${app.id}/appInfos?fields[appInfos]=appStoreState`);
    for (const info of infos.data || []) {
      const locs = await api('GET',
        `/v1/appInfos/${info.id}/appInfoLocalizations?fields[appInfoLocalizations]=locale,name,subtitle`);
      for (const l of locs.data || []) {
        if (!String(l.attributes?.locale || '').startsWith('ja')) continue;
        line();
        console.log(`AppInfo [${info.attributes?.appStoreState}] locale=${l.attributes.locale}`);
        console.log(`  name    : ${l.attributes.name}`);
        console.log(`  subtitle: ${l.attributes.subtitle}`);
      }
    }
  } catch (e) { console.log(`(appInfo read failed: ${e.message.slice(0, 200)})`); }

  // Version-level localizations (description / promo / keywords / whatsNew)
  const versions = await listVersions(api, app.id, 20);
  for (const v of versions) {
    if (v.platform !== 'IOS') continue;
    const locs = await getLocalizations(api, v.id);
    for (const l of locs) {
      if (!String(l.attributes?.locale || '').startsWith('ja')) continue;
      line();
      console.log(`Version ${v.versionString} [${v.appStoreState}] locale=${l.attributes.locale}`);
      console.log(`  promotionalText: ${l.attributes.promotionalText || '(empty)'}`);
      console.log(`  keywords       : ${l.attributes.keywords || '(empty)'}`);
      console.log(`  whatsNew       : ${l.attributes.whatsNew || '(empty)'}`);
      console.log(`  --- description ---`);
      console.log(l.attributes.description || '(empty)');
    }
  }
  line();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
