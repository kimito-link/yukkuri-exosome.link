"""
上田実先生の『驚異の再生医療 培養上清が世界を救う』PDF からテキストを抽出。
- ページ数の確認
- 目次っぽい部分の抽出
- 全文をテキストファイルに保存（OCRが必要なPDFか判定）
"""
import sys
import io
from pathlib import Path

# UTF-8 stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import fitz  # PyMuPDF

# 候補から実在するファイルを選ぶ
_candidates = [
    r"D:\download\驚異の再生医療  培養上清が世界を救う　上田実 (1).pdf",
    r"D:\download\驚異の再生医療  培養上清が世界を救う　上田実.pdf",
]
PDF_PATH = None
for c in _candidates:
    if Path(c).exists():
        PDF_PATH = Path(c)
        break
if PDF_PATH is None:
    # globで探す
    found = list(Path(r"D:\download").glob("*驚異の再生医療*.pdf"))
    if found:
        PDF_PATH = found[0]
    else:
        raise SystemExit("PDF not found in D:\\download")
OUT_DIR = Path(__file__).resolve().parent
OUT_TXT = OUT_DIR / "ueda_book_text.txt"
OUT_TOC = OUT_DIR / "ueda_book_toc.txt"

print(f"[1/4] Opening PDF: {PDF_PATH.name}")
doc = fitz.open(str(PDF_PATH))
print(f"  pages: {len(doc)}")
print(f"  size: {PDF_PATH.stat().st_size / 1024 / 1024:.1f} MB")

# 目次（PDFのbookmark）取得
print("\n[2/4] Extracting table of contents...")
toc = doc.get_toc()
if toc:
    print(f"  found {len(toc)} entries")
    with OUT_TOC.open('w', encoding='utf-8') as f:
        for level, title, page in toc:
            line = f"{'  ' * (level - 1)}{title}  ... p.{page}"
            print(line)
            f.write(line + "\n")
else:
    print("  no PDF bookmarks found")

# 全文テキスト抽出
print("\n[3/4] Extracting full text...")
total_chars = 0
empty_pages = 0
with OUT_TXT.open('w', encoding='utf-8') as f:
    for i in range(len(doc)):
        page = doc[i]
        text = page.get_text()
        if not text.strip():
            empty_pages += 1
        else:
            total_chars += len(text)
        f.write(f"\n===== PAGE {i + 1} =====\n")
        f.write(text)
print(f"  total characters: {total_chars:,}")
print(f"  empty pages: {empty_pages} / {len(doc)}")

# サンプル：最初の2ページの抽出結果
print("\n[4/4] First-pages preview:")
for i in range(min(3, len(doc))):
    page = doc[i]
    text = page.get_text()
    print(f"  --- page {i+1} ({len(text)} chars) ---")
    print(text[:600])

doc.close()
print(f"\nDone. Saved to: {OUT_TXT}")
