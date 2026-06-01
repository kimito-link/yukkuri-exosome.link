/**
 * Google Play アプリのコンテンツ申告を自動設定
 * - 広告ID申告（使用しない）
 * - 広告申告（含まない）
 * - ターゲットユーザー（18歳以上）
 * - データセーフティ（収集なし）
 */
import { loadServiceAccount, makePlayClient } from './lib/play-api.mjs';

const PACKAGE = 'com.kimito.link.yukkuriexosome';

const sa  = loadServiceAccount();
const api = makePlayClient(sa, PACKAGE);

// ── 1. 広告ID申告（Advertising ID）──────────────────────
console.log('[1] Setting Advertising ID declaration (not using ad ID)...');
try {
  await api('PUT',
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/adIdDeclaration`,
    { advertisingIdDeclaration: 'NOT_USING_ADVERTISING_ID' }
  );
  console.log('  adIdDeclaration OK');
} catch (e) {
  console.log('  WARN:', e.message.slice(0, 200));
}

// ── 2. 広告申告（Ads）────────────────────────────────────
console.log('[2] Setting Ads declaration (no ads)...');
try {
  await api('PUT',
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/adsDeclaration`,
    { hasAds: false }
  );
  console.log('  adsDeclaration OK');
} catch (e) {
  console.log('  WARN:', e.message.slice(0, 200));
}

// ── 3. ターゲットユーザー & データセーフティはedit経由 ───
console.log('[3] Opening edit for targetAudience + dataSafety...');
const edit   = await api('POST', '/edits', {});
const editId = edit.id;
console.log(`  editId=${editId}`);

// ターゲットユーザー（18歳以上）
console.log('[4] Setting target audience (18+)...');
try {
  await api('PUT', `/edits/${editId}/targetAudience`, {
    targetAgeGroups: ['TWENTY_AND_ABOVE'],
  });
  console.log('  targetAudience OK');
} catch (e) {
  console.log('  WARN targetAudience:', e.message.slice(0, 200));
}

// データセーフティ（収集なし）
console.log('[5] Setting data safety (no data collected)...');
try {
  await api('PUT', `/edits/${editId}/dataSafety`, {
    dataCollection: false,
    dataSharing: false,
    securityPractices: {
      dataEncryptedInTransit: true,
      userRequestDeleteData: false,
    },
  });
  console.log('  dataSafety OK');
} catch (e) {
  console.log('  WARN dataSafety:', e.message.slice(0, 200));
}

// commit
console.log('[6] Committing edit...');
try {
  const committed = await api('POST', `/edits/${editId}:commit`, {});
  console.log(`  committed. id=${committed.id}`);
} catch (e) {
  console.log('  WARN commit:', e.message.slice(0, 200));
}

console.log('\nDONE.');
