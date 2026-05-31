#!/usr/bin/env node
// Submit a build for review on App Store Connect.
// Ported from fujisan-clean — partner-app 用に default BUNDLE_ID のみ変更。
//
// Reads:
//   env APPSTORE_CONNECT_KEY_ID
//   env APPSTORE_CONNECT_ISSUER_ID
//   env APPSTORE_CONNECT_API_KEY_P8_PATH (path to .p8) OR APPSTORE_CONNECT_API_KEY_P8_BASE64
//   env APP_BUNDLE_ID (default: com.reversehack.partner)
//   env IOS_BUILD_NUMBER (CFBundleVersion to pick up; if unset, uses latest VALID build)
//   ./package.json -> version (marketing)
//   ./release-notes/CURRENT-ja.txt (whatsNew)
//
// Steps:
//   1. Find app by bundleId
//   2. Wait for the build to finish processing (max 30 min)
//   3. Find or create AppStoreVersion=<marketing>, copy metadata from latest READY_FOR_SALE
//   4. PATCH ja localization with whatsNew
//   5. Link build
//   6. Copy review detail from latest READY_FOR_SALE if missing
//   7. Create reviewSubmission, add item, PATCH submitted=true
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeAscClient, findApp, listVersions, getLocalizations, getReviewDetail, findBuildByVersion, listRecentBuilds, sleep } from './lib/asc-api.mjs';
import { loadAppConfig } from './lib/app-config.mjs';
import { uploadIPhoneScreenshots } from './lib/asc-screenshot-upload.mjs';
import { ensureFreePricing } from './lib/asc-pricing.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const APP_CONFIG = loadAppConfig();
const PRODUCTION_URL = `https://${APP_CONFIG.identity.productionDomain}`;

const BUNDLE_ID = process.env.APP_BUNDLE_ID || APP_CONFIG.identity.bundleId || 'com.reversehack.partner';
const PLATFORM = 'IOS';
const POLL_INTERVAL_MS = 30_000;
const POLL_MAX_MIN = 30;

function readMarketingVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  return String(pkg.version).trim();
}

// Apple Guideline 2.3.10: App Store メタデータに他社プラットフォーム名を含めると審査で弾かれる。
// 文字数制限と同じく「アップロード前に弾く」ことで時間とランナー秒を節約する。
const BANNED_IN_IOS_WHATS_NEW = [
  'Android',
  'Google Play',
  'Play Store',
  'Play Console',
  'Galaxy Store',
  'Amazon Appstore',
];

function assertNoBannedPlatformReferences(text) {
  const hits = BANNED_IN_IOS_WHATS_NEW.filter((w) =>
    text.toLowerCase().includes(w.toLowerCase()),
  );
  if (hits.length > 0) {
    throw new Error(
      `release-notes/CURRENT-ja.txt contains references to other platforms (${hits.join(', ')}). ` +
        `App Store rejects this under Guideline 2.3.10. ` +
        `Rephrase the notes to be platform-neutral and try again.`,
    );
  }
}

function readWhatsNew() {
  const p = path.join(REPO, 'release-notes', 'CURRENT-ja.txt');
  if (!fs.existsSync(p)) {
    throw new Error(`Missing release-notes/CURRENT-ja.txt at ${p}`);
  }
  const text = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').trim();
  assertNoBannedPlatformReferences(text);
  return text;
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

async function pollBuildProcessing(api, appId, marketing, buildNumber) {
  const maxLoops = Math.ceil((POLL_MAX_MIN * 60_000) / POLL_INTERVAL_MS);
  for (let i = 0; i < maxLoops; i++) {
    const build = buildNumber
      ? await findBuildByVersion(api, appId, marketing, buildNumber)
      : (await listRecentBuilds(api, appId, 5))[0];
    if (build) {
      console.log(`  build attempt ${i + 1}/${maxLoops}: state=${build.processingState} marketing=${build.marketingVersion} bn=${build.buildNumber}`);
      if (build.processingState === 'VALID') return build;
      if (build.processingState === 'INVALID' || build.processingState === 'FAILED') {
        throw new Error(`Build ${build.id} processing FAILED on Apple side.`);
      }
    } else {
      console.log(`  build attempt ${i + 1}/${maxLoops}: no matching build yet`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Build did not reach VALID within timeout');
}

// Apple normalizes trailing-zero version segments, so "1.0" and "1.0.0" both
// describe the same logical version. We treat them as equivalent when looking
// for an existing PREPARE_FOR_SUBMISSION version.
function normalizeVersion(v) {
  if (!v) return '';
  return String(v).replace(/(\.0)+$/, '');
}

// Fallback copyright string used when no prior live version exists and
// Apple has not auto-populated it. Apple requires copyright on the
// appStoreVersion before submit-for-review.
const DEFAULT_COPYRIGHT = process.env.IOS_COPYRIGHT || `© ${new Date().getFullYear()} BEST TRUST K.K.`;

// Backfill copyright on an existing version if Apple has it empty.
// Idempotent — does nothing when copyright is already set, so user
// edits in the ASC UI survive subsequent runs.
async function ensureVersionCopyright(api, version) {
  if (version.copyright && String(version.copyright).trim().length > 0) {
    return;
  }
  console.log(`  setting copyright on version ${version.id} -> "${DEFAULT_COPYRIGHT}"`);
  try {
    await api('PATCH', `/v1/appStoreVersions/${version.id}`, {
      data: {
        type: 'appStoreVersions',
        id: version.id,
        attributes: { copyright: DEFAULT_COPYRIGHT },
      },
    });
    version.copyright = DEFAULT_COPYRIGHT;
  } catch (e) {
    console.log(`  (copyright patch failed; continuing) ${e.message.slice(0, 200)}`);
  }
}

async function ensureVersion(api, appId, marketing) {
  const all = await listVersions(api, appId, 50);
  const targetNorm = normalizeVersion(marketing);

  const exactMatch = all.find((v) => v.platform === PLATFORM && v.versionString === marketing);
  if (exactMatch) {
    console.log(`  version ${marketing} already exists (id=${exactMatch.id} state=${exactMatch.appStoreState})`);
    await ensureVersionCopyright(api, exactMatch);
    return exactMatch;
  }

  // Apple's ASC web UI auto-creates an initial appStoreVersion when the app
  // record is created (e.g. "1.0" from the UI even if package.json says
  // "1.0.0"). Reuse it instead of trying to POST a second one, which Apple
  // rejects with 409 "You cannot create a new version of the App in the
  // current state."
  const editableStates = new Set([
    'PREPARE_FOR_SUBMISSION',
    'DEVELOPER_REJECTED',
    'METADATA_REJECTED',
    'REJECTED',
    'INVALID_BINARY',
    'WAITING_FOR_REVIEW',
  ]);
  const reusable = all.find(
    (v) =>
      v.platform === PLATFORM &&
      editableStates.has(v.appStoreState) &&
      normalizeVersion(v.versionString) === targetNorm,
  );
  if (reusable) {
    if (reusable.versionString !== marketing) {
      console.log(
        `  reusing existing version id=${reusable.id} state=${reusable.appStoreState}; ` +
          `patching versionString "${reusable.versionString}" -> "${marketing}" to match build`,
      );
      try {
        await api('PATCH', `/v1/appStoreVersions/${reusable.id}`, {
          data: {
            type: 'appStoreVersions',
            id: reusable.id,
            attributes: { versionString: marketing },
          },
        });
        reusable.versionString = marketing;
      } catch (e) {
        console.log(`  (versionString patch failed; continuing with existing ${reusable.versionString}) ${e.message.slice(0, 200)}`);
      }
    } else {
      console.log(`  reusing existing version id=${reusable.id} versionString=${reusable.versionString} state=${reusable.appStoreState}`);
    }
    await ensureVersionCopyright(api, reusable);
    return reusable;
  }

  const live = all.find((v) => v.platform === PLATFORM && v.appStoreState === 'READY_FOR_SALE');
  console.log(`  creating new appStoreVersion ${marketing} (copyright copied from ${live?.versionString || 'n/a'})`);
  try {
    const created = await api('POST', '/v1/appStoreVersions', {
      data: {
        type: 'appStoreVersions',
        attributes: {
          platform: PLATFORM,
          versionString: marketing,
          copyright: live?.copyright || DEFAULT_COPYRIGHT,
          releaseType: 'MANUAL',
        },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    });
    return {
      id: created.data.id,
      platform: PLATFORM,
      versionString: marketing,
      appStoreState: created.data.attributes.appStoreState,
      copyright: created.data.attributes.copyright,
    };
  } catch (e) {
    if (!e.message.includes('409')) throw e;
    console.log('\n  ----- 409 diagnostic -----');
    console.log(`  POST /v1/appStoreVersions returned 409. Dumping app state...`);
    try {
      const appInfos = await api('GET', `/v1/apps/${appId}/appInfos`);
      console.log(`  appInfos.data.length = ${appInfos.data?.length}`);
      for (const ai of appInfos.data || []) {
        console.log(`    appInfo id=${ai.id} state=${ai.attributes.appStoreState} platforms=${JSON.stringify(ai.attributes.platforms)} appStoreAgeRating=${ai.attributes.appStoreAgeRating}`);
      }
    } catch (sub) { console.log(`  (appInfos failed: ${sub.message.slice(0, 200)})`); }
    try {
      const versions = await api('GET', `/v1/apps/${appId}/appStoreVersions?limit=50`);
      console.log(`  appStoreVersions.data.length = ${versions.data?.length}`);
      for (const v of versions.data || []) {
        console.log(`    version id=${v.id} platform=${v.attributes.platform} versionString=${v.attributes.versionString} state=${v.attributes.appStoreState}`);
      }
    } catch (sub) { console.log(`  (versions failed: ${sub.message.slice(0, 200)})`); }
    try {
      const app = await api('GET', `/v1/apps/${appId}?fields[apps]=bundleId,name,sku,primaryLocale,contentRightsDeclaration`);
      console.log(`  app.attributes = ${JSON.stringify(app.data.attributes)}`);
    } catch (sub) { console.log(`  (app failed: ${sub.message.slice(0, 200)})`); }
    console.log('  ----- end diagnostic -----\n');
    throw e;
  }
}

// Read a fallback metadata file from store-assets/appstore. Returns
// trimmed contents or undefined if the file is missing/empty.
function readAppstoreMetaFile(name) {
  const p = path.join(REPO, 'store-assets', 'appstore', name);
  if (!fs.existsSync(p)) return undefined;
  const v = fs.readFileSync(p, 'utf8').trim();
  return v.length > 0 ? v : undefined;
}

// Fallback metadata used when no prior live version exists and Apple has
// not auto-populated the localization. Constants for non-localized URLs.
const STORE_SUPPORT_URL = APP_CONFIG.contact.supportUrl;
const STORE_MARKETING_URL = APP_CONFIG.contact.marketingUrl || PRODUCTION_URL;
const STORE_PRIVACY_URL = APP_CONFIG.contact.privacyUrl;
const STORE_DATA_DELETION_URL = APP_CONFIG.contact.dataDeletionUrl || `${PRODUCTION_URL}/account/delete-request`;
const APP_INFO_LOCALE = process.env.ASC_APP_INFO_LOCALE || 'ja';

async function ensureLocalization(api, versionId, sourceLocId, whatsNew) {
  const locs = await getLocalizations(api, versionId);
  let ja = locs.find((l) => l.attributes.locale === 'ja');
  let copy = null;
  if (sourceLocId) {
    const sourceLocs = await getLocalizations(api, sourceLocId);
    copy = sourceLocs.find((l) => l.attributes.locale === 'ja');
  }
  // whatsNew belongs to UPDATES, not initial releases. When there is no
  // prior live version to compare against, Apple rejects PATCH with
  // 409 STATE_ERROR "Attribute 'whatsNew' cannot be edited at this time".
  const includeWhatsNew = !!sourceLocId;
  const fallbackDescription = readAppstoreMetaFile('description-ja.txt');
  const fallbackKeywords = readAppstoreMetaFile('keywords-ja.txt');
  const fallbackPromotionalText = readAppstoreMetaFile('promotional-text-ja.txt');
  const attrs = {
    description:
      copy?.attributes?.description || ja?.attributes?.description || fallbackDescription,
    keywords: copy?.attributes?.keywords || ja?.attributes?.keywords || fallbackKeywords,
    marketingUrl:
      copy?.attributes?.marketingUrl || ja?.attributes?.marketingUrl || STORE_MARKETING_URL,
    supportUrl: copy?.attributes?.supportUrl || ja?.attributes?.supportUrl || STORE_SUPPORT_URL,
    promotionalText:
      copy?.attributes?.promotionalText ||
      ja?.attributes?.promotionalText ||
      fallbackPromotionalText ||
      undefined,
    ...(includeWhatsNew ? { whatsNew } : {}),
  };
  const patchWithRetry = async (id, body) => {
    try {
      return await api('PATCH', `/v1/appStoreVersionLocalizations/${id}`, body);
    } catch (e) {
      // Defensive retry: if Apple still rejects whatsNew (e.g. version
      // state changed mid-flight), strip it and try once more.
      if (e.message.includes("'whatsNew' cannot be edited")) {
        console.log(`  whatsNew not editable; retrying without it`);
        const { whatsNew: _, ...rest } = body.data.attributes;
        return await api('PATCH', `/v1/appStoreVersionLocalizations/${id}`, {
          data: { ...body.data, attributes: rest },
        });
      }
      throw e;
    }
  };
  if (ja) {
    console.log(`  patch ja localization id=${ja.id}${includeWhatsNew ? '' : ' (skip whatsNew: initial release)'}`);
    await patchWithRetry(ja.id, {
      data: { type: 'appStoreVersionLocalizations', id: ja.id, attributes: attrs },
    });
  } else {
    console.log(`  create ja localization${includeWhatsNew ? '' : ' (skip whatsNew: initial release)'}`);
    const r = await api('POST', '/v1/appStoreVersionLocalizations', {
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale: 'ja', ...attrs },
        relationships: {
          appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
        },
      },
    });
    ja = r.data;
  }
  return ja;
}

async function ensureAppInfoLocalization(api, appId) {
  console.log('  sync App Info localization (name / subtitle / privacy URLs)');
  let appInfo = null;
  try {
    const appInfos = await api('GET', `/v1/apps/${appId}/appInfos?limit=10&fields[appInfos]=appStoreState`);
    appInfo =
      (appInfos.data || []).find((ai) => ai.attributes?.appStoreState === 'PREPARE_FOR_SUBMISSION') ||
      (appInfos.data || [])[0] ||
      null;
  } catch (e) {
    console.log(`  WARN: appInfos read failed; privacy URL may need ASC UI check: ${e.message.slice(0, 240)}`);
    return;
  }
  if (!appInfo) {
    console.log('  WARN: no appInfo found; skipping app-level metadata sync.');
    return;
  }

  const subtitle =
    readAppstoreMetaFile('subtitle-ja.txt') ||
    process.env.ASC_APP_SUBTITLE_JA ||
    '紹介・報酬管理パートナーアプリ';
  const attrs = {
    locale: APP_INFO_LOCALE,
    name: APP_CONFIG.identity.displayName,
    subtitle,
    privacyPolicyUrl: STORE_PRIVACY_URL,
    privacyChoicesUrl: STORE_DATA_DELETION_URL,
  };

  let loc = null;
  try {
    const locs = await api(
      'GET',
      `/v1/appInfos/${appInfo.id}/appInfoLocalizations?fields[appInfoLocalizations]=locale,name,subtitle,privacyPolicyUrl,privacyChoicesUrl,privacyPolicyText`,
    );
    loc = (locs.data || []).find((l) => l.attributes?.locale === APP_INFO_LOCALE) || null;
  } catch (e) {
    console.log(`  WARN: appInfoLocalizations read failed; continuing: ${e.message.slice(0, 240)}`);
    return;
  }

  try {
    if (loc) {
      await api('PATCH', `/v1/appInfoLocalizations/${loc.id}`, {
        data: { type: 'appInfoLocalizations', id: loc.id, attributes: attrs },
      });
      console.log(`  appInfoLocalization patched id=${loc.id} privacy=${STORE_PRIVACY_URL}`);
    } else {
      const r = await api('POST', '/v1/appInfoLocalizations', {
        data: {
          type: 'appInfoLocalizations',
          attributes: attrs,
          relationships: {
            appInfo: { data: { type: 'appInfos', id: appInfo.id } },
          },
        },
      });
      console.log(`  appInfoLocalization created id=${r.data?.id || '(unknown)'} privacy=${STORE_PRIVACY_URL}`);
    }
  } catch (e) {
    console.log(`  WARN: appInfoLocalization write failed; ASC UI may need manual confirmation: ${e.message.slice(0, 400)}`);
  }
}

async function linkBuild(api, versionId, buildId) {
  console.log(`  link build ${buildId}`);
  await api('PATCH', `/v1/appStoreVersions/${versionId}/relationships/build`, {
    data: { type: 'builds', id: buildId },
  });
}

// Fallback reviewer-contact details used when no prior version exists.
// Apple rejects review submission when appStoreReviewDetail is missing
// or has invalid relationships, so we ALWAYS create one on initial
// releases.
// Auto-enable demoAccountRequired whenever a username is provided —
// otherwise Apple's reviewer can't access the partner dashboard
// (login-only) and METADATA_REJECTED is almost guaranteed.
const _DEMO_USER = process.env.IOS_REVIEW_DEMO_USERNAME || null;
const _DEMO_PASS = process.env.IOS_REVIEW_DEMO_PASSWORD || null;
const _DEMO_REQUIRED =
  process.env.IOS_REVIEW_DEMO_REQUIRED === 'true' || (!!_DEMO_USER && !!_DEMO_PASS);

// Identity + business-model values come from app.config.json (single source
// of truth across scripts). Env vars override per-deployment if set.
const REVIEW_CONTACT_DEFAULTS = {
  contactFirstName: process.env.IOS_REVIEW_CONTACT_FIRST_NAME || APP_CONFIG.contact.firstName,
  contactLastName: process.env.IOS_REVIEW_CONTACT_LAST_NAME || APP_CONFIG.contact.lastName,
  contactPhone: process.env.IOS_REVIEW_CONTACT_PHONE || APP_CONFIG.contact.phoneE164,
  contactEmail: process.env.IOS_REVIEW_CONTACT_EMAIL || APP_CONFIG.contact.email,
  demoAccountRequired: _DEMO_REQUIRED,
  demoAccountName: _DEMO_USER,
  demoAccountPassword: _DEMO_PASS,
  notes:
    process.env.IOS_REVIEW_NOTES ||
    'Reviewer notes for リバースハック パートナー — invitation-only B2B partner dashboard.\n' +
      '\n' +
      '2.1(a) "we were unable to access the app because there was no login page": Acknowledged from past reviews. This is a login-gated, invitation-only B2B partner dashboard. Launching the native app while signed out goes DIRECTLY to the sign-in page as the very first screen. Only the sign-in page and the legally required pages (Privacy, Terms, Contact, Account Deletion) are reachable without login. Sign in with the demo credentials in App Review Information; after login: ダッシュボード / 報酬履歴 / クライアント一覧. Accounts are invitation-only; the sign-in UI hides every sign-up affordance and a bilingual notice explains this.\n' +
      '\n' +
      '4.8: the applicable carve-out is the first one listed in Guideline 4.8 itself: "Your app exclusively uses your company\'s own account setup and sign-in systems." We use Clerk-managed email+password as our own account system (identity infrastructure, like AWS Cognito) — none of the third-party logins 4.8 enumerates (Facebook/Google/Twitter/LinkedIn/Amazon/WeChat) exist on iOS. Sign in with Apple is not required for this configuration.\n' +
      '\n' +
      '2.1(b) Information Needed — direct answers to all seven business-model questions:\n' +
      '(1) Who uses the paid services? Nobody — the app has NO paid services. Users are contracted business-partner representatives viewing their own referral activity and commission history.\n' +
      '(2) Where can users purchase the services? Nowhere in or via the app. It only shows information about client-facing services partners refer OFF-PLATFORM, sold B2B between our company and enterprise clients outside Apple\'s ecosystem.\n' +
      '(3) Previously purchased services accessible in the app? None. It is a read-only referral dashboard.\n' +
      '(4) Paid content/subscriptions/features unlocked without IAP? None. No paywalls, subscriptions, premium tiers, or digital content; every feature is free to every authorized partner.\n' +
      '(5) Are the enterprise services sold to single users, consumers, or for family use? Neither — sold B2B to enterprise/corporate clients under offline contracts. Users are business partners, not consumers or families.\n' +
      '(6) How do users obtain an account? Do they pay a fee? Invitation-only, provisioned by us after an offline B2B contract. NO fee, no self-service sign-up. Reviewers use the supplied demo credentials.\n' +
      '(7) Do individual customers pay for the content or services? No. Nothing is paid inside the app; the underlying services are paid by enterprise clients off-platform. The app is a free companion.\n' +
      'IAP: Guideline 3.1.3(f): "Free apps acting as a stand-alone companion to a paid web based tool ... do not need to use in-app purchase, provided there is no purchasing inside the app, or calls to action for purchase outside of the app." That is exactly this app; per 3.1.3(f), IAP is not required.\n' +
      '\n' +
      `App: native wrapper around ${PRODUCTION_URL}. ` +
      (_DEMO_USER
        ? 'Use the supplied demo credentials; after login: ダッシュボード / 報酬履歴 / クライアント一覧.\n'
        : 'Login-gated and invitation-only; use the demo credentials in App Review Information.\n') +
      'Account deletion (5.1.1(v)): avatar dropdown -> "アカウント削除" -> confirm, or visit /account/delete. Deletion cascades all partner records and revokes the Clerk session.',
};

async function ensureReviewDetail(api, versionId, sourceVersionId) {
  let target = await getReviewDetail(api, versionId);
  let source = null;
  if (sourceVersionId) source = await getReviewDetail(api, sourceVersionId);
  // Build attributes: prefer existing-target values, then source values,
  // then env-supplied defaults. This way subsequent runs do not clobber
  // user edits made in the ASC web UI.
  const pick = (key) =>
    target?.attributes?.[key] ??
    source?.attributes?.[key] ??
    REVIEW_CONTACT_DEFAULTS[key];
  const attrs = {
    contactFirstName: pick('contactFirstName'),
    contactLastName: pick('contactLastName'),
    contactPhone: pick('contactPhone'),
    contactEmail: pick('contactEmail'),
    // demoAccountName/Password MUST follow the same env-first rule as
    // `notes` below. The previous `pick()`-only path preferred the
    // existing value on the version row, so once a stale or non-email
    // string was stored (e.g. "apple-reviewer" without the
    // "@best-trust.biz" suffix), every subsequent resubmit kept it.
    // v1.0.6 hit exactly this trap: secrets held the full email,
    // Clerk's verify_password gate passed, but App Store Connect showed
    // Apple's reviewer just "apple-reviewer" — not a valid email at
    // our Clerk sign-in form, so the iPad reviewer reported "we are
    // unable to access" and v1.0.6 was REJECTED.
    // See _docs/apple-reject-v1-0-6.md for the full diagnosis.
    demoAccountName: _DEMO_USER || pick('demoAccountName') || undefined,
    demoAccountPassword: _DEMO_PASS || pick('demoAccountPassword') || undefined,
    demoAccountRequired:
      typeof (target?.attributes?.demoAccountRequired ?? source?.attributes?.demoAccountRequired) ===
      'boolean'
        ? (target?.attributes?.demoAccountRequired ?? source?.attributes?.demoAccountRequired)
        : REVIEW_CONTACT_DEFAULTS.demoAccountRequired,
    // notes MUST reflect the CURRENT build. pick() prefers the existing
    // value on the version row, so on every resubmit the PREVIOUS reject's
    // narrative (and an outdated question set) was carried forward and the
    // 2.1(b) "Information Needed" hold never cleared — this is exactly why
    // v1.0.4 kept getting "the issues we previously identified still need
    // your attention". Always push freshly-built notes. The
    // IOS_REVIEW_NOTES env var still overrides (it is baked into
    // REVIEW_CONTACT_DEFAULTS.notes), so the ops escape hatch is intact.
    notes: REVIEW_CONTACT_DEFAULTS.notes,
  };
  // Apple hard-limits review notes to 4000 chars. Exceeding it returns a
  // 409 ENTITY_ERROR.ATTRIBUTE.INVALID.TOO_LONG that aborts the ENTIRE
  // submit (it did, on the first v1.0.5 attempt — build + upload + the
  // reviewer-cred gate all passed, then the submit died here). Clamp as a
  // permanent last-resort safety net so a future notes edit can never
  // again fail the release on length. The current notes are ~3.3k by
  // design; this should never fire.
  if (typeof attrs.notes === 'string' && attrs.notes.length > 4000) {
    console.warn(
      `  WARN: review notes ${attrs.notes.length} chars exceeds Apple's 4000 limit; truncating to fit.`,
    );
    attrs.notes = attrs.notes.slice(0, 3988) + '\n[truncated]';
  }
  if (target) {
    console.log(`  patch review detail id=${target.id}`);
    await api('PATCH', `/v1/appStoreReviewDetails/${target.id}`, {
      data: { type: 'appStoreReviewDetails', id: target.id, attributes: attrs },
    });
  } else {
    console.log(`  create review detail (defaults; ${sourceVersionId ? `copy from ${sourceVersionId}` : 'no prior version'})`);
    await api('POST', '/v1/appStoreReviewDetails', {
      data: {
        type: 'appStoreReviewDetails',
        attributes: attrs,
        relationships: {
          appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
        },
      },
    });
  }
}

async function cancelOpenReviewSubmissions(api, appId) {
  const r = await api(
    'GET',
    `/v1/reviewSubmissions?filter[app]=${appId}&filter[platform]=${PLATFORM}&filter[state]=READY_FOR_REVIEW,WAITING_FOR_REVIEW,UNRESOLVED_ISSUES`,
  );
  for (const sub of r.data || []) {
    try {
      console.log(`  cancel reviewSubmission id=${sub.id} state=${sub.attributes.state}`);
      await api('PATCH', `/v1/reviewSubmissions/${sub.id}`, {
        data: { type: 'reviewSubmissions', id: sub.id, attributes: { canceled: true } },
      });
    } catch (e) {
      try {
        await api('PATCH', `/v1/reviewSubmissions/${sub.id}`, {
          data: {
            type: 'reviewSubmissions',
            id: sub.id,
            attributes: { cancellationRequested: true },
          },
        });
      } catch (e2) {
        console.log(`  (cancel reviewSubmission failed; ignoring) ${e2.message.slice(0, 200)}`);
      }
    }
  }
}

async function repurposeBlockingVersion(api, appId, version, marketing) {
  await cancelOpenReviewSubmissions(api, appId);
  if (version.versionString === marketing) {
    console.log(`  rejected version is already at ${marketing} — reusing in place.`);
    return { ...version };
  }
  console.log(`  PATCH appStoreVersion id=${version.id}: versionString ${version.versionString} -> ${marketing}`);
  try {
    await api('PATCH', `/v1/appStoreVersions/${version.id}`, {
      data: {
        type: 'appStoreVersions',
        id: version.id,
        attributes: { versionString: marketing },
      },
    });
    console.log(`  ✓ repurposed rejected slot as ${marketing}`);
  } catch (e) {
    throw new Error(
      `Could not rename rejected version ${version.versionString} -> ${marketing}: ${e.message}\n` +
        `Please resolve it manually in App Store Connect and re-run.`,
    );
  }
  return { ...version, versionString: marketing };
}

// Apple's API ties a reviewSubmissionItem to the appStoreVersion it was first
// submitted with. When that submission ends in a final state (REJECTED /
// COMPLETE / CANCELED / etc.), the version stays "attached" to it — so a
// subsequent POST /v1/reviewSubmissionItems for the same version against a
// NEW submission returns 409 ITEM_PART_OF_ANOTHER_SUBMISSION. The fix is to
// delete the stale item from the prior submission first.
// Reproduced in run 25897530001 (1.0.2 attempt) against submission
// b5db02aa-b486-4e81-80d2-cea82e9763bd.
const PRUNABLE_SUBMISSION_STATES = new Set([
  'COMPLETE',
  'CANCELED',
  'CANCELLING',
  'ACCEPTED',
  'REJECTED',
  'DEVELOPER_REJECTED',
]);

async function freeVersionFromStaleSubmission(api, versionId, otherRsId) {
  let otherState = '(unknown)';
  try {
    const other = await api('GET', `/v1/reviewSubmissions/${otherRsId}`);
    otherState = other.data?.attributes?.state || '(missing)';
  } catch (e) {
    console.log(`  (could not GET reviewSubmission ${otherRsId}: ${e.message.slice(0, 160)})`);
  }
  console.log(`  conflicting reviewSubmission ${otherRsId} state=${otherState}`);
  if (!PRUNABLE_SUBMISSION_STATES.has(otherState)) {
    throw new Error(
      `Version ${versionId} is still attached to reviewSubmission ${otherRsId} ` +
        `which is in state=${otherState} (not in a prunable state). ` +
        `Cancel or resolve that submission in App Store Connect and re-run.`,
    );
  }
  const items = await api('GET', `/v1/reviewSubmissions/${otherRsId}/items`);
  const target = (items.data || []).find(
    (it) => it.relationships?.appStoreVersion?.data?.id === versionId,
  );
  if (!target) {
    console.log(
      `  (no reviewSubmissionItem for version ${versionId} in ${otherRsId}; the API claim and the item list disagree — proceeding with retry anyway)`,
    );
    return;
  }
  console.log(`  DELETE reviewSubmissionItem ${target.id} (free version from ${otherRsId})`);
  await api('DELETE', `/v1/reviewSubmissionItems/${target.id}`);
}

async function submitForReview(api, appId, versionId) {
  console.log(`  fetch existing review submissions...`);
  const existing = await api(
    'GET',
    `/v1/reviewSubmissions?filter[app]=${appId}&filter[platform]=${PLATFORM}&filter[state]=READY_FOR_REVIEW,WAITING_FOR_REVIEW,IN_REVIEW,UNRESOLVED_ISSUES`,
  );
  let rsId;
  const inFlight = (existing.data || [])[0];
  if (inFlight) {
    rsId = inFlight.id;
    console.log(`  reuse reviewSubmission id=${rsId} state=${inFlight.attributes.state}`);
    if (['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(inFlight.attributes.state)) {
      console.log(`  already submitted, nothing to do`);
      return;
    }
  } else {
    const created = await api('POST', '/v1/reviewSubmissions', {
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: PLATFORM },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    });
    rsId = created.data.id;
    console.log(`  created reviewSubmission id=${rsId} state=${created.data.attributes.state}`);
  }
  const items = await api('GET', `/v1/reviewSubmissions/${rsId}/items`);
  const hasVersion = (items.data || []).some(
    (it) => it.relationships?.appStoreVersion?.data?.id === versionId,
  );
  if (!hasVersion) {
    console.log(`  add reviewSubmissionItem (versionId=${versionId})`);
    const itemBody = {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: rsId } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
        },
      },
    };
    try {
      await api('POST', '/v1/reviewSubmissionItems', itemBody);
    } catch (e) {
      const detail = String(e.message);
      const m = detail.match(/already added to another reviewSubmission with id ([0-9a-fA-F-]+)/);
      if (!m) throw e;
      const otherRsId = m[1];
      console.log(`  ITEM_PART_OF_ANOTHER_SUBMISSION → attempt to free version from ${otherRsId}`);
      await freeVersionFromStaleSubmission(api, versionId, otherRsId);
      console.log(`  retry POST reviewSubmissionItems`);
      await api('POST', '/v1/reviewSubmissionItems', itemBody);
    }
  }
  console.log(`  PATCH submitted=true`);
  await api('PATCH', `/v1/reviewSubmissions/${rsId}`, {
    data: { type: 'reviewSubmissions', id: rsId, attributes: { submitted: true } },
  });
  const final = await api('GET', `/v1/reviewSubmissions/${rsId}`);
  console.log(`  final state=${final.data.attributes.state} submittedDate=${final.data.attributes.submittedDate || ''}`);
}

(async () => {
  const keyId = process.env.APPSTORE_CONNECT_KEY_ID;
  const issuerId = process.env.APPSTORE_CONNECT_ISSUER_ID;
  if (!keyId || !issuerId) throw new Error('Set APPSTORE_CONNECT_KEY_ID and APPSTORE_CONNECT_ISSUER_ID');
  const privateKey = resolvePrivateKey();

  const marketing = readMarketingVersion();
  const buildNumber = process.env.IOS_BUILD_NUMBER ? String(process.env.IOS_BUILD_NUMBER).trim() : null;
  const whatsNew = readWhatsNew();

  console.log(`bundleId=${BUNDLE_ID} marketing=${marketing} build=${buildNumber || '(latest)'}`);
  console.log(`whatsNew (${whatsNew.length} chars):\n  ${whatsNew.slice(0, 120).replace(/\n/g, ' / ')}...`);

  const api = makeAscClient({ keyId, issuerId, privateKey });

  console.log('\n[1] Find app...');
  const app = await findApp(api, BUNDLE_ID);
  if (!app) throw new Error(`App not found for bundleId=${BUNDLE_ID}`);
  console.log(`  appId=${app.id} name="${app.attributes.name}"`);

  console.log('\n[1b] Sync App Info localization...');
  await ensureAppInfoLocalization(api, app.id);

  console.log('\n[2] Pre-check existing version state...');
  let versions = await listVersions(api, app.id, 50);
  const liveVersion = versions.find((v) => v.platform === PLATFORM && v.appStoreState === 'READY_FOR_SALE');
  const existingSameVersion = versions.find((v) => v.platform === PLATFORM && v.versionString === marketing);
  const SHIPPED_STATES = new Set([
    'READY_FOR_SALE',
    'PREORDER_READY_FOR_SALE',
    'REPLACED_WITH_NEW_VERSION',
  ]);
  if (existingSameVersion && SHIPPED_STATES.has(existingSameVersion.appStoreState)) {
    console.log(
      `  version ${marketing} is already ${existingSameVersion.appStoreState}.\n  Nothing to do.`,
    );
    console.log(`  -> Bump the version first for a new release.`);
    return;
  }

  // States in which the developer can still edit / repurpose the version.
  // PREPARE_FOR_SUBMISSION is included because Apple's API rejects POST
  // /v1/appStoreVersions with 409 ENTITY_ERROR.RELATIONSHIP.INVALID when
  // *any* prior version is still in PREPARE_FOR_SUBMISSION — even one with
  // a different versionString. So when bumping (e.g. 1.0.2 → 1.0.3) and the
  // old 1.0.2 was created in ASC but never advanced past PREPARE_FOR_SUBMISSION,
  // we must rename it in place rather than try to POST a sibling.
  const DEVELOPER_TURN_STATES = new Set([
    'REJECTED',
    'METADATA_REJECTED',
    'DEVELOPER_REJECTED',
    'INVALID_BINARY',
    'PREPARE_FOR_SUBMISSION',
  ]);
  const APPLE_TURN_STATES = new Set([
    'WAITING_FOR_REVIEW',
    'IN_REVIEW',
    'PENDING_DEVELOPER_RELEASE',
    'PENDING_APPLE_RELEASE',
    'PROCESSING_FOR_APP_STORE',
  ]);

  // Apple-turn states broken down by what we can safely supersede:
  //   - WAITING_FOR_REVIEW: queued but Apple has NOT started reviewing yet —
  //     safe to cancel and supersede. The "we need additional info" hold
  //     puts the version here, so a new build push is the developer's clear
  //     intent to replace.
  //   - IN_REVIEW: reviewer is actively looking right now. Cancelling
  //     wastes their time and risks an unhappy reviewer. Skip with a clear
  //     log so the developer knows to wait or cancel manually.
  //   - PENDING_*_RELEASE / PROCESSING_FOR_APP_STORE: post-approval states.
  //     Cancelling would abandon an approved build. Never do this
  //     automatically.
  const SUPERSEDABLE_APPLE_STATES = new Set(['WAITING_FOR_REVIEW']);
  const ACTIVELY_IN_REVIEW_STATES = new Set([
    'IN_REVIEW',
    'PENDING_DEVELOPER_RELEASE',
    'PENDING_APPLE_RELEASE',
    'PROCESSING_FOR_APP_STORE',
  ]);

  // Semver-only guard so we never accidentally cancel a NEWER version
  // because the local package.json was downgraded.
  const cmpSemver = (a, b) => {
    const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d !== 0) return d;
    }
    return 0;
  };

  const otherBlocking = versions.filter(
    (v) =>
      v.platform === PLATFORM &&
      v.versionString !== marketing &&
      (DEVELOPER_TURN_STATES.has(v.appStoreState) || APPLE_TURN_STATES.has(v.appStoreState)),
  );
  let didRepurpose = false;
  for (const other of otherBlocking) {
    if (ACTIVELY_IN_REVIEW_STATES.has(other.appStoreState)) {
      console.log(
        `  another version ${other.versionString} is currently ${other.appStoreState} (Apple actively in review / pending release).\n  ` +
          `Skipping iOS submission for now (CI exits clean; web / Android unaffected).\n  ` +
          `If you intend to supersede this version, cancel it manually in App Store Connect and re-run.`,
      );
      return;
    }
    if (SUPERSEDABLE_APPLE_STATES.has(other.appStoreState)) {
      if (cmpSemver(marketing, other.versionString) <= 0) {
        console.log(
          `  another version ${other.versionString} is ${other.appStoreState} but local package.json marketing ${marketing} is NOT higher (semver).\n  ` +
            `Refusing to supersede — bump package.json first.`,
        );
        return;
      }
      console.log(
        `  another version ${other.versionString} is ${other.appStoreState} (Apple's queue, not yet under review).\n  ` +
          `New build ${marketing} pushed → cancelling old submission + repurposing version row.`,
      );
      await repurposeBlockingVersion(api, app.id, other, marketing);
      didRepurpose = true;
      continue;
    }
    console.log(
      `  another version ${other.versionString} is ${other.appStoreState} (developer's turn).\n  ` +
        `Re-purposing as ${marketing}...`,
    );
    await repurposeBlockingVersion(api, app.id, other, marketing);
    didRepurpose = true;
  }

  if (existingSameVersion && DEVELOPER_TURN_STATES.has(existingSameVersion.appStoreState)) {
    console.log(
      `  version ${marketing} itself is ${existingSameVersion.appStoreState} (developer's turn).\n  ` +
        `Cancelling any open review submission...`,
    );
    await cancelOpenReviewSubmissions(api, app.id);
    didRepurpose = true;
  }
  if (existingSameVersion && APPLE_TURN_STATES.has(existingSameVersion.appStoreState)) {
    console.log(
      `  version ${marketing} is already ${existingSameVersion.appStoreState} (Apple's turn).\n  Nothing to do.`,
    );
    return;
  }

  let liveVersionAfter = liveVersion;
  if (didRepurpose) {
    versions = await listVersions(api, app.id, 50);
    liveVersionAfter = versions.find((v) => v.platform === PLATFORM && v.appStoreState === 'READY_FOR_SALE') || null;
  }

  console.log('\n[3] Wait for build to be VALID...');
  const build = await pollBuildProcessing(api, app.id, marketing, buildNumber);
  console.log(`  build OK: id=${build.id} ${build.marketingVersion} (${build.buildNumber})`);

  console.log('\n[4] Ensure version exists...');
  const version = await ensureVersion(api, app.id, marketing);
  console.log(`  versionId=${version.id} state=${version.appStoreState}`);

  console.log('\n[5] Set ja localization with whatsNew...');
  const jaLoc = await ensureLocalization(api, version.id, liveVersionAfter?.id || null, whatsNew);

  console.log('\n[5b] Upload iPhone screenshots (6.7" + 6.5")...');
  const screenshotsDir = process.env.IOS_SCREENSHOTS_DIR || path.join(REPO, 'ios-screenshots');
  try {
    const r = await uploadIPhoneScreenshots(api, jaLoc.id, screenshotsDir);
    console.log(`  screenshots: uploaded=${r.uploaded} deleted=${r.deleted ?? 0} skipped=${r.skipped}`);
  } catch (e) {
    console.log(`  WARN: screenshot upload failed (continuing): ${e.message.slice(0, 400)}`);
  }

  console.log('\n[6] Link build...');
  await linkBuild(api, version.id, build.id);

  console.log('\n[7] Ensure review detail...');
  await ensureReviewDetail(api, version.id, liveVersionAfter?.id || null);

  console.log('\n[7b] Ensure free-tier pricing...');
  try {
    await ensureFreePricing(api, app.id);
  } catch (e) {
    console.log(`  WARN: pricing setup failed (continuing): ${e.message.slice(0, 400)}`);
  }

  console.log('\n[8] Submit for review...');
  await submitForReview(api, app.id, version.id);

  console.log('\nDONE.');
})().catch((e) => {
  console.error(`\nFATAL: ${e.message}`);
  process.exit(1);
});
