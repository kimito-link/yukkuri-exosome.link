import { loadServiceAccount, makePlayClient } from './lib/play-api.mjs';
const sa = loadServiceAccount();
const api = makePlayClient(sa, 'com.kimito.link.yukkuriexosome');
const edit = await api('POST', '/edits', {});
console.log('edit:', edit.id);
await api('PUT', `/edits/${edit.id}/listings/ja-JP`, {
  language: 'ja-JP',
  title: 'ゆっくりエクソソーム',
  shortDescription: 'テスト',
  fullDescription: 'テスト詳細'
});
console.log('listing OK');
const c = await api('POST', `/edits/${edit.id}:commit`, {});
console.log('commit OK:', c.id);
