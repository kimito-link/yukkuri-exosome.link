# Kimito-Link の ゆっくりエクソソーム

[![Status](https://img.shields.io/badge/status-Active-green.svg)](https://yukkuri-exosome.link)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)

> ゆっくり3人組「**りんく・こん太・たぬ姉**」と、毎日のセルフケアを積み上げるアプリ

エクソソームに関する正しい知識を、対話形式でやさしく学びながら、点滴・サプリ・セルフケア習慣を「体内シグナルマップ」で可視化していくセルフケアアプリです。

🌐 **公開URL（予定）**: https://yukkuri-exosome.link

---

## ✨ 主な機能

### 🏠 Today（ホーム）
- 体内シグナルマップ（6部位）でその日のエクソソーム活性を可視化
- 3人組から今日のひとこと
- 連続日数・レベル・EP表示

### ✅ Care（セルフケア）
- 6つのケア項目をエクソソーム生成アクションとして記録
  - 髪エクソ・美肌エクソ・目元エクソ
  - 循環エクソ・腸内エクソ・筋肉エクソ

### 💊 Boost（点滴・サプリ）
- 16種類のアイテムを記録
  - 💉 エクソソーム点滴 / 培養上清液 / NMN点滴 / 高濃度ビタミンC ほか
  - 🥤 NMN / コラーゲン / レスベラトロール ほか
- ⭐ NMN系を記録するとミトコンドリア星演出

### 🌱 Garden（育成）
- 細胞をたまご → めばえ → 満開 → 銀河へ育てる
- 11個のバッジ獲得システム
- 30レベルロードマップ

### 👤 Me（マイページ）
- 統計（連続・累計・EP・クイズ最高）
- 毎日のリマインダー設定（ブラウザ通知）
- もっと詳しく（記事・用語集）

---

## 🛠️ 技術スタック

- **HTML5 / CSS3 / Vanilla JavaScript** — フレームワーク不使用
- **localStorage / IndexedDB** — すべてのデータは端末内で完結（ログイン不要）
- **PWA** — ホーム画面に追加可能
- **Vercel** — Web 配信（静的）
- **Capacitor 8** — iOS ネイティブシェル（リモート読込型）
- **Bubblewrap (TWA)** — Android ネイティブシェル（Chrome Custom Tab 経由）

> Web / iOS / Android すべて **同じ本番URL** (`https://yukkuri-exosome.link`) を読み込むので、
> 機能更新は Web に push するだけで全プラットフォームに反映される。

---

## 🚀 ローカルで起動

```bash
cd src
python -m http.server 8765
```

ブラウザで http://localhost:8765/ を開く。

または、Node 同梱の http-server（permissionなし）:

```bash
npm install
npm run web:serve
```

---

## 📱 iOS / Android アプリ化

`fujisan-clean` / `partnership_program_website` と同じ構成を採用しています。

### 0. 依存をインストール

```bash
npm install
```

### 1. iOS（Capacitor）

```bash
# 初回のみ
npm run cap:copy            # src/ → www/ にミラー（Capacitor が webDir に要求）
npm run ios:add             # ios/ プロジェクト生成（Xcode 必須／macOSのみ）

# 以降の更新サイクル
npm run ios:sync            # www/ 同期 + Capacitor sync
npm run ios:open            # Xcode で開いて実機ビルド/AppStore提出
```

- `capacitor.config.ts` の `server.url` で本番Webを読みにいくので、
  ネイティブ側はシェルだけ。コード更新は Web に push すれば即反映される。
- 配色（`#FFFAF3` / `#C9899A`）は上品ベージュ×くすみローズで統一済み。

### 2. Android（Bubblewrap = TWA）

セットアップ済み：`android-twa/` 配下に `twa-manifest.json`、署名鍵（`android-upload-key.jks`）、
`keystore.properties`（gitignore済み）まで揃っている。

```bash
# manifest.webmanifest を変えたとき
npm run android:twa:update     # --skipVersionUpgrade で対話なし

# AAB ビルド（Play Console にアップロード可能）
npm run android:twa:build
```

`bubblewrap build` がパスワード入力で固まる場合は、環境変数で渡せる:

```powershell
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = (Get-Content android-twa/keystore.properties | Select-String 'storePassword' | ForEach-Object { ($_ -split '=')[1] })
$env:BUBBLEWRAP_KEY_PASSWORD = $env:BUBBLEWRAP_KEYSTORE_PASSWORD
npm run android:twa:build
```

**Windows での既知の問題と回避策**:

1. **`gradlew.bat is not recognized`**: Bubblewrap が内部で `gradlew.bat` を呼ぶとき
   PATHプレフィクスが付かずに失敗することがある。その場合は `android-twa/` で直接叩く:

   ```powershell
   Set-Location android-twa
   $env:JAVA_HOME = "C:\Users\info\.bubblewrap\portable-jdk17\jdk-17.0.18+8"
   $env:Path = "$env:JAVA_HOME\bin;$env:Path"
   $env:ANDROID_HOME = "C:\Users\info\AppData\Local\Android\Sdk"
   $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
   $env:BUBBLEWRAP_KEYSTORE_PASSWORD = "<storePassword>"
   $env:BUBBLEWRAP_KEY_PASSWORD = "<keyPassword>"
   .\gradlew.bat bundleRelease       # → app/build/outputs/bundle/release/app-release.aab
   ```

2. **`Your project path contains non-ASCII characters`**: プロジェクトが `OneDrive\デスクトップ\` 配下にあるとAGPが蹴る。`android-twa/gradle.properties` に `android.overridePathCheck=true` を追加済み（`bubblewrap update` で上書きされたら再度追加）。

#### Digital Asset Links

`src/.well-known/assetlinks.json` に SHA256 のplaceholderが入っています。
Bubblewrap が署名鍵を生成したら（または Play App Signing の SHA256 が確定したら）、
そのfingerprintを以下に書き込んでください:

```
src/.well-known/assetlinks.json
  → "PASTE_PLAY_APP_SIGNING_SHA256_HERE" を SHA256 に置換
```

これを Vercel に push すると `https://yukkuri-exosome.link/.well-known/assetlinks.json`
で配信され、TWA の URL バー非表示が有効になります（`vercel.json` で
`Content-Type: application/json` を明示済み）。

---

## 🔄 リリースフロー

| プラットフォーム | リリース手順                                                                |
|------------------|----------------------------------------------------------------------------|
| Web              | `main` に push → Vercel が自動デプロイ                                      |
| iOS              | `npm run ios:sync` → Xcode で Archive → App Store Connect にアップロード    |
| Android          | `npm run android:twa:build` → Play Console に AAB をアップロード             |

---

## 📁 ディレクトリ構造

```
src/
├── index.html              # Today（メイン画面）
├── selfcare/               # Care タブ
├── boost/                  # Boost タブ ⭐NEW
├── garden/                 # Garden タブ
├── me/                     # Me タブ
├── advice/                 # ひとことアドバイス
├── quiz/                   # ミニクイズ
├── glossary/               # 用語集
├── basics/                 # エクソソーム基礎記事(3本)
├── treatment/              # 施術関連記事(2本)
├── characters/             # 3人組プロフィール
├── about/                  # サイトについて
├── css/                    # スタイル
├── js/                     # ロジック
├── images/                 # キャラ・ロゴ画像
├── icons/                  # ファビコン・OG画像
├── scripts/                # ビルド系（アイコン生成・ファビコン挿入）
└── manifest.webmanifest    # PWA設定
```

---

## 🎨 デザイン方針

- **上品ベージュトーン** — 容姿感度の高い層に向けた美容サロン風
- **明朝＋ゴシックの組み合わせ** — エディトリアル風レイアウト
- **キャラ密度を保ちつつ邪魔しない配置** — 3人組のアセットを活用
- **体内マップの可視化** — エクソソームならではの世界観

---

## 📌 注意事項

当アプリは**医療診断ではなく、毎日のセルフケア習慣を可視化するためのツール**です。  
体内エクソソームの「+◯粒」表記は分かりやすさのためのイメージで、実測値ではありません。

実際の施術内容・効果については、必ずクリニックの医師の指示・説明に従ってください。

---

## 🔗 関連プロジェクト

- **本家**: [Kimito-Link](https://kimito-link.com/) — クリエイターとファンをつなぐ確かな絆

---

© Kimito-Link — All rights reserved.
