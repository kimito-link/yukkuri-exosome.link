/**
 * Play Console / App Store / Web 用アセットを一括生成する。
 *
 * 実装方針:
 *   ゆっくりエクソソームは Vanilla JS PWA + ローカルキャラ画像（透過 PNG）が
 *   既にリポジトリに揃っているため、`scripts/icon-gen/make_icons.py`（Pillow）が
 *   絵柄統一感を最も正確に保ったまま全アセットを生成できる。
 *   この `.mjs` はその Python スクリプトを呼ぶラッパーで、`npm run assets:store`
 *   から呼ばれて他プラットフォームと同じ UX を提供する。
 *
 * 生成物（最終）:
 *   store-assets/source/icon-*-{16..1024}.png   各サイズマスター（3バリアント分）
 *   store-assets/appstore/app-icon-1024.png     iOS App Store マスター
 *   store-assets/play/icon-512.png              Play Store アイコン
 *   store-assets/play/feature-graphic.png       Play フィーチャーグラフィック
 *   src/icons/icon-{192,512}.png                PWA
 *   src/icons/apple-touch-icon.png              iOS ホーム画面
 *   src/icons/favicon-{16,32,48,64}.png         Web favicon
 *   src/icons/favicon.ico                       multi-size ICO
 *   src/icons/og-image.jpg                      OGP 1200×630
 *   android-twa/store_icon.png                  Bubblewrap TWA
 *
 * CLI:
 *   npm run assets:store                 # 全部
 *   npm run assets:store -- --only A     # りんく単体だけ
 *   npm run assets:store -- --only B     # 体内シグナルマップだけ
 *   npm run assets:store -- --only C     # 3人組だけ
 *   npm run assets:store -- --master B   # Bをアプリアイコンマスターに
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PY_SCRIPT = path.join(ROOT, 'scripts', 'icon-gen', 'make_icons.py');

// CLI 引数を Python にそのまま透過
const args = process.argv.slice(2);

console.log(`[assets:store] python ${path.relative(ROOT, PY_SCRIPT)} ${args.join(' ')}`);

// Windows / macOS / Linux で Python ランチャー名は変わる
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

const child = spawn(pythonCmd, [PY_SCRIPT, ...args], {
  cwd: ROOT,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`[assets:store] FAILED (exit ${code})`);
    console.error(`[assets:store] Hint: Pillow が必要です → pip install Pillow`);
    process.exit(code ?? 1);
  }
  console.log('[assets:store] ✓ Done');
});

child.on('error', (err) => {
  console.error(`[assets:store] failed to spawn Python: ${err.message}`);
  console.error(`[assets:store] Hint: Python 3.10+ が PATH に必要です`);
  process.exit(1);
});
