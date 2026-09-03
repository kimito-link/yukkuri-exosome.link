# Exosome へ：kimito.link の共通アカウントに繋ぐ件（2026-09-03）

> doin-challenge.com のセッションから。
> オーナーの「Exosome も kimito.link システムを使いたい」を受けて調査した結果と、
> doin 側で実測した知見をまとめたもの。★引用したパスは全件、実在を確認済み。

---

## 結論：★Exosome に Clerk ログインを入れない。今のチケット方式のままにする

判断基準は **「いつでもユーザーが一番よい形／100年後も楽できる設計」**。
その基準で見ると、**今の Exosome が既に最適解**です。理由は3つ、いずれも実コードで確認しました。

### 1. Exosome は既に kimito.link と繋がっている（Clerk ではないだけ）

`src/js/premium.js` の冒頭に設計判断が明記されています:

> 「売るのは kimito、開くのは Exosome」。
> Exosome にはログイン・決済・API 照会を一切持ち込まない。
> kimito.link が発行した署名付きチケット（ECDSA P-256）を
> WebCrypto で検証し、有効なら localStorage に保存するだけ。
> 個人情報・userId は入れない（**Exosome は誰かを知らないままでよい**）。

発行側も実在します:
`../kimitolink-linktree/app/(auth)/dashboard/admin/longevity-unlock/actions.ts`
→ `lib/longevity-premium/ticket` の `issueLongevityPremiumTicket`

★**「kimito.link システムを使う」は既に達成されています。**
繋がっていないのではなく、**ログインを持ち込まない形で繋がっている**。

### 2. ユーザーにとって、ログインが無いほうが良い

実測した事実:
- Exosome は個人情報を一切サーバーに送っていない（`grep` で email/氏名などの送信箇所ゼロ）
- 記録はすべて端末内（`YEStorage` = localStorage）
- ログイン不要・端末内完結は、オンボーディングでも**訴求点として明示**されている
  （`src/js/onboarding.js:140`「無料・ログイン不要・端末内で完結」）

Clerk を入れると、ユーザー側にこれが増えます:

| 増えるもの | ユーザーへの影響 |
|---|---|
| ログイン手順 | ★健康記録アプリを開くたびに認証が挟まる |
| 個人情報の預託 | 今は「誰も知らない」のに、預ける相手ができる |
| 退会機能の必要性 | 預けたものを消す手段が要る＝**新たな責務** |
| プライバシーポリシーの拡張 | 「取得する情報」に列挙が増える |
| 障害点 | ★Clerk が落ちるとアプリが開けなくなる |

★**健康記録という性質上、「誰にも知られずに続けられる」ことは機能です。**
それを壊してまで得られるものが見当たりません。

### 3. 100年後に楽なのは、依存が少ないほう

- 今の Exosome: 純静的サイト ＋ 公開鍵1つ（同梱）。
  ★**kimito.link が消えても、既に発行済みのチケットは検証でき、アプリは動き続ける**
- Clerk 化した場合: Clerk が消えるとログインできず、**アプリ自体が使えなくなる**

doin では実際に、この依存が問題として残っています（後述§C）。

★署名検証は WebCrypto 標準（ECDSA P-256）で、**ベンダーに縛られていません。**
100年の観点で、これ以上良い形は思いつきません。

---

## したがって、やること：★ほぼ何もしない

1件だけ確認してください。

`../kimitolink-linktree/app.config.json` の `siblingServices` にある Exosome の項が
`"sharedAccount": false` です。
★チケット方式を続けるなら**これは事実として正しい**ので、**変更不要**です。

（`sharedAccount: true` にすると「共通アカウントでログインできる」という意味になり、
実態と食い違います。★doin は実態とズレた設定を放置した結果、
**別セッションが誤読する**という実害を出しました。§C 参照）

---

## ★それでも Clerk を入れると決めた場合の注意（オーナーが方針変更した時のため）

上の結論は「オーナーが方針を変えない限り」の話です。
変える場合、`premium.js` の設計方針の変更になるので**明示的な決定が要ります**。
そのうえで、doin で実測した注意点を残します。

### A. まずサブドメインに移すこと

Exosome の `app.config.json` の `productionDomain` は `yukkuri-exosome.link`（別ドメイン）。
共通アカウントの正本 `../kimitolink-linktree/docs/SHARED-ACCOUNT-SATELLITE-GUIDE.md` は:

> 新サービスも `*.kimito.link` サブドメインで配信するのが最も楽。
> 別ドメインで配信する場合のみ satellite + `/__clerk` proxy が要る（**複雑・非推奨**）。
> **まずサブドメイン運用にする**

→ `exosome.kimito.link` への移行が先。別ドメインのまま proxy を足すのは、doin が通った道で、
★**設定が実態と乖離して誤読を生みました**（§C）。

### B. ★退会で Clerk ユーザーを消してはいけない

doin で退会を実装したときの最大の判断点です。

kimito.link の Clerk は**共有インスタンス**なので、
★どこか1つのサービスで `clerkClient.users.deleteUser()` を呼ぶと、
**kimito.link も surechigai も doin も、全アカウントが消えます。**

linktree（`../kimitolink-linktree/lib/server/dashboard-store.ts:116`）は消していますが、
**あそこが primary だから**です。satellite 側が同じことをしてはいけません。

doin は「自前DBのデータだけ消し、Clerk は残す」を選び、
公開ページに「他サービスのアカウントは消えません」と明記しました。
実装は `../doin-challenge.com/server/db/my-data-db.ts` の `deleteMyAccount`
（元ネタは `../surechigai-romi.link/modules/encounter/db/account-deletion.ts`）。

### C. ★設定と実態のズレは、必ず誰かが誤読する

doin の `app.config.json` には今も実態と違う値が残っています:

| キー | 宣言値 | 実態（実測） |
|---|---|---|
| `productionDomain` | `doin-challenge.com` | 実配信は `doin.kimito.link`（HTTP 200） |
| `clerkCustomDomain` | `clerk.doin-challenge.com` | ★**DNS上に存在しない（NXDOMAIN）** |
| `clerkProxyUrl` | `.../__clerk` | 実配信では未設定（proxy 不使用） |

実行時は env が上書きするので動いていますが、
★**実際にこの設定を読んだ別セッションが「proxy 前提のまま」と誤読しました。**
「動くから放置」が一番高くつきます。

### D. Allowed subdomains の登録漏れは沈黙して落ちる

kimito.link の Clerk は `Enable allowed subdomains` が **ON**。
★リストに無いサブドメインは Frontend API を叩けず、
**エラーを出さずに落ちます。CIも赤くなりません。**

現在の登録は3件（Dashboard 実画面で確認済み）:
`doin.kimito.link` / `surechigai.kimito.link` / `voice.kimito.link`
→ Exosome を繋ぐなら、ここへの追加が要ります（人間の作業）。

### E. env の値が壊れると本番ログインが全滅する

2026-09-02、doin で実際に起きた事故（`../doin-challenge.com/lib/clerk-satellite.ts:14-17`）:

> `.trim()` だけでは足りない。囲みのクォートと、文字列として混入した改行表記も
> 落とす必要がある。**実際にそれで本番のログインが丸ごと動かなくなった。**

★画面上は「ボタンが光るだけで進まない」としか見えません。
検査があります: `../doin-challenge.com/scripts/check-env-sanitize.mjs`

### F. やってはいけない（正本より）

- 自前 OIDC IdP / 自前 OAuth フローを立てない
- 自前セッション（独自 JWT/cookie）を持たない。Clerk セッション一本
- primary の `<SignIn/>` を書き換えない
- 別ドメイン運用に安易に手を出さない。**まずサブドメイン**

★ログイン周りを触る前に必ず読む:
`../AI汎用ルール/docs/policies/CLERK_X_LOGIN_PLAYBOOK.md`（§1 の鉄則）

---

## 読むもの（全件、実在を確認済み）

- `src/js/premium.js` — ★現在のチケット方式の設計意図（冒頭コメント）
- `../kimitolink-linktree/app/(auth)/dashboard/admin/longevity-unlock/actions.ts` — チケット発行側
- `../kimitolink-linktree/docs/SHARED-ACCOUNT-SATELLITE-GUIDE.md` — 共通アカウントの正本
- `../AI汎用ルール/docs/policies/CLERK_X_LOGIN_PLAYBOOK.md` — ログインを触る前の鉄則
