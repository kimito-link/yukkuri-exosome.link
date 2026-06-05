import { loadServiceAccount, makePlayClient } from './lib/play-api.mjs';
const sa = loadServiceAccount();
const api = makePlayClient(sa, 'com.kimito.link.yukkuriexosome');
const edit = await api('POST', '/edits', {});
console.log('edit opened:', edit.id);
try {
  const v = await api('POST', `/edits/${edit.id}:validate`, {});
  console.log('validate OK:', v.id);
} catch(e) { console.log('validate ERROR:', e.message.slice(0, 300)); }
try {
  const c = await api('POST', `/edits/${edit.id}:commit`, {});
  console.log('commit OK:', c.id);
} catch(e) { console.log('commit ERROR:', e.message.slice(0, 300)); }
