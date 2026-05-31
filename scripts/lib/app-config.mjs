// Loads app.config.json once and exposes typed-ish accessors.
// Single source of truth for per-app identity used by spawn-new-app,
// asc / play submission scripts, secret bootstrap, etc.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG_PATH = path.join(ROOT, 'app.config.json');

let _cache = null;

/**
 * @typedef {{
 *   identity: {
 *     displayName: string,
 *     displayNameEn: string,
 *     shortName: string,
 *     bundleId: string,
 *     iosScheme: string,
 *     appleSiwaServiceId: string | null,
 *     productionDomain: string,
 *     stagingDomain: string | null,
 *   },
 *   stores: {
 *     ascAppId: string | null,
 *     playAppId: string | null,
 *     playPackageName: string,
 *     appleTeamId: string | null,
 *     playDeveloperId: string | null,
 *     primaryCategory: string,
 *     ageRating: string,
 *     contentRights: string,
 *     marketingVersion: string,
 *     buildNumberOffset: number,
 *   },
 *   brand: {
 *     primaryColor: string,
 *     accentColor: string,
 *     iconSource: string,
 *     featureGraphicSource: string | null,
 *     logoTypeWeb: string,
 *   },
 *   contact: {
 *     email: string,
 *     phoneE164: string,
 *     firstName: string,
 *     lastName: string,
 *     supportUrl: string,
 *     privacyUrl: string,
 *     termsUrl: string | null,
 *     marketingUrl: string,
 *   },
 *   auth: {
 *     provider: 'clerk' | 'supabase' | 'custom',
 *     thirdPartyProvidersOnWeb: string[],
 *     thirdPartyProvidersOnIos: string[],
 *     thirdPartyProvidersOnAndroid: string[],
 *     siwaEnabled: boolean,
 *     demoAccountUsernameSecret: string,
 *     demoAccountPasswordSecret: string,
 *   },
 *   businessModel: {
 *     kind: string,
 *     hasInAppPurchase: boolean,
 *     hasSubscription: boolean,
 *     hasPaidContent: boolean,
 *     summaryEn: string,
 *     summaryJa: string,
 *   },
 *   ownership: {
 *     organization: string,
 *     country: string,
 *     githubOrg: string,
 *     githubRepo: string,
 *     vercelTeamSlug: string | null,
 *     vercelProjectName: string | null,
 *   },
 * }} AppConfig
 */

/** @returns {AppConfig} */
export function loadAppConfig() {
  if (_cache) return _cache;
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `app.config.json not found at ${CONFIG_PATH}. ` +
        'Run scripts/spawn-new-app.mjs to scaffold one for a new app.',
    );
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  _cache = parsed;
  return parsed;
}

/** Returns the project root that contains app.config.json. */
export function getProjectRoot() {
  return ROOT;
}

/** @internal Reset cache (test-only). */
export function _resetAppConfigCache() {
  _cache = null;
}
