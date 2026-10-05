# PWA 起動画面（地色1色）の Android 実機計測 — yukkuri-exosome.link

- 日付: 2026-10-05
- 端末: moto g64y 5G／Android 15／Chrome 154（WebAPK）
- 撮り方: 端末の WebAPK を入れ直し、ホーム画面のアイコンから起動した様子を `screenrecord` で録画し、フレームに切り出した
- 手順の正本: `web-ios-android/templates/scripts/measure-webapk-launch.sh`
  （[GitHub](https://github.com/kimito-link/web-ios-android/blob/main/templates/scripts/measure-webapk-launch.sh)）
- 解析: 各フレームの本体領域（ステータスバー＝上 4%・ナビバー＝下 8%・右端 16px のスクロールバーを除く）の最頻色を出した。
  録画は YUV420 のため ±3 程度の圧縮ずれがある
- 設計書: `web-ios-android/_docs/DESIGN-pwa-launch-screen-2026-10-05.md`
  （[GitHub](https://github.com/kimito-link/web-ios-android/blob/main/_docs/DESIGN-pwa-launch-screen-2026-10-05.md)）

## 期待地色

`#FFFAF3`（`style.css` の `--color-bg`。`manifest.background_color`・`html`/`body` の背景がこの値）

## 結果

| 段階 | 本体領域の最頻色 |
|---|---|
| OS の起動画面（地色＋アイコン） | #FDF9F0 |
| 切り替え直後のプレースホルダ | #FDF9F0 |
| 本編 | #F5F0E8〜#F7F1EA（同系のクリーム） |

判定: 色の飛び無し。起動から本編まで同系のクリーム色で、白・灰のフレームは無い。

補足: タイル画像でステータスバーがピンク → 明色 → ピンクと一往復するのが見える。これは `theme_color`
（ブランド色）で塗られた OS の起動画面から Chrome の窓に切り替わる瞬間の往復で、本文の地色とは別件
（設計書「ステータスバーの色の往復」節、未着手）。

## 画像

| ファイル | 中身 |
|---|---|
| `android_after.png` | 1回目（11:30）。起動直後 1.1 秒を 30fps で切り、画面の上から 62% を 11x3 のタイルに並べたもの |
| `android_transition.png` | 1回目の 2.70 秒付近、起動画面から本編へ切り替わる前後のフレーム |
| `android_after_rerun.png` | 2回目（11:39）。同じ手順で撮り直したタイル。1回目と同じ推移 |

before（`background_color` を外した状態）の録画は exosome では撮っていない（surechigai で変更前後を比べた結果は設計書の表を参照）。
ホーム画面のアプリアイコンと Chrome のフラグ読込トーストが映っているが、個人のメッセージ・連絡先は映っていないことを確認した。

## 関連 PR

- #19 `fix(pwa): 起動画面の地色を #FFFAF3 の1色にそろえる`
