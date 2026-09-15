@../web-ios-android/CLAUDE.md

# yukkuri-exosome.link（Kimito-Linkのゆっくりエクソソーム）

ゆっくり3人組キャラ（りんく・こん太・たぬ姉）とセルフケアを記録するアプリ。
エクソソーム点滴・サプリ・セルフケア習慣を「体内シグナルマップ」で可視化。

正本（全プロジェクト共通ルール）は上記インポートで自動的に読み込まれる
`web-ios-android/CLAUDE.md`。本文はコピーしない。★このプロジェクトは
web-ios-androidキットの多くの金型（TWA・Web→アプリDL導線等）の出典元でもある。

★**上記インポートは、プロジェクトルート外への参照を含むため、このリポジトリで
セッションを開始した際に初回のみ承認ダイアログが出る。断ると以後インポートが無効のまま
黙って進み、ダイアログは二度と出ない。必ず承認する。**

## このリポ固有の注意

- Vanilla JS（フレームワーク不使用）+ localStorage/IndexedDB + PWA。
  Capacitor 8（iOS）、Bubblewrap（Android TWA）。
- `knowledge-pack/`配下にペルソナ・ガードレール・定型文書あり
  （`guardrails.md`, `persona.md`, `canned/`）。
- HANDOFFファイルが複数の日付で分散している（`HANDOFF.md`,
  `HANDOFF-20260824.md`, `HANDOFF-ios-ci-20260905.md`等）。最新状況の把握には
  日付の新しいものを優先し、内容が矛盾する場合は実際のコード・設定を実測で確認する。
- ストア提出の自動化スクリプトが充実（`release:play:*`, `release:appstore:*`）。
