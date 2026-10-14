// 旧ドメイン（yukkuri-exosome.link）から新ドメイン（exosome.kimito.link）への
// 恒久リダイレクトの契約テスト。Node組み込みの node:test を使う（依存ゼロ）。
//
// ★なぜ要るか（実損・2026-10-14）:
//   kimito.link の LP には「✨ kimito.link でXログイン済みなら、追加の登録なしで」
//   と書いてあるのに、リンク先が旧ドメイン（apex）だった。
//   ログインの共有は Clerk の `__client` cookie が **`.kimito.link` で共有される**
//   ことで成り立っているので、**別ドメインには cookie が届かない**＝宣言が嘘になる。
//   `_docs/parity/FACTS-exosome.md` に
//   「旧ドメインから入った利用者はログインできない見込み」と記録されていた。
//
// ★このテストが守るもの:
//   1. 旧ドメイン（apex と www）が**新ドメインへ飛ぶ**こと
//   2. ★**無限ループにならない**こと（新ドメイン自身を飛ばさない）
//   3. パスを**捨てない**こと（/foo で入った人が /foo に着く）
//   4. 恒久（301）であること（検索エンジンに移転を伝える）

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, '..', 'vercel.json'), 'utf8'));

const NEW_HOST = 'exosome.kimito.link';
const OLD_HOSTS = ['yukkuri-exosome.link', 'www.yukkuri-exosome.link'];

/** host に一致するリダイレクト規則を探す（Vercel の `has` 条件を再現）。 */
function ruleFor(host) {
  return (config.redirects ?? []).find((r) =>
    (r.has ?? []).some((h) => h.type === 'host' && h.value === host),
  );
}

test('★旧ドメインは両方とも新ドメインへ飛ぶ', () => {
  for (const host of OLD_HOSTS) {
    const rule = ruleFor(host);
    assert.ok(rule, `${host} のリダイレクト規則が無い`);
    assert.ok(
      rule.destination.startsWith(`https://${NEW_HOST}/`),
      `${host} の飛び先が ${rule.destination}。新ドメインでない`,
    );
  }
});

test('★新ドメイン自身を飛ばさない（無限ループにしない）', () => {
  const rule = ruleFor(NEW_HOST);
  assert.equal(
    rule,
    undefined,
    `${NEW_HOST} にリダイレクト規則がある。自分へ飛び続けて開けなくなる`,
  );
});

test('★パスを捨てない（/foo で入った人が /foo に着く）', () => {
  for (const host of OLD_HOSTS) {
    const rule = ruleFor(host);
    assert.equal(rule.source, '/(.*)', `${host} の source がパス全体を拾っていない`);
    assert.ok(
      rule.destination.includes('$1'),
      `${host} の飛び先にパスが引き継がれていない（トップに飛ばされる）`,
    );
  }
});

test('★恒久リダイレクト（301）である', () => {
  for (const host of OLD_HOSTS) {
    assert.equal(
      ruleFor(host).permanent,
      true,
      `${host} が一時リダイレクト。検索エンジンに移転が伝わらない`,
    );
  }
});

test('★飛び先が cookie を共有できるドメインである', () => {
  // ログイン共有の条件そのもの。ここが崩れると「追加登録なしで入れる」が嘘になる。
  for (const host of OLD_HOSTS) {
    const url = new URL(ruleFor(host).destination.replace('$1', ''));
    assert.ok(
      url.hostname === 'kimito.link' || url.hostname.endsWith('.kimito.link'),
      `飛び先 ${url.hostname} に Clerk の cookie が届かない`,
    );
  }
});
