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
 *   - theme        #C9899A（くすみローズ＝ステータスバー/スプラッシュ）
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
