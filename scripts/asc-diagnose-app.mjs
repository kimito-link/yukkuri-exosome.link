#!/usr/bin/env node
// One-shot diagnostic for partner ASC app state.
// Prints every API-readable signal that might explain why
// `POST /v1/appStoreVersions` returns 409 ENTITY_ERROR.RELATIONSHIP.INVALID
// "You cannot create a new version of the App in the current state."
//
// Use: trigger asc-diagnose-app.yml workflow (workflow_dispatch). Output goes
// to the workflow log.
import fs from 'node:fs';
import { makeAscClient } from './lib/asc-api.mjs';

const APP_ID = process.env.APP_ID || '6769407908';

function resolvePrivateKey() {
  const direct = process.env.APPSTORE_CONNECT_API_KEY_P8;
  if (direct && direct.includes('BEGIN PRIVATE KEY')) return direct;
  const filePath = process.env.APPSTORE_CONNECT_API_KEY_P8_PATH;
  if (filePath && fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
  const b64 = process.env.APPSTORE_CONNECT_API_KEY_P8_BASE64;
  if (b64) return Buffer.from(b64.trim(), 'base64').toString('utf8');
  throw new Error('Provide APPSTORE_CONNECT_API_KEY_P8_PATH/_BASE64/_P8');
}

const api = makeAscClient({
  keyId: process.env.APPSTORE_CONNECT_KEY_ID,
  issuerId: process.env.APPSTORE_CONNECT_ISSUER_ID,
  privateKey: resolvePrivateKey(),
});

async function get(path, label) {
  try {
    const r = await api('GET', path);
    console.log(`\n[OK] ${label}\n${path}`);
    console.log(JSON.stringify(r, null, 2).slice(0, 4000));
    return r;
  } catch (e) {
    console.log(`\n[FAIL] ${label}\n${path}\n${e.message.slice(0, 600)}`);
    return null;
  }
}

console.log(`# ASC app diagnostic for app=${APP_ID}`);

await get(`/v1/apps/${APP_ID}`, 'app');
await get(`/v1/apps/${APP_ID}/appInfos`, 'appInfos');
const appInfos = await get(`/v1/apps/${APP_ID}/appInfos?include=appInfoLocalizations,ageRatingDeclaration,primaryCategory,secondaryCategory`, 'appInfos w/ relations');
if (appInfos?.data?.[0]) {
  const aiId = appInfos.data[0].id;
  await get(`/v1/appInfos/${aiId}/ageRatingDeclaration`, 'ageRatingDeclaration');
  await get(`/v1/appInfos/${aiId}/appInfoLocalizations`, 'appInfoLocalizations');
}
await get(`/v1/apps/${APP_ID}/appStoreVersions?limit=20`, 'appStoreVersions');
await get(`/v1/apps/${APP_ID}/builds?limit=10`, 'builds');
await get(`/v1/apps/${APP_ID}/preReleaseVersions?limit=10`, 'preReleaseVersions');
await get(`/v1/apps/${APP_ID}/reviewSubmissions?limit=10`, 'reviewSubmissions');
await get(`/v1/apps/${APP_ID}/appPricePoints?limit=3`, 'appPricePoints (sample)');
await get(`/v1/apps/${APP_ID}/appPricePoints?filter[territory]=USA&limit=5`, 'appPricePoints filter[territory]=USA');
try {
  const r = await api('GET', `/v1/apps/${APP_ID}/appPricePoints?limit=200`);
  const zero = (r.data || []).filter((p) => Number(p.attributes?.customerPrice) === 0);
  console.log(`\n[INFO] $0 price points in first 200: ${zero.length}`);
  for (const p of zero.slice(0, 5)) {
    console.log(`  id=${p.id} customerPrice=${p.attributes.customerPrice} priceTier=${p.attributes.priceTier} territory=${p.relationships?.territory?.data?.id}`);
  }
} catch (e) { console.log(`(zero-price scan failed: ${e.message.slice(0, 200)})`); }
try {
  const r = await api('GET', `/v2/apps/${APP_ID}/appPriceSchedule?include=manualPrices&fields[appPriceSchedules]=manualPrices`);
  console.log(`\n[INFO] existing appPriceSchedule: ${JSON.stringify(r).slice(0, 800)}`);
} catch (e) { console.log(`(appPriceSchedule fetch failed: ${e.message.slice(0, 300)})`); }
await get(`/v1/apps/${APP_ID}/endUserLicenseAgreement`, 'endUserLicenseAgreement');

console.log('\n# Done.');
