# release-notes/

「このバージョンの新機能」テキストを Play Store / App Store の両方に流し込むための単一ソース。

## ファイル

- **`CURRENT-ja.txt`** — 次回リリースで使う日本語のリリースノート。常に最新版のみ保持。
  - Google Play `releaseNotes[ja-JP].text`
  - App Store `whatsNew[ja]`
  - 履歴は git log を参照する（このファイルは「最新版だけ」を保つ）

## 編集ルール

- リリースのたびに丸ごと書き換える。
- 改行は LF。空行で段落を分けてよい。
- 文字数の上限:
  - Google Play `releaseNotes`：500 文字
  - App Store `whatsNew`：4000 文字（実用は 500 以内）
  - **共通の運用上限は 500 文字**
- 他社プラットフォーム名は **書かない**:
  - Apple Guideline 2.3.10 により、App Store メタデータに `Android` / `Google Play` などを含めると審査で弾かれる。
  - 両ストア共通ソースなのでプラットフォーム中立な書き方にする。
- ユーザーに見える価値だけ書く（内部リファクタは書かない）。

## 自動化との接続

- `scripts/play-publish.mjs` がこのファイルを読み取って Google Play API に流す。
- `scripts/appstore-submit.mjs` が同じファイルを読み取って App Store Connect API に流す。
- ファイル更新 → main に push → CI が自動でリリース（CIワークフローは次フェーズ）。
- 当座は手動実行: `npm run release:appstore:submit` / `npm run release:play`
