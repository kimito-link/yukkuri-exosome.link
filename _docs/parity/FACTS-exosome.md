# FACTS — ゆっくりエクソソーム（exosome）

> Phase 0（事実確認）の成果物。**コード変更なし。**
> 作成 2026-10-01 / 司令塔（Claude Opus 5）が実コードで確認。
> 設計: [SISTER-SERVICES-REBUILD-SPEC.md](../../../SISTER-SERVICES-REBUILD-SPEC.md)

## ★このサービスは「作り直さない」（SPEC Q5）

揃えるのは A層（共通アカウント・姉妹導線・ハブ送信）だけ。**フレームワークは静的のまま。**
Phase 4 で共通部品2本を輸入するのみ。

## 1. ストアの実状態 — Capacitor 薄殻（既に kimito.link と同じ方式）

```
capacitor.config.ts 冒頭
  方式: server.url で本番Webを読み込む「リモート読込型」
  appId: com.kimito.link.yukkuriexosome
```
→ Phase 5 の「Expo を捨てる」対象外。**既に目標の形**。

## 2. ユーザー鍵 — 自前ユーザーDBは持たない（★ただし「永続層なし」は誤り）

★**2026-10-01 の検証で訂正。** 以前ここに「サーバー側の永続層が無い」と書いたのは**誤り**だった。

**正しくは**: 自前のユーザーテーブルは持たないが、**kimito.link 側に記録を複製している**。
```
src/js/sync.js:23  SYNC_ENDPOINT = 'https://kimito.link/api/app/exosome-sync'
  同期する種類: selfcare / mindcare / sleep / fatigue / skin / boost / meal（7種）
受け口: kimitolink-linktree/app/api/app/exosome-sync/route.ts
保存先: kimitolink-linktree/lib/exosome-sync-store.ts（Clerk の userId を鍵にする）
```
→ **鍵は Clerk userId**。移行問題は**発生しない**（結論は変わらない）。

**端末側のストレージも localStorage だけではない**:
- `ye_*`（localStorage）… 日々の記録
- **IndexedDB**（`src/js/photolog.js:20`）… 写真。★`sync.js` は**意図的に同期対象外**にしている

## 3. 実ユーザー数・データ量 — ★未確認（★「測れない」は誤りだった）

以前「localStorage のみなので原理的に数えられない」と書いたが**誤り**。
**kimito.link 側の `exosome-sync` ストアで数えられる**（userId を鍵に保存されているため）。
**確認方法**: `lib/exosome-sync-store.ts` の保存先（Redis）に対する件数照会。

## 5. Clerk の設定 — ✅ コードで確定

```
src/js/auth.js:41  pk_live_Y2xlcmsua2ltaXRvLmxpbmsk   （公開可能キー）
src/js/auth.js:44  CLERK_FRONTEND_API = 'clerk.kimito.link'
src/js/auth.js:48  IS_SATELLITE = false                ← ★サブドメインでは satellite 不要
```
★`exosome.kimito.link` は `.kimito.link` の `__client` cookie を共有するので satellite 不要。
`isSatellite: true` にすると `/v1/client/sync` が落ちて**ログインできなくなる**（実測済みの地雷）。

## ★旧ドメイン問題は未解決のまま（2026-10-01 実測）

```
https://yukkuri-exosome.link/  → HTTP 200   ★301 されていない
https://exosome.kimito.link/   → HTTP 200
```
★**旧ドメインは別ドメインなので `.kimito.link` の cookie が届かない。**
`IS_SATELLITE=false` 固定なので satellite でも救われない。
→ **旧ドメインから入った利用者はログインできない見込み**（実機未検証）。

★これは本計画より前からある既知の課題で、**本計画の範囲外**。
対処案（301 で寄せる / 名簿の `url` を新ドメインへ）は軽いが、
利用者がブックマークしている可能性があるため**オーナー判断**。

## ルート台帳の元データ

✅ 追跡 HTML **21**（`git ls-files '*.html'` 実測）。

## Phase 4 でやること（これだけ）

`templates/web/auth-mode/` の Vanilla 版共通部品2本の輸入:
- `sibling-services.js.example`（姉妹導線＝逆方向リンク）
- `hub-summary-client.js.example`（ハブへのサマリ送信）

★`src/js/common.js` のストレージ層は**触らない**。

---

## この FACTS で埋まらなかったもの

3 は**設計上測れない**（未確認ではない）。旧ドメインの扱いは**オーナー判断待ち**。
