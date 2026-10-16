import type { CapacitorConfig } from '@capacitor/cli';

/**
 * iOS / Android Capacitor シェル（fujisan-cleanと同じ構成）。
 *
 * 方式: server.url で本番Webを読み込む「リモート読込型」。
 * - Web は Vercel に常時デプロイ済み (https://exosome.kimito.link)
 * - iOS / Android のネイティブシェルは WKWebView / WebView で
 *   本番URLをそのまま表示するだけのラッパー
 *
 * 配色は「上品ベージュ × くすみローズ」のブランドに合わせる:
 *   - backgroundColor #FFFAF3FF（クリーム背景＝白フラッシュ防止）
 *   - theme_color（PWA manifest / meta theme-color）も同じ #FFFAF3 に揃える。
 *     くすみローズ #C9899A はブランド色としてボタン等に使うが、ステータスバー色には使わない
 *     （起動画面→本体で色が往復して見えるため。2026-10-05 Android 実機で観察）
 *
 * iOS の App-Bound Domains 制限まわりの許可設定（allowNavigation /
 * limitsNavigationsToAppBoundDomains / iosScheme）も fujisan-cleanに合わせて
 * 明示し、リモート読込が拒否されないようにする。
 */
const config: CapacitorConfig = {
  appId: 'com.kimito.link.yukkuriexosome',
  appName: 'ゆっくりエクソソーム',
  webDir: 'www',
  backgroundColor: '#FFFAF3FF',
  ios: {
    contentInset: 'always',
    scheme: 'yukkuriexosome',
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: '#FFFAF3FF',
  },
  android: {
    backgroundColor: '#FFFAF3FF',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      launchFadeOutDuration: 300,
      backgroundColor: '#FFFAF3FF',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  server: {
    url: 'https://exosome.kimito.link',
    cleartext: false,
    hostname: 'exosome.kimito.link',
    androidScheme: 'https',
    iosScheme: 'https',
    // ★ログインをアプリ内で完結させるための許可リスト（2026-10-16 の実損で追加）。
    //   allowNavigation に【無い】ドメインへ遷移すると iOS は外部 Safari を開く。
    //   ログインは認証プロバイダのドメインへ遷移するので、ここが欠けていると
    //   「ログインを押した瞬間にアプリの外へ出る」。外に出ると Origin が付かず、
    //   Clerk は {"errors":[{"message":"Unauthorized request"}]} を返す。
    //   ⟹ 利用者には「ログインしているのに弾かれる」「ウェブとアプリがごっちゃ」に見える。
    //
    //   ★これは App Store Guideline 4（#4 ログインで外部ブラウザに飛ぶ）の却下理由。
    //     kimito.link は 2026-06-30 に実際に却下され、許可リストを増やして直した。
    //   ★Google(accounts.google.com) は足さない。Google 側が埋め込み WebView からの
    //     OAuth を disallowed_useragent でブロックするため、足しても成立しない。
    //   検査: node scripts/check-auth-domains-allowed.mjs
    allowNavigation: [
      'exosome.kimito.link',
      '*.exosome.kimito.link',
      'kimito.link',
      '*.kimito.link',        // ← clerk.kimito.link（Clerk Frontend API）を含む
      'x.com',
      '*.x.com',
      'twitter.com',
      '*.twitter.com',
      'api.twitter.com',
      '*.clerk.accounts.dev',
      'appleid.apple.com',
      '*.apple.com',
    ],
  },
};

export default config;
