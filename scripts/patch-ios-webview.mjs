#!/usr/bin/env node
/**
 * 次の iOS ビルドでだけ効く WKWebView の調整。
 * ios/ は gitignore なので、cap add / cap copy のあとに実行する。
 * いま App Store に出ている 0.2.0 には入らない（再申請が必要）。
 *
 * - ピンチ拡大を止める（横スワイプで画面が拡大してはみ出すのを、ネイティブ側でも止める）
 * - ページ読み込み前に sessionStorage へ ye_shell=ios と版を入れる
 *   （Web の「App Store に新しいバージョンがあります」が比較できる）
 *
 * YE_IOS_ROOT を渡すと ios/App の代わりにそこを見る（テスト用）。
 * ディレクトリが無ければ何もしない（ローカルで ios を作っていないとき）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = process.env.YE_IOS_ROOT
  ? path.resolve(process.env.YE_IOS_ROOT)
  : path.join(repo, 'ios', 'App');

const storyboardPath = path.join(root, 'App', 'Base.lproj', 'Main.storyboard');
const pbxPath = path.join(root, 'App.xcodeproj', 'project.pbxproj');
const swiftPath = path.join(root, 'App', 'YeBridgeViewController.swift');

const SWIFT = `import UIKit
import WebKit
import Capacitor

/// ゆっくりエクソソームの WKWebView。
/// ピンチ拡大を止め、起動時にシェルの版をページへ渡す。
class YeBridgeViewController: CAPBridgeViewController {
    private var yeDidInstallShellScript = false

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        applyYeWebViewLocks()
    }

    override open func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        applyYeWebViewLocks()
    }

    private func applyYeWebViewLocks() {
        guard let webView = self.webView else { return }
        let scroll = webView.scrollView
        scroll.pinchGestureRecognizer?.isEnabled = false
        scroll.minimumZoomScale = 1
        scroll.maximumZoomScale = 1
        scroll.bouncesZoom = false
        scroll.alwaysBounceHorizontal = false
        scroll.showsHorizontalScrollIndicator = false
        installShellScript(on: webView)
    }

    private func installShellScript(on webView: WKWebView) {
        if yeDidInstallShellScript { return }
        yeDidInstallShellScript = true
        let raw = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let version = raw.filter { $0.isNumber || $0 == "." }
        let verLiteral = version.isEmpty ? "null" : "\\"" + version + "\\""
        let source = """
        try {
          sessionStorage.setItem('ye_shell', 'ios');
          var v = \\(verLiteral);
          if (v) sessionStorage.setItem('ye_shell_ver', v);
        } catch (e) {}
        """
        let script = WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        webView.configuration.userContentController.addUserScript(script)
    }
}
`;

const FILE_REF = 'A1E0B0011FED79650016851F';
const BUILD_REF = 'A1E0B0021FED79650016851F';

function fail(message) {
  console.error(`[patch-ios-webview] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(storyboardPath) || !fs.existsSync(pbxPath)) {
  console.log(`[patch-ios-webview] skipped; ${root} is not an iOS app project`);
  process.exit(0);
}

let story = fs.readFileSync(storyboardPath, 'utf8');
const storyFrom = 'customClass="CAPBridgeViewController" customModule="Capacitor"';
const storyTo = 'customClass="YeBridgeViewController" customModule="App"';
if (story.includes(storyTo)) {
  // already patched
} else if (story.includes(storyFrom)) {
  story = story.replace(storyFrom, storyTo);
  fs.writeFileSync(storyboardPath, story);
} else {
  fail(`Main.storyboard has neither CAPBridgeViewController nor YeBridgeViewController (${storyboardPath})`);
}

fs.writeFileSync(swiftPath, SWIFT);

let pbx = fs.readFileSync(pbxPath, 'utf8');
if (!pbx.includes('YeBridgeViewController.swift')) {
  if (!pbx.includes('AppDelegate.swift in Sources')) {
    fail(`project.pbxproj has no AppDelegate.swift source entry (${pbxPath})`);
  }
  const buildLine = '\t\t504EC3081FED79650016851F /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 504EC3071FED79650016851F /* AppDelegate.swift */; };';
  const fileLine = '\t\t504EC3071FED79650016851F /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };';
  const groupLine = '\t\t\t\t504EC3071FED79650016851F /* AppDelegate.swift */,';
  const sourcesLine = '\t\t\t\t504EC3081FED79650016851F /* AppDelegate.swift in Sources */,';
  if (!pbx.includes(buildLine) || !pbx.includes(fileLine) || !pbx.includes(groupLine) || !pbx.includes(sourcesLine)) {
    fail('project.pbxproj layout is not the Capacitor template this patch knows');
  }
  pbx = pbx.replace(
    buildLine,
    buildLine + '\n' +
      `\t\t${BUILD_REF} /* YeBridgeViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${FILE_REF} /* YeBridgeViewController.swift */; };`
  );
  pbx = pbx.replace(
    fileLine,
    fileLine + '\n' +
      `\t\t${FILE_REF} /* YeBridgeViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = YeBridgeViewController.swift; sourceTree = "<group>"; };`
  );
  pbx = pbx.replace(
    groupLine,
    groupLine + '\n' +
      `\t\t\t\t${FILE_REF} /* YeBridgeViewController.swift */,`
  );
  pbx = pbx.replace(
    sourcesLine,
    sourcesLine + '\n' +
      `\t\t\t\t${BUILD_REF} /* YeBridgeViewController.swift in Sources */,`
  );
  fs.writeFileSync(pbxPath, pbx);
}

console.log(`[patch-ios-webview] patched ${root}`);
