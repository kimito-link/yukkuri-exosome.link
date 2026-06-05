# App Review リジェクト返信テンプレート集

> Apple App Review からリジェクトされたとき、App Store Connect の
> 「App Reviewに返信」欄にコピペで使う日本語返信文テンプレ集。
> 3プロジェクト (ゆっくりエクソソーム / リバースハック / 富士山コンパス) 共通の資産。

## なぜここに置くのか

App Store Connect API には、**Resolution Center（リジェクト返信スレッド）への
POST エンドポイントが公開されていない**（2026-06 時点）。

つまりリジェクト返信は **「ASC GUI で人がコピペする」** しか方法がない。

代わりに、よくあるリジェクト理由ごとに **「即使える返信テンプレ」を git にコミット**
しておくことで：

- ✅ チームの誰でも同じ品質で返信できる
- ✅ 過去のリジェクトと返信が git log で追える
- ✅ 3プロジェクトで学んだ教訓を共有できる
- ✅ `asc-rejection-classify.mjs` が「このテンプレを使え」と自動指示できる

## ファイル命名規則

```
app-review-replies/
├── README.md                                   # この説明
├── 5.1.1-ii-purpose-strings.md                # Guideline 5.1.1(ii) Privacy
├── 2.3.10-other-platform-reference.md          # 他社プラットフォーム名言及
├── 2.1-app-completeness-demo-account.md        # デモアカウント関連
├── 4.0-design-screenshot.md                    # スクショ品質
├── 2.5.1-software-requirements.md              # クラッシュ・バグ
├── 5.1.1-i-privacy-data-collection.md          # データ収集の説明
└── _common-footer.md                           # 全テンプレ共通の末尾
```

ファイル名は **「ガイドライン番号-カテゴリ.md」** に統一。

## 使い方

### 1. ASC でリジェクトされる
Apple から「Submission ID: xxx, Guideline X.Y.Z で却下」とメッセージが来る。

### 2. テンプレを選ぶ
`app-review-replies/` の該当ファイルを開いて全文コピー。

### 3. ASC の「App Reviewに返信」欄に貼り付け
プロジェクト固有の部分（アプリ名、機能名）を実際の値に書き換えてから送信。

### 4. ワークフロー側も修正
返信だけでは Apple は通さない。ワークフロー YAML やソースコードを実際に修正して push。

## 自動分類との連携

`scripts/lib/asc-rejection-classify.mjs` は、Apple のリジェクト本文を読んで
カテゴリを判定する。リジェクトが来たら：

```bash
node scripts/asc-review-check.mjs
# → 出力例:
#   Rejected: Guideline 5.1.1(ii) detected (code=PURPOSE_STRINGS)
#   → Use: app-review-replies/5.1.1-ii-purpose-strings.md
#   → Fix: workflows/ios-appstore-release.yml の purpose strings に「具体例」を追加
```

## 過去のリジェクト履歴（このプロジェクト）

| 日付 | ガイドライン | テンプレ | 対応コミット |
|---|---|---|---|
| 2026-06-03 | 5.1.1(ii) | `5.1.1-ii-purpose-strings.md` | (commit hash) |
