// One-shot: check App Store territory availability for the app.
// Diagnoses the "このアプリは現在、この国または地域では入手できません" error.
import { makeAscClient, findApp } from './lib/asc-api.mjs';

const keyId = process.env.APPSTORE_CONNECT_KEY_ID || process.env.ASC_KEY_ID;
const issuerId = process.env.APPSTORE_CONNECT_ISSUER_ID || process.env.ASC_ISSUER_ID;
const privateKey =
  process.env.ASC_PRIVATE_KEY ||
  process.env.APPSTORE_CONNECT_PRIVATE_KEY_PATH ||
  process.env.ASC_P8_PATH ||
  'C:\\Users\\info\\OneDrive\\Apple\\AuthKey_P8W74LR2GH.p8';
const bundleId = process.env.APP_BUNDLE_ID || process.env.IOS_BUNDLE_ID || 'com.kimito.link.yukkuriexosome';

if (!keyId || !issuerId || !privateKey) {
  console.error('Missing ASC_KEY_ID / ASC_ISSUER_ID / ASC_PRIVATE_KEY(or ASC_P8_PATH) in env');
  process.exit(1);
}

const api = makeAscClient({ keyId, issuerId, privateKey });

const app = await findApp(api, bundleId);
if (!app) {
  console.error(`App not found for bundleId=${bundleId}`);
  process.exit(1);
}
const appId = app.id;
console.log(`App: ${app.attributes?.name} (${bundleId})  id=${appId}`);

// 1) appAvailabilities GET_INSTANCE — resource id == appId
for (const base of [`/v2/appAvailabilities/${appId}`, `/v1/appAvailabilities/${appId}`]) {
 try {
  const av = await api('GET', `${base}?include=territoryAvailabilities&limit[territoryAvailabilities]=200`);
  console.log(`\n=== appAvailability (${base}) ===`);
  console.log('availableInNewTerritories:', av.data?.attributes?.availableInNewTerritories);
  const included = (av.included || []).filter((i) => i.type === 'territoryAvailabilities');
  const available = included.filter((t) => t.attributes?.available);
  console.log(`territoryAvailabilities returned: ${included.length}, available=${available.length}`);
  const jp = included.find((t) => t.id === 'JPN' || t.id?.startsWith('JPN'));
  console.log('JP entry:', jp ? JSON.stringify(jp.attributes) : 'NOT FOUND in returned page');
  if (available.length) {
    console.log('available sample:', available.slice(0, 15).map((t) => t.id).join(', '));
  }
  break;
 } catch (e) {
  console.log(`\n(appAvailability ${base} failed:`, e.message.split('\n').slice(0,4).join(' '), ')');
 }
}

// 1a) app include appAvailabilityV2 -> follow the link
try {
  const r = await api('GET', `/v1/apps/${appId}?include=appAvailabilityV2`);
  const rel = r.data?.relationships?.appAvailabilityV2;
  console.log('\n=== apps?include=appAvailabilityV2 ===');
  console.log('related link:', rel?.links?.related);
  const availId = rel?.data?.id;
  console.log('appAvailability id:', availId);
  if (rel?.links?.related) {
    const av = await api('GET', `${rel.links.related}?include=territoryAvailabilities&limit[territoryAvailabilities]=200`);
    console.log('availableInNewTerritories:', av.data?.attributes?.availableInNewTerritories);
    const inc = (av.included || []).filter((i) => i.type === 'territoryAvailabilities');
    const available = inc.filter((t) => t.attributes?.available);
    console.log(`territories returned=${inc.length} available=${available.length}`);
    console.log('includes JPN(available):', available.some((t) => t.id === 'JPN' || t.id?.startsWith('JPN')));
    console.log('available ids:', available.map((t) => t.id).slice(0, 30).join(', '));
  }
} catch (e) {
  console.log('\n(apps include appAvailabilityV2 failed:', e.message.split('\n').slice(0, 5).join(' '), ')');
}

// 1b) try v1 app relationship variant
try {
  const av1 = await api('GET', `/v1/apps/${appId}/relationships/availableTerritories?limit=200`);
  const ids = (av1.data || []).map((d) => d.id);
  console.log('\n=== v1 relationships availableTerritories ===');
  console.log(`count=${ids.length}, includes JPN:`, ids.includes('JPN'));
  console.log('sample:', ids.slice(0, 15).join(', '));
} catch (e) {
  console.log('\n(v1 relationships availableTerritories failed:', e.message.split('\n')[0], ')');
}

// 3) Version state sanity
try {
  const v = await api('GET', `/v1/apps/${appId}/appStoreVersions?limit=5&fields[appStoreVersions]=versionString,appStoreState,releaseType`);
  console.log('\n=== versions ===');
  for (const ver of v.data || []) {
    console.log(`  ${ver.attributes.versionString}  state=${ver.attributes.appStoreState}  release=${ver.attributes.releaseType}`);
  }
} catch (e) {
  console.log('(versions failed:', e.message, ')');
}
