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
    allowNavigation: [
      'exosome.kimito.link',
      '*.exosome.kimito.link',
    ],
  },
};

export default config;
