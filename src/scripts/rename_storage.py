"""
common.js の 'Storage' は browser builtin (window.Storage) と衝突する可能性あり。
全ファイルで 'Storage' → 'YEStorage' にリネーム。
"""
from pathlib import Path
import re

SRC = Path(__file__).resolve().parent.parent / 'js'

# 単語境界で Storage を YEStorage に置換（"YEStorage" 等の既存形は維持）
# JSのStorageは: const Storage / Storage.get / Storage.set / Storage.remove
PATTERN = re.compile(r'\bStorage\b')

for js in sorted(SRC.glob('*.js')):
    text = js.read_text(encoding='utf-8')
    new = PATTERN.sub('YEStorage', text)
    if new != text:
        js.write_text(new, encoding='utf-8')
        print(f'  -> {js.name}')
print('done.')
