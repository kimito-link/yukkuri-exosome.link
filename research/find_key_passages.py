"""
抽出済みテキストから重要箇所を抜き出す。
PDF は縦書き1文字ずつ抽出されているため、まず連結処理してから検索する。
"""
import sys
import io
import re
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

TXT = Path(__file__).resolve().parent / "ueda_book_text.txt"
OUT = Path(__file__).resolve().parent / "ueda_key_passages.md"

raw = TXT.read_text(encoding='utf-8')
pages = re.split(r'\n===== PAGE (\d+) =====\n', raw)
page_dict = {}
for i in range(1, len(pages), 2):
    try:
        num = int(pages[i])
        page_dict[num] = pages[i + 1]
    except (ValueError, IndexError):
        pass

print(f"Pages parsed: {len(page_dict)}")


def normalize(text):
    lines = text.split('\n')
    out = []
    buf = []
    for ln in lines:
        s = ln.strip()
        if len(s) <= 2 and s:
            buf.append(s)
        else:
            if buf:
                out.append(''.join(buf))
                buf = []
            if s:
                out.append(s)
    if buf:
        out.append(''.join(buf))
    return '\n'.join(out)


normalized_pages = {n: normalize(t) for n, t in page_dict.items()}
all_text = '\n'.join(normalized_pages.values())
print(f"normalized total chars: {len(all_text):,}")

KEYWORDS = [
    'エクソソーム',
    'サイトカイン',
    '培養上清',
    '幹細胞',
    'セルフリー',
    '歯髄',
    '乳歯',
    '美容',
    '老化',
    '肌',
    '副作用',
    '安全',
    '医学の目的',
    '2000',
    '廃棄',
    'IGF',
    'VEGF',
    'HGF',
    'TGF',
    'ALS',
    '点滴',
    '化粧品',
]

with OUT.open('w', encoding='utf-8') as f:
    f.write("# 上田実『驚異の再生医療 培養上清が世界を救う』 重要キーワード抜粋\n\n")
    f.write(f"PDF 276ページ、抽出文字数 {len(all_text):,}\n\n")
    f.write("---\n\n")

    for kw in KEYWORDS:
        snippets = []
        idx = 0
        while True:
            pos = all_text.find(kw, idx)
            if pos < 0:
                break
            start = max(0, pos - 100)
            end = min(len(all_text), pos + len(kw) + 100)
            snippet = all_text[start:end].replace('\n', ' ').strip()
            snippets.append(snippet)
            idx = pos + len(kw)
        if snippets:
            f.write(f"## 「{kw}」 ({len(snippets)}件)\n\n")
            for sn in snippets[:25]:
                f.write(f"- …{sn}…\n")
            f.write("\n")
            print(f"  '{kw}': {len(snippets)} hits")

# サンプルページ
with (Path(__file__).resolve().parent / "ueda_pages_sample.md").open('w', encoding='utf-8') as f:
    f.write("# サンプルページ\n\n")
    for n in [4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 30, 50, 100, 150]:
        if n in normalized_pages:
            f.write(f"## Page {n}\n\n```\n{normalized_pages[n]}\n```\n\n")

print(f"\nSaved: {OUT.name}")
