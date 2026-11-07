# knowledge-pack（ゆっくりエクソソーム）

このフォルダは、ゆっくりエクソソーム LINE公式の人格・ガードレール・定型文・ドキュメントです。

- persona.md … 人格・トーン
- guardrails.md … ガードレール
- canned/ … 定型文
- docs/ … 解説ドキュメント

★LINE Bot が実行時に使うのは linebot リポの `knowledge-packs/yukkuri-exosome/` と、
そこから作る `apps/worker/src/services/yukkuri-exosome-knowledge-content.ts` です。
ここを直しただけではボットは変わりません。直すときは linebot 側も同じ内容にそろえてください
（2026-11-06 時点で両者は同一）。
