# 引継ぎプロンプト — Kimito-Linkのゆっくりエクソソーム

> 次のセッションを開始するときは、このファイル全文をコピペして渡してください。

---

## 🚀 2026-05-31 〜 06-01 セッションでやったこと（最新サマリー）

このセッションは超大型でした。**8時間以上の作業で「アプリのストア提出まであと一歩」の状態**まで進めました。

### ✅ ストア登録ステータス（両方とも作成完了）

| 項目 | 値 |
|---|---|
| Apple Team ID | `8922HQ842P` (BEST TRUST K.K.) |
| Apple Issuer ID | `2c64e8a7-ab21-4110-afdf-b182c678cc8c` |
| Apple Key ID | `P8W74LR2GH` |
| **ASC App ID** | **`6775201794`** |
| **Play Developer ID** | **`6880871170619890401`** |
| **Play App ID** | **`4973600981777862364`** |
| Bundle ID / Package | `com.kimito.link.yukkuriexosome` |
| iOS Provisioning Profile | ✅ 発行・base64 投入済み |
| Android Keystore | ✅ 生成・base64 投入済み |
| Play SA 権限 | ✅ `fujisan-play-publisher@fujisan-compass.iam.gserviceaccount.com` に「ゆっくりエクソソーム」追加済み |

### ✅ GitHub Secrets（12個 → p12除外で11個）

```
APPLE_TEAM_ID
APPSTORE_CONNECT_KEY_ID
APPSTORE_CONNECT_ISSUER_ID
APPSTORE_CONNECT_API_KEY_P8_BASE64
IOS_DIST_CERT_PASSWORD          ← ランダム生成（CI で .p12 を cer+key から再構成）
IOS_DIST_CERT_CER_BASE64        ← distribution.cer
IOS_DIST_PRIVATE_KEY_PEM_BASE64 ← distribution_private.key（パスワードなしのプレーン）
IOS_APPSTORE_PROFILE_BASE64
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PROPERTIES
GOOGLE_PLAY_SA_JSON_BASE64
```

⚠️ 既存の `distribution.p12` はパスワード忘失のため Secret から削除済み。
CI 上で `.cer` と `private_key` から新パスワードで p12 再構成する経路に統一。

### ✅ アプリアイコン完成

**「Geminiで何度も生成揺らぎ → Pillow合成に転換」が大成功** 🎯

- `scripts/icon-gen/make_icons.py` で **3バリアント** + 全プラットフォーム展開
  - **A**: りんく単体 + パール3粒（アプリアイコン用、採用）
  - **B**: りんく + 体内シグナルマップ六角形（OGP / 記事ヒーロー用）
  - **C**: 3人組 + パール3粒（バナー / フィーチャーグラフィック用）
- `scripts/generate-store-assets.mjs` で `npm run assets:store` ラッパー
- パール3粒は **Kimito-Link 公式ロゴ**（`02_グッズ・ブランド/kimito-logos/`）の哲学を継承

### ✅ 上田哲学記事を新規追加

`src/basics/ueda-philosophy/index.html` — 8セクション構成の人物記事。
本『改訂版 驚異の再生医療』からの引用5箇所、出典明示。
スマートクリニック・大谷院長・U-Factor 社・上田実先生本人が見て「分かってる」と
感じられる深さ。商標・効果断定・特定クリニック名は一切なし。

### ⏳ 走行中（このセッション末時点）

- 🍎 **iOS Workflow #3** (`26723235549`) — 絵文字エラー修正後の再ビルド
- 🤖 **Android Workflow #3** (`26723267729`) — Play SA権限付与後の再ビルド
- 🔬 **Garden/Me 拡充ディープリサーチ** (`wwyik7f80`) — 30〜60エージェント分析中

### ⚠️ 直前の失敗とその対策

| 試行 | 結果 | 原因 | 対策 |
|---|---|---|---|
| iOS #1 | ❌ 36秒 | p12 パスワード wrong | p12 Secret 削除 → cer+key 経路に統一 |
| iOS #2 | ❌ 3分48秒 | description/promotional text の絵文字 (✅, 💊, 👤, 🌱, 🏠, 🐢) | テキストから除去 → push で自動再起動 |
| Android #1 | ❌ 1分37秒 | Play SA 権限なし | SA を新アプリに招待 |
| Android #2 | ❌ 1分40秒 | 権限伝播待ち | 数分後に再起動 |
| iOS #3 / Android #3 | 🟡 走行中 | (修正済み) | 結果待ち |

### 📂 重要な秘密情報の場所

- App Store Connect API Key: `C:\Users\info\OneDrive\Apple\AuthKey_P8W74LR2GH.p8`
- iOS 配布証明書: `C:\Users\info\OneDrive\Apple\distribution.{cer,csr,pem}` + `distribution_private.key`
- iOS Provisioning Profile: `C:\Users\info\OneDrive\Apple\YukkuriExosome_App_Store.mobileprovision`
- Google Play SA JSON: `C:\Users\info\OneDrive\GooglePlay\fujisan-compass-36b96abf72d3.json`
- ローカル `.env` (gitignore済み): `IOS_DIST_CERT_PASSWORD` (32文字ランダム) など

---

プロジェクト「ゆっくりエクソソーム」の作業を引き継ぎます。
前セッションが長くなったので、状況をまとめて渡します。

## 📂 プロジェクト概要

- **名称**: Kimito-Linkのゆっくりエクソソーム
- **公開URL**: https://yukkuri-exosome.link/
- **GitHub**: https://github.com/kimito-link/yukkuri-exosome.link
- **ローカル**: `C:\Users\info\OneDrive\デスクトップ\Resilio\github\Exosome`
- **デプロイ**: Vercel（main branchへのpushで自動デプロイ）
- **DNS**: Cloudflare（プロキシOFF設定済み）

## 🎯 プロジェクトの目的

1. クリエイター（ユーザー本人）が「スマートクリニック銀座」（大谷崇裕院長）の患者
2. 院長監修のYouTube出演経験あり、価格優遇あり、関係良好
3. 院長の患者には芸能人多数（山下智久、佐藤健、指原莉乃クラス）
4. このアプリを「患者さんが作ったアプリ」として院長→芸能人→U-Factor社（井島英博オーナー、上田実取締役）への自然な導線を作る
5. 上田実先生『改訂版 驚異の再生医療 培養上清が世界を救う』扶桑社新書(2022)をベースに学術的厚みUP

## 🧬 技術スタック

- Vanilla HTML/CSS/JavaScript（フレームワーク無し）
- ローカルストレージ完結（YEStorage = localStorage wrapper）
- IndexedDB（写真記録のみ）
- PWA対応（manifest.webmanifest）
- 全データ端末内完結（プライバシー◎、ログイン無し）
- Python のPyMuPDFでPDFテキスト抽出済み（`research/ueda_book_text.txt`）
- **Capacitor 8（iOS）+ Bubblewrap TWA（Android）導入済み** ← NEW
  - Bundle ID: `com.kimito.link.yukkuriexosome`
  - 表示名: 「ゆっくりエクソソーム」
  - 方式: fujisan-cleanと同じ「リモート読込型」（server.url = 本番Web）
  - 設定: `capacitor.config.ts` / `.bubblewrap-config.json` / `package.json` / `src/.well-known/assetlinks.json`

## 📱 実装済み機能（Today画面の上から順）

1. ブランドヒーロー（Kimito-Linkロゴ + タイトル）
2. 3キャラ並び（りんく・こん太・たぬ姉）
3. 体内シグナルマップ（りんく顔型・6部位）
4. 上田先生の今日の検証（30本ローテーション）
5. 次回ブースト予定リマインダー（点滴・サプリ）
6. 本日の肌セルフチェック（10段階＋具体例ガイド）
7. 本日の疲労回復度（10段階＋ガイド）★院長リクエスト
8. 院長への質問メモ
9. ビフォーアフター写真記録（IndexedDB保存）
10. 今日のキャラのひとこと
11. 統計（連続日数・Lv・EP）
12. 本日のクエスト3つ

## 📑 タブ構成（ボトムナビ）

- 🏠 Today | ✅ Care | 💊 Boost | 🌱 Garden | 👤 Me

## 🎬 院長とのLINEやり取り（最新状況）

- 「アプリとエクソ」と発言 → こちらから機能提案
- 4つのコラボ案を院長から提示（肌解析/AGA/PHR/CRM決済）
- 「疲労回復度ええすね」と具体リクエスト → 即実装済み
- 「おおおよさげ」とポジティブ反応
- 「本要約チャンネルのエクソソーム解説が分かりやすい」とヒント
  → 本要約チャンネルスタイル分析済み（衝撃データ→現状の限界→革新→数字→応用→哲学）
  → 5記事の冒頭リードに「衝撃データ」適用済み
  → what-is-exosome 記事には「なぜまだ広まらないのか」哲学考察セクション追加済み

## 🎨 デザインガイドライン

- ターゲット: 山下智久・佐藤健・指原莉乃クラスの芸能人＝美意識MAX
- トーン: 上品ベージュ × ゆっくりキャラの可愛さ
- 配色: くすみローズ(#c9899a) / シャンパンゴールド(#c9a96e) / モカ(#a78a6b)
- フォント: Noto Serif JP（明朝）でエディトリアル風
- キャラ密度を保ちつつ邪魔しない配置

## ⚠️ 重要な制約

- 商標（U-Factor®等）は使わない
- 地域名（銀座等）は使わない
- 効果断定表現NG（薬機法）
- 「治る」「絶対」「最高」使用禁止
- 必ず「医療機関でご相談ください」を添える
- スマートクリニック銀座の固有情報には触れない

## 🛠️ よく使うコマンド

```powershell
# ローカルサーバー（既に起動中の可能性あり）
Set-Location "C:\Users\info\OneDrive\デスクトップ\Resilio\github\Exosome\src"
python -m http.server 8765

# Claude Preview MCP も使える（preview_start で yukkuri-exosome）

# git push
Set-Location "C:\Users\info\OneDrive\デスクトップ\Resilio\github\Exosome"
git add -A
git commit -m "..."
git push
```

## 📁 重要ファイル

- `src/index.html`（Today画面、JSで動的構築）
- `src/js/common.js`（YEStorage, CHARACTERS定義）
- `src/js/app.js`（レベル・EP・タブ）
- `src/js/bodymap.js`（体内マップ）
- `src/js/boost.js`（点滴・サプリ16種）
- `src/js/skincheck.js`（肌10段階）
- `src/js/fatigue.js`（疲労10段階）
- `src/js/doctormemo.js`（院長メモ）
- `src/js/reminder.js`（次回予定）
- `src/js/photolog.js`（IndexedDB写真）
- `src/js/ueda-quotes.js`（30本の名言）
- `src/js/onboarding.js`（6スライド）
- `src/js/quiz.js`（10問・上田先生研究ベース）
- `src/js/glossary.js`（30用語）
- `research/ueda_book_text.txt`（PDFから抽出した上田本テキスト 130k字）
- `research/ueda_key_passages.md`（キーワード別抜粋）

## 🎯 次にやれそうな候補

ユーザーが「次これやりたい」と言ったら：

- **A.** 残り4記事（vs-stem-cell, vs-supernatant, treatment/types, treatment/choose）にも 「💭 なぜ広まらないのか」相当の哲学的考察セクションを追加
- **B.** ~~アプリ化（Capacitor + iOS / Android TWA）~~ **設定済み** → 次は実機ビルド
  - `npm install` → `npm run ios:add` → Xcode で Archive
  - `npm run android:twa:init` → SHA256 を assetlinks.json に書き戻す → `npm run android:twa:build`
  - 詳細は README.md「📱 iOS / Android アプリ化」セクション参照
- **C.** 院長への返信文を一緒に作る（最新の「おおおよさげ」「本要約風採用」「アプリ化完了」を伝える）
- **D.** 通知（Web Push）の本格実装
- **E.** シェア機能の強化（写真結果のSNS共有用カード生成）
- **F.** Garden画面・Me画面の充実
- **G.** クリニック予約導線（院長OKが出たら）
- **H.** ストアアセット作成（App Store / Play Store のスクショ、説明文、プライバシーポリシー）

## 📱 マルチプラットフォーム化の状態（2026-05-31時点）

完了:
- ✅ `package.json` 作成 + `npm install` 済み（Capacitor 8 / Bubblewrap CLI / http-server / TypeScript）
- ✅ `capacitor.config.ts` 作成（server.url=本番Web のリモート読込型）
- ✅ `.bubblewrap-config.json` 作成（fujisan-cleanと同じJDK/SDKパス、user-localなのでgitignore対象）
- ✅ `src/.well-known/assetlinks.json` に **実際の SHA256** 書き込み済み
  - SHA256: `E0:C1:E1:FE:B7:F0:49:A0:53:32:B5:5B:55:03:CF:67:39:A0:C1:46:38:12:00:20:E9:20:93:55:CC:54:2C:B3`
- ✅ `vercel.json` に `assetlinks.json` / `manifest.webmanifest` の Content-Type 明示
- ✅ `manifest.webmanifest` を TWA 要件に強化（id, display_override, any/maskable分離）
- ✅ `scripts/copy-web-to-www.mjs` で src→www ミラー
- ✅ `.gitignore` に Capacitor/Bubblewrap 生成物追加
- ✅ README.md にリリースフロー追記
- ✅ **iOSプロジェクト雛形生成済み** (`ios/App/` — Xcode で開ける状態)
- ✅ **Android TWAプロジェクト雛形生成済み** (`android-twa/` 一式)
- ✅ **Android アップロード署名鍵生成済み** (`android-twa/android-upload-key.jks`)
  - パスワード: `android-twa/keystore.properties` に保存（gitignore済み）
- ✅ **Android AAB ビルド成功** (`android-twa/app/build/outputs/bundle/release/app-release.aab`, 2.37MB)

未着手（次のセッションで）:
- ⬜ **Web側を git push** → Vercel が `assetlinks.json` を本番に反映
  - これをやらないと TWA は URLバーが表示されたままになる
- ⬜ Play Console 登録：内部テストトラックに `app-release.aab` をアップロード
  - Play App Signing を有効にすると Google が独自にSHA256を発行する
  - その場合は新しいSHA256 を `src/.well-known/assetlinks.json` に追記
- ⬜ iOS: macOSに `ios/` を持ち込み → Xcode で App ID 登録 → Archive → TestFlight
- ⬜ ストアアセット（スクショ・説明文・プライバシーポリシー）

## 🔑 重要な秘密情報

- **Android keystore パスワード**: `android-twa/keystore.properties` 参照
  - これは紛失するとアプリ更新できなくなる ⚠️ **必ずバックアップ**
  - 1Password / iCloud Keychain などへの保管推奨
- **Bundle ID**: `com.kimito.link.yukkuriexosome`（iOS/Android共通）

## 🛠️ Windows でハマったポイント（メモ）

1. `cap add ios` には TypeScript devDep が必要 → 入れた
2. `bubblewrap update` は対話プロンプトあり → `--skipVersionUpgrade` で非対話化
3. `bubblewrap build` はパスワード入力で固まる → 環境変数 `BUBBLEWRAP_KEYSTORE_PASSWORD` / `BUBBLEWRAP_KEY_PASSWORD` で渡せる
4. `gradlew.bat is not recognized` バグ → `android-twa/` で直接 `.\gradlew.bat bundleRelease` を叩く
5. `デスクトップ` 非ASCIIで AGP が蹴る → `gradle.properties` に `android.overridePathCheck=true` 追加

## 🚀 リリース自動化（fujisan-clean / リバースハック と統一）

partnership_program_website (リバースハック) の scripts/ と app.config.json を移植済み。
**1ファイル `release-notes/CURRENT-ja.txt` を書き換えて npm run release:* を叩くだけで、
ストアの「リリース待ち」までを全自動化**できる。

### 移植したスクリプト（全部 node:* だけで動く、外部npm依存ゼロ）

| スクリプト | 目的 |
|---|---|
| `scripts/lib/asc-api.mjs` | App Store Connect API クライアント |
| `scripts/lib/play-api.mjs` | Google Play Developer API クライアント |
| `scripts/lib/app-config.mjs` | `app.config.json` ローダ |
| `scripts/lib/asc-pricing.mjs` | 無料配信を強制するヘルパ |
| `scripts/lib/asc-screenshot-upload.mjs` | iOSスクショ自動アップロード |
| `scripts/lib/asc-rejection-classify.mjs` | 審査リジェクト理由の分類 |
| `scripts/appstore-submit.mjs` | iOSビルドを審査提出 |
| `scripts/appstore-release-pending.mjs` | **「リリース待ち」を自動公開**（今回のスクショで詰まったとこ） |
| `scripts/appstore-release-now.mjs` | 「公開可能」状態を即時公開 |
| `scripts/play-publish.mjs` | AABをPlay Storeにアップ + 審査提出 |
| `scripts/play-review-check.mjs` | Play審査状況をチェック |
| `scripts/asc-review-check.mjs` | iOS審査状況をチェック |
| `scripts/release-bump.mjs` | バージョン番号を一括bump |

### 1コマンドリリースのフロー

```bash
# 1. リリースノート編集（500字以内、プラットフォーム名は書かない）
notepad release-notes/CURRENT-ja.txt

# 2. バージョン bump（package.json + app.config.json + twa-manifest.json 全部）
npm run release:bump:patch

# 3. iOS提出（Mac/Xcode無くてもAPI経由で完結）
$env:APPSTORE_CONNECT_KEY_ID = "<KeyID>"
$env:APPSTORE_CONNECT_ISSUER_ID = "<IssuerID>"
$env:APPSTORE_CONNECT_API_KEY_P8_PATH = "C:\Users\info\OneDrive\Apple\AuthKey_P8W74LR2GH.p8"
npm run release:appstore:submit

# 4. Android提出
$env:GOOGLE_PLAY_SA_JSON_PATH = "..."
npm run release:play

# 5. 審査通過後、リリースボタンを自動で押す（手動クリック不要）
npm run release:appstore:release-pending
```

### 認証情報の場所（既存）

- **App Store Connect API Key (.p8)**: `C:\Users\info\OneDrive\Apple\AuthKey_P8W74LR2GH.p8`
  - その他に `ApiKey_OGODFGILTLDI.p8`, `ApiKey_TQJ2STS1T5L3.p8` も存在
- **iOS 配布証明書**: `C:\Users\info\OneDrive\Apple\distribution.{cer,p12,pem}`
- **Google Play SA JSON (fujisan用)**: `C:\Users\info\OneDrive\GooglePlay\fujisan-compass-36b96abf72d3.json`
  - ⚠️ fujisan-compass パッケージにしか権限が無い。ゆっくりエクソソーム用に
    Play Console > ユーザーと権限 で同SAを `com.kimito.link.yukkuriexosome` にも招待する必要あり
- 環境変数のテンプレ: `.env.example` 参照（`.env` 自体は gitignore済み）

### 未着手（次セッション以降）

#### 🟢 ストア提出系（iOS/Android が今走ってる結果次第）

- ⬜ iOS Workflow #3 (`26723235549`) の結果確認、失敗してたら対処
- ⬜ Android Workflow #3 (`26723267729`) の結果確認、失敗してたら対処
- ⬜ App Store 審査通過後の自動公開を確認（AFTER_APPROVAL設定済み）
- ⬜ Play Console 内部テスト → 製品版審査キューへの昇格

#### 🟡 アプリ充実系

- ⬜ **Garden / Me 画面の充実** — ディープリサーチ結果（`wwyik7f80`）が出たら実装
- ⬜ 残り4記事の哲学考察セクション追加（vs-stem-cell, vs-supernatant, treatment/types, treatment/choose）
- ⬜ iOS スクリーンショット5枚（6.5"）を本番サイトキャプチャ or Pillow合成で作る
- ⬜ Play Console のストア掲載情報（説明文・スクショ・データセーフティ）を埋める

#### 🟠 アセット・コンテンツ系

- ⬜ アプリアイコン A/B/C の最終選別（A: 単体採用、B: OGP差し替え検討、C: バナー用に保管）
- ⬜ メインバナー素材を作る（Gemini版とPillow版を比較してベスト選定）
- ⬜ プライバシーポリシーページ作成（`/privacy/`）
- ⬜ クリニック予約導線（院長OKが出たら）

#### 🔵 院長コミュニケーション

- ⬜ 院長へLINEで進捗報告（`_drafts/doctor-otani-report-2026-05-31.md` を更新して送る）
  - 報告内容案：
    - iOS / Android のアプリ提出を進めてる
    - アプリアイコンができた（Pillow合成で3キャラ+パール3粒）
    - 上田実先生の哲学記事を新規追加（`/basics/ueda-philosophy/`）
    - ストア公開時に「○○さんの患者さんが作ってるアプリです」と紹介できる準備が整いつつある

## 📝 まずユーザーに聞くこと

「前回どこまで進めた状態か覚えてますか？」と聞いて、次にやりたいことを確認してから着手してください。

ローカルサーバーは port 8765 で動いている可能性があります。止まってたら `python -m http.server 8765` で再起動してください。

## 🛠️ よく使うコマンド（最新）

```powershell
# ローカル開発サーバー
Set-Location "C:\Users\info\OneDrive\デスクトップ\Resilio\github\Exosome\src"
python -m http.server 8765

# アイコン再生成（A/B/C 全部 + 全プラットフォーム展開）
Set-Location "C:\Users\info\OneDrive\デスクトップ\Resilio\github\Exosome"
npm run assets:store

# 個別バリアントだけ
npm run assets:store:A   # りんく単体
npm run assets:store:B   # 体内シグナルマップ
npm run assets:store:C   # 3人組

# ストア提出（手動）
gh workflow run ios-appstore-release.yml --ref main
gh workflow run android-play-release.yml --ref main

# ワークフロー状況
gh run list --limit 5

# git push（main直接、Vercel自動デプロイ）
git add -A
git commit -m "..."
git push
```
