#!/usr/bin/env node
// One-shot patch of appStoreReviewDetail (contact + demo account) on
// the CURRENT WAITING_FOR_REVIEW or PREPARE_FOR_SUBMISSION version.
// Used when secrets change AFTER the version was already submitted —
// appstore-submit.mjs's pre-check would return early without doing the
// PATCH otherwise.
import fs from 'node:fs';
import { makeAscClient, findApp, listVersions, getReviewDetail } from './lib/asc-api.mjs';
import { loadAppConfig } from './lib/app-config.mjs';

const APP_CONFIG = loadAppConfig();
const BUNDLE_ID = process.env.APP_BUNDLE_ID || APP_CONFIG.identity.bundleId;
const PRODUCTION_URL = `https://${APP_CONFIG.identity.productionDomain}`;

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

const app = await findApp(api, BUNDLE_ID);
if (!app) {
  console.error(`No app found for bundle ${BUNDLE_ID}`);
  process.exit(1);
}

const versions = await listVersions(api, app.id, 20);
const target = versions.find(
  (v) =>
    v.platform === 'IOS' &&
    ['WAITING_FOR_REVIEW', 'PREPARE_FOR_SUBMISSION', 'IN_REVIEW'].includes(v.appStoreState),
);
if (!target) {
  console.error('No IOS version in editable-detail state found.');
  process.exit(1);
}
console.log(`Target version: ${target.id} (${target.versionString}, ${target.appStoreState})`);

const existing = await getReviewDetail(api, target.id);
if (!existing) {
  console.log('No existing review detail. Creating one.');
}

const demoUser = process.env.IOS_REVIEW_DEMO_USERNAME || null;
const demoPass = process.env.IOS_REVIEW_DEMO_PASSWORD || null;
const demoRequired = demoUser && demoPass;

const attrs = {
  contactFirstName: existing?.attributes?.contactFirstName || APP_CONFIG.contact.firstName,
  contactLastName: existing?.attributes?.contactLastName || APP_CONFIG.contact.lastName,
  contactPhone:
    existing?.attributes?.contactPhone || process.env.IOS_REVIEW_CONTACT_PHONE || APP_CONFIG.contact.phoneE164,
  contactEmail: existing?.attributes?.contactEmail || APP_CONFIG.contact.email,
  demoAccountName: demoUser,
  demoAccountPassword: demoPass,
  demoAccountRequired: !!demoRequired,
  notes:
    process.env.IOS_REVIEW_NOTES ||
    'What changed in v1.0.4 — direct response to the v1.0.3 reject feedback on iPad Air (iPadOS 26.4.2):\n' +
      '\n' +
      '* 2.1(a) "Sign up button looped back to login page, no Sign in section":\n' +
      '  Partner accounts in this app are INVITATION-ONLY — provisioned by our team after an offline B2B partnership contract. There is no self-service sign-up; the v1.0.3 Clerk UI still exposed a sign-up affordance that looped because public sign-up is not accepted on our Clerk instance. v1.0.4 hides it in four layers: Clerk `appearance.elements` hides every footerAction*, a raw <style> + MutationObserver scrubs `.cl-signUp*` and any anchor whose text is "Sign up / 新規登録 / 登録", a hashchange listener strips `#/sign-up`, and a bilingual notice above the form explains the invitation-only policy. Sign-in section is always visible.\n' +
      '\n' +
      '* 4.8 third-party login service without an equivalent:\n' +
      '  Per Guideline 4.8 carve-out #1: "Your app exclusively uses your company\'s own account setup and sign-in systems." We use Clerk-managed email + password as our company\'s own account system (first-party). The iOS app exposes NO Facebook / Google / Twitter / LinkedIn / Amazon / WeChat login — none of the enumerated third-party services. Sign in with Apple is therefore not required for this configuration.\n' +
      '\n' +
      '* 2.1(b) Information Needed — direct answers to your five business-model questions:\n' +
      '  (1) Who uses the paid services in the app? — Nobody. The app has NO paid services. Users are partner reps under an offline contract; they view their referral activity, that is all.\n' +
      '  (2) Where can users purchase the services accessed in the app? — No services are purchased in or via the app. Client-facing services (reputation management, suggestion-pollution defense, malware removal) are sold OFF-PLATFORM via B2B contracts between our company and enterprise clients; the app does not initiate, complete, or commission those sales.\n' +
      '  (3) What previously purchased services can a user access in the app? — None. The app does not unlock or access any "previously purchased" service. It is a read-only activity dashboard.\n' +
      '  (4) What paid content / subscriptions / features are unlocked in the app without IAP? — None. No paywalls, no subscriptions, no premium tiers, no digital content unlocked anywhere. Every feature is free to every authorized partner.\n' +
      '  (5) Can users purchase physical goods or services together with digital content in your app? — No. Users cannot purchase anything (physical or digital) inside the app. The app is purely informational with respect to commerce.\n' +
      '  IAP applicability: Guideline 3.1.3(f) Free Stand-alone Apps: "Free apps acting as a stand-alone companion to a paid web based tool ... do not need to use in-app purchase, provided there is no purchasing inside the app, or calls to action for purchase outside of the app." Per 3.1.3(f), IAP is not required.\n' +
      '\n' +
      'App basics:\n' +
      `This app is a native wrapper around ${PRODUCTION_URL}.\n` +
      (demoUser
        ? 'Use the supplied demo credentials at /sign-in to access the partner dashboard. After login: ダッシュボード / 報酬履歴 / クライアント一覧 in the left sidebar.\n'
        : 'Public pages (home, services, company) are viewable without login. The dashboard requires partner account login.\n') +
      '\n' +
      'Account deletion (Guideline 5.1.1(v)): in-app deletion at /account/delete, also accessible from the avatar dropdown → "アカウント削除". Type-to-confirm pattern prevents accidental deletion. Cascades all partner-linked records.',
};

console.log('PATCH attrs:', {
  ...attrs,
  demoAccountPassword: demoPass ? '***' : null,
});

if (existing) {
  await api('PATCH', `/v1/appStoreReviewDetails/${existing.id}`, {
    data: { type: 'appStoreReviewDetails', id: existing.id, attributes: attrs },
  });
  console.log(`Patched appStoreReviewDetail ${existing.id}`);
} else {
  await api('POST', '/v1/appStoreReviewDetails', {
    data: {
      type: 'appStoreReviewDetails',
      attributes: attrs,
      relationships: {
        appStoreVersion: { data: { type: 'appStoreVersions', id: target.id } },
      },
    },
  });
  console.log(`Created appStoreReviewDetail for version ${target.id}`);
}

console.log('Done.');
