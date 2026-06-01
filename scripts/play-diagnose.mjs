#!/usr/bin/env node
// Diagnose Play Console SA permission for this app.
// Run: node scripts/play-diagnose.mjs
//
// If you get 403: open Play Console > ユーザーと権限 > SA email
// > アプリの権限タブ > ゆっくりエクソソーム にチェックを入れて保存
import { loadServiceAccount, makePlayClient } from './lib/play-api.mjs';
import { loadAppConfig } from './lib/app-config.mjs';

const cfg = loadAppConfig();
const PACKAGE = process.env.PLAY_PACKAGE_NAME || cfg.identity.packageName || 'com.kimito.link.yukkuriexosome';

const sa = loadServiceAccount();
console.log(`SA email : ${sa.client_email}`);
console.log(`Package  : ${PACKAGE}`);
console.log('');

const api = makePlayClient(sa, PACKAGE);

try {
  const edit = await api('POST', '/edits', {});
  console.log(`OK: edit opened (id=${edit.id})`);
  await api('DELETE', `/edits/${edit.id}`);
  console.log('SA has Publisher permission for this app.');
} catch (e) {
  if (e.message.includes('403')) {
    console.error('403 PERMISSION_DENIED — SA does not have access to this app.');
    console.error('');
    console.error('Fix in Play Console:');
    console.error('  1. play.google.com/console → 「ユーザーと権限」');
    console.error(`  2. "${sa.client_email}" を選択`);
    console.error('  3. 「アプリの権限」タブ → 「ゆっくりエクソソーム」にチェック → 保存');
    console.error('  4. 変更が反映されるまで数分かかることがある');
    console.error('');
    console.error('または: アカウント全体の「リリースマネージャー」権限を付与すれば全アプリにアクセス可能。');
  } else {
    console.error('Unexpected error:', e.message.slice(0, 400));
  }
  process.exit(1);
}
