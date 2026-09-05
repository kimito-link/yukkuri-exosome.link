#!/usr/bin/env node
/**
 * Play が実際に配布する APK の署名を取得し、公開中の assetlinks.json と
 * 一致するかを判定する。★TWA のアドレスバーが出るかどうかの唯一の機械的判定。
 *
 * ★なぜ要るか（2026-09-05 に実際に踏んだ罠）:
 *   Google の Digital Asset Links API
 *   （digitalassetlinks.googleapis.com/v1/statements:list）は
 *   「statement ファイルが読めて構文が正しいか」しか見ない。
 *   ★配布される APK がどの鍵で署名されているかは見ていない。
 *   Play App Signing で Google が再署名していると、DAL API は
 *   errorCode なしで通るのに実機では検証に失敗し、アドレスバーが出る。
 *
 *   ローカルの AAB を keytool/apksigner で調べても駄目。それは
 *   「アップロード鍵」であって、利用者に届く署名ではない。
 *
 *   bubblewrap の validate / doctor もこれは見ない
 *   （validate は PWA 品質、doctor は JDK/SDK のパス確認）。
 *
 * 使う API:
 *   GET /applications/{pkg}/generatedApks/{versionCode}
 *   → generatedApks[].certificateSha256Hash が【配布される】署名。
 *
 * 使い方:
 *   GOOGLE_PLAY_SA_JSON_PATH=.secrets/google-play-sa.json \
 *   node scripts/play-check-signing.mjs [versionCode]
 *
 * 終了コード: 0=一致 / 1=不一致（アドレスバーが出る）/ 2=判定できなかった
 *   ★2 を 0 に混ぜないこと。「測れなかった」と「異常なし」は別。
 *
 * ★正本はキット側:
 *   web-ios-android/templates/scripts/verify-twa-signing-matches-assetlinks.mjs
 *   （instrument-core の3値規約に準拠し selftest を持つ版。他プロジェクトはそちらを使う）
 *   こちらは既存の scripts/lib/play-api.mjs をそのまま使う Exosome 向けの実装。
 *   ★判定の中身（generatedApks[].certificateSha256Hash と assetlinks の照合）は同じ。
 *   ずれたらキット側に合わせること。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadServiceAccount, makePlayClient } from './lib/play-api.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const APP_CONFIG = JSON.parse(fs.readFileSync(path.join(REPO, 'app.config.json'), 'utf8'));

const PACKAGE = process.env.PLAY_PACKAGE_NAME || APP_CONFIG.stores?.playPackageName;
const DOMAIN = process.env.ASSETLINKS_DOMAIN || APP_CONFIG.identity?.productionDomain;

const norm = (fp) => String(fp || '').toUpperCase().replace(/\s/g, '');

async function fetchAssetlinks(domain) {
  const url = `https://${domain}/.well-known/assetlinks.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const json = await res.json();
  const out = [];
  for (const entry of json) {
    const t = entry?.target || {};
    if (t.namespace !== 'android_app') continue;
    if (t.package_name !== PACKAGE) continue;
    for (const f of t.sha256_cert_fingerprints || []) out.push(norm(f));
  }
  return out;
}

/** 指定が無ければ、全トラックの中で最大の versionCode を見る。 */
async function resolveVersionCode(api, explicit) {
  if (explicit) return String(explicit);
  const edit = await api('POST', '/edits');
  const editId = edit.id;
  try {
    const tracks = await api('GET', `/edits/${editId}/tracks`);
    const codes = [];
    for (const t of tracks.tracks || []) {
      for (const r of t.releases || []) {
        for (const c of r.versionCodes || []) codes.push(Number(c));
      }
    }
    if (!codes.length) throw new Error('どのトラックにも versionCode が無い');
    return String(Math.max(...codes));
  } finally {
    await api('DELETE', `/edits/${editId}`).catch(() => {});
  }
}

async function main() {
  if (!PACKAGE) throw new Error('playPackageName が解決できない');
  if (!DOMAIN) throw new Error('productionDomain が解決できない');

  const sa = loadServiceAccount();
  const api = makePlayClient(sa, PACKAGE);

  const versionCode = await resolveVersionCode(api, process.argv[2]);
  const res = await api('GET', `/generatedApks/${versionCode}`);

  const delivered = [...new Set(
    (res?.generatedApks || [])
      .map((g) => g.certificateSha256Hash)
      .filter(Boolean)
      .map(norm)
  )];

  const declared = await fetchAssetlinks(DOMAIN);

  console.log(`package     : ${PACKAGE}`);
  console.log(`versionCode : ${versionCode}`);
  console.log(`domain      : ${DOMAIN}`);
  console.log('');
  console.log('assetlinks.json に登録されている署名:');
  declared.forEach((f) => console.log(`  ${f}`));
  console.log('');
  console.log('Play が実際に配布する署名:');
  delivered.forEach((f) => console.log(`  ${f}`));
  console.log('');

  if (!delivered.length) {
    console.error('★判定不能: generatedApks から署名が取れなかった。');
    console.error('  （その versionCode が Play にアップロードされていない可能性）');
    process.exit(2);
  }

  const missing = delivered.filter((f) => !declared.includes(f));
  if (missing.length) {
    console.error('🔴 不一致。このまま出すと実機で TWA のアドレスバーが出る。');
    console.error('   assetlinks.json の sha256_cert_fingerprints に以下を追加すること:');
    missing.forEach((f) => console.error(`     ${f}`));
    process.exit(1);
  }

  console.log('✅ 一致。配布される署名は assetlinks.json に含まれている。');
}

main().catch((e) => {
  console.error('エラー:', e?.message || e);
  process.exit(2);
});
