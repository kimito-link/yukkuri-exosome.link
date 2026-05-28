"""
全HTMLファイルの <head> にファビコン関連タグを直接埋め込むスクリプト。
JSによる挿入だとブラウザのアイコン取得タイミングに間に合わないため。

階層に応じた相対パスを自動計算する。
"""
from pathlib import Path
import re

SRC = Path(__file__).resolve().parent.parent

# 既存の同種タグ識別子（あったら上書き）
MARKER_START = "<!-- ye:favicon:start -->"
MARKER_END = "<!-- ye:favicon:end -->"


def build_favicon_block(rel_to_root: str) -> str:
    """rel_to_root: 例 '' or '../' or '../../' """
    base = rel_to_root
    return f"""{MARKER_START}
    <link rel="icon" type="image/x-icon" href="{base}icons/favicon.ico">
    <link rel="icon" type="image/png" sizes="16x16" href="{base}icons/favicon-16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="{base}icons/favicon-32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="{base}icons/favicon-48.png">
    <link rel="apple-touch-icon" href="{base}icons/apple-touch-icon.png">
    <link rel="manifest" href="{base}manifest.webmanifest">
    <meta name="theme-color" content="#c9899a">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="ゆっくりエクソ">
    <meta property="og:image" content="{base}icons/og-image.jpg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="{base}icons/og-image.jpg">
    {MARKER_END}"""


def calc_rel_to_root(html_path: Path) -> str:
    """SRC からHTMLまでの階層を計算してrelative pathを返す"""
    rel = html_path.parent.relative_to(SRC)
    depth = len(rel.parts) if str(rel) != '.' else 0
    return '../' * depth


def process_html(html_path: Path) -> bool:
    text = html_path.read_text(encoding='utf-8')
    rel_to_root = calc_rel_to_root(html_path)
    block = build_favicon_block(rel_to_root)

    # 既存ブロックがあれば置換
    if MARKER_START in text and MARKER_END in text:
        new_text = re.sub(
            re.escape(MARKER_START) + r'.*?' + re.escape(MARKER_END),
            block,
            text,
            flags=re.DOTALL
        )
        action = 'updated'
    else:
        # <head> 直後に挿入
        if '<head>' in text:
            new_text = text.replace('<head>', '<head>\n    ' + block, 1)
            action = 'inserted'
        else:
            print(f'  ! no <head> tag found in {html_path}')
            return False

    if new_text != text:
        html_path.write_text(new_text, encoding='utf-8')
        print(f'  -> {action}: {html_path.relative_to(SRC)} (rel="{rel_to_root}")')
        return True
    return False


def main():
    html_files = sorted(SRC.rglob('*.html'))
    # node_modules 等は除外
    html_files = [
        p for p in html_files
        if 'node_modules' not in p.parts
        and 'tmp' not in p.parts
    ]
    print(f'Found {len(html_files)} HTML files\n')
    for p in html_files:
        process_html(p)
    print(f'\nDone.')


if __name__ == '__main__':
    main()
