import { loadServiceAccount, makePlayClient } from './lib/play-api.mjs';
const sa = loadServiceAccount();
const api = makePlayClient(sa, 'com.kimito.link.yukkuriexosome');
const edit = await api('POST', '/edits', {});
const details = await api('GET', `/edits/${edit.id}/details`);
console.log(JSON.stringify(details, null, 2));
await api('DELETE', `/edits/${edit.id}`);
