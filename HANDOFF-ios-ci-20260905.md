# iOS の App Store 提出CIが通らない件（2026-09-05 時点）

> Android は動いている。iOS だけが 2026-07-04 以降ずっと失敗している。
> ★これはドメイン移行（exosome.kimito.link）とは無関係。移行前から壊れていた。

## 症状

`ios-appstore-release` ワークフローの **Install signing certificate** ステップで落ちる。

```
security: SecKeychainItemImport: MAC verification failed during PKCS12 import (wrong password?)
##[error]Process completed with exit code 1
```

ビルドにもアップロードにも到達していない。証明書をキーチェーンに入れる時点で終わっている。

## 実測で分かっていること

| 項目 | 事実 |
|---|---|
| 最後に成功した実行 | `28023297979`（2026-06-23、`Merge pull request #2`） |
| その時のログ | **`1 identity imported.`** ＝ 同じ経路で成功していた |
| 最初に失敗した実行 | 2026-07-04 |
| 失敗回数 | 10回以上、以後一度も成功なし |

**変わっていないもの（すべて確認済み）:**

- **GitHub Secrets** — 全て `2026-05-31` 更新のまま（`gh secret list` で確認）
- **ワークフロー** — `.github/workflows/ios-appstore-release.yml` は 2026-06-11 以降変更なし
- **Apple の証明書の有効期限** — Distribution 3枚とも 2027-03-18 / 2027-04-30 / 2027-06-13。**期限切れではない**
- **6/23 も `IOS_DIST_CERT_P12_BASE64` は空だった** — つまり成功時も CER+PEM から P12 を生成する経路を通っていた

つまり **シークレットの中身もコードも変わっていないのに、結果だけが変わった。**

## 仕組み（どこで何をしているか）

`.github/workflows/ios-appstore-release.yml:307-333` 付近。

1. `IOS_DIST_CERT_P12_BASE64` があればそれを使う（→ 現状は未登録なので使われない）
2. 無ければ `IOS_DIST_CERT_CER_BASE64` + `IOS_DIST_PRIVATE_KEY_PEM_BASE64` から
   `openssl pkcs12 -export -passout "pass:$IOS_DIST_CERT_PASSWORD"` で P12 を生成
3. `security import "$CERT_PATH" -P "$IOS_DIST_CERT_PASSWORD"` でキーチェーンへ

★ export と import で同じ `IOS_DIST_CERT_PASSWORD` を使っているので、
**パスワード不一致は論理的に起きないはず**。それでも MAC verification が落ちる。

## 有力な仮説（未検証）

**証明書(CER)と秘密鍵(PEM)が対応していない。**

Apple の Distribution 証明書が **3枚** ある（`developer.apple.com/account/resources/certificates/list`）。
7月前後に新しい証明書が作られ、`IOS_DIST_CERT_CER_BASE64` が指す証明書と
`IOS_DIST_PRIVATE_KEY_PEM_BASE64` の鍵がペアでなくなった可能性。

対応しない CER と PEM から `openssl pkcs12 -export` を実行しても
**エラーにならず壊れた P12 が生成される**ため、次の `security import` で
MAC 検証に失敗する。症状と一致する。

★ただしこれは仮説。シークレットの中身は見えないので確定できていない。

## 次にやること（人間の作業）

### 1. まず切り分け（ローカルで、Secretsを触らずに）

手元の Mac / キーチェーンで、いま GitHub Secrets に入っているのと同じ
CER と PEM を取り出して、対応しているか確かめる:

```bash
# 証明書の公開鍵のフィンガープリント
openssl x509 -in dist-cert.cer -inform DER -pubkey -noout | openssl md5

# 秘密鍵から導出した公開鍵のフィンガープリント
openssl pkey -in dist-key.pem -pubout | openssl md5
```

**この2つが一致しなければ、それが原因。** 一致するなら別の原因を探す。

### 2. 直し方（最も確実な順）

**A. P12 を1本作って `IOS_DIST_CERT_P12_BASE64` に入れる（推奨）**

CER と PEM を別々に持つ構成は、ペアがずれると静かに壊れる。
Mac のキーチェーンから「証明書＋秘密鍵」を1つの .p12 として書き出せば、
ペアのずれが構造的に起きない。

```bash
base64 -i dist.p12 | pbcopy       # クリップボードへ
```
→ GitHub Secrets に `IOS_DIST_CERT_P12_BASE64` として登録
→ `IOS_DIST_CERT_PASSWORD` を書き出し時に設定したパスワードに更新

ワークフローは P12 があればそちらを優先するので、コード変更は不要。

**B. CER と PEM を正しいペアで入れ直す**

3枚のうちどれが有効かを確認し、その証明書と対になる秘密鍵を書き出す。

### 3. 確認

```bash
gh workflow run ios-appstore-release.yml
gh run list --workflow=ios-appstore-release.yml --limit 1
```

ログに **`1 identity imported.`** が出れば突破。
（6/23 の成功時はこれが出ていた）

## 関連ファイル

- `.github/workflows/ios-appstore-release.yml` — 証明書処理は 300〜345行目
- `app.config.json` — `ascAppId: 6775201794` / `appleTeamId: 8922HQ842P`
- Apple 証明書一覧: https://developer.apple.com/account/resources/certificates/list
- App Store Connect: https://appstoreconnect.apple.com/apps/6775201794/distribution/info

## 注意

- **急ぎではない。** 旧ドメイン `yukkuri-exosome.link` は生かしてあるので、
  配信中の iOS アプリ（旧版）は壊れていない。
- ★**旧ドメインは、iOS の新版が承認されるまで畳まないこと。**
  畳むと配信中の iOS アプリが白画面になる（Capacitor が server.url で
  本番URLを直接読み込む構成のため）。
