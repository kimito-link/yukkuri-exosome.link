"""
ゆっくりエクソソーム App Store スクリーンショット生成 v2

修正点:
- Pillow RGB モードで outline に alpha を渡すと無視される → 不透明な色に統一
- カード背景を背景色と差別化（白 or ローズ薄め）
- テキスト・アウトラインのコントラストを大幅強化
- モック内UIを濃い色で描画
"""
from __future__ import annotations
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[2]
SRC_IMAGES = ROOT / "src" / "images" / "characters"
OUT_DIR = ROOT / "store-assets" / "appstore" / "ios-screenshots"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SS_W, SS_H = 1290, 2796

# ── ブランドカラー（全て不透明・高コントラスト版）──
BG_COLOR      = (255, 250, 243)   # クリームベージュ
CARD_WHITE    = (255, 255, 255)   # カード背景（白）
CARD_ROSE     = (245, 228, 233)   # カード背景（薄ローズ）
BG_ROSE       = (201, 137, 154)   # ローズ（メインアクセント）
BG_ROSE_DARK  = (165, 100, 118)   # ローズ濃い版
ACCENT_GOLD   = (180, 145,  80)   # ゴールド
DARK_TEXT     = ( 40,  32,  28)   # 濃い茶黒
MID_TEXT      = (110,  95,  88)   # 中間テキスト
PEARL_NAVY    = ( 31,  58, 110)   # 紺
PEARL_ORANGE  = (199, 107,  31)   # オレンジ
PEARL_TEAL    = ( 60, 140, 130)   # ティール
DIVIDER       = (220, 205, 210)   # 区切り線（ローズグレー）

PEARL_COLORS  = [PEARL_NAVY, PEARL_ORANGE, ACCENT_GOLD, PEARL_TEAL, BG_ROSE_DARK, PEARL_NAVY]


def find_font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont:
    bold_candidates = [
        r"C:\Windows\Fonts\YuGothB.ttc",
        r"C:\Windows\Fonts\meiryob.ttc",
        r"C:\Windows\Fonts\msgothic.ttc",
    ]
    reg_candidates = [
        r"C:\Windows\Fonts\YuGothR.ttc",
        r"C:\Windows\Fonts\meiryo.ttc",
        r"C:\Windows\Fonts\msgothic.ttc",
    ]
    candidates = bold_candidates if weight == "bold" else reg_candidates
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except OSError:
            continue
    return ImageFont.load_default()


def make_background() -> Image.Image:
    """クリームベージュ地に上部ローズグラデーション"""
    bg = Image.new("RGB", (SS_W, SS_H), BG_COLOR)
    # ローズを上1/3に重ねる（RGBA合成）
    overlay = Image.new("RGBA", (SS_W, SS_H), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    for y in range(SS_H // 3):
        t = 1.0 - y / (SS_H / 3)
        a = int(70 * t * t)
        odraw.line([(0, y), (SS_W, y)],
                   fill=(BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], a))
    bg_rgba = bg.convert("RGBA")
    bg_rgba.alpha_composite(overlay)
    return bg_rgba.convert("RGB")


def load_character(filename: str) -> Image.Image:
    return Image.open(SRC_IMAGES / filename).convert("RGBA")


def trim_alpha(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def fit_height(img: Image.Image, target_h: int) -> Image.Image:
    w, h = img.size
    return img.resize((int(w * target_h / h), target_h), Image.LANCZOS)


def draw_pearl(canvas: Image.Image, cx: int, cy: int, radius: int, base_color: tuple):
    """グラデーション風パール（同心円で近似）"""
    draw = ImageDraw.Draw(canvas)
    steps = 8
    for i in range(steps, 0, -1):
        t = i / steps
        r_c = int(base_color[0] + (255 - base_color[0]) * (1 - t) * 0.45)
        g_c = int(base_color[1] + (255 - base_color[1]) * (1 - t) * 0.45)
        b_c = int(base_color[2] + (255 - base_color[2]) * (1 - t) * 0.45)
        rad = max(1, int(radius * t))
        draw.ellipse([(cx - rad, cy - rad), (cx + rad, cy + rad)],
                     fill=(r_c, g_c, b_c))


def draw_phone_mockup(canvas: Image.Image, cx: int, cy: int, phone_w: int = 860):
    """スマホフレームを描き、内部領域を返す。
    アスペクト比を 1:1.78 (≈16:9) に抑えてUIが詰まるようにする。"""
    phone_h = int(phone_w * 1.78)
    left   = cx - phone_w // 2
    top    = cy - phone_h // 2
    right  = cx + phone_w // 2
    bottom = cy + phone_h // 2
    draw = ImageDraw.Draw(canvas)
    # シャドウ
    draw.rounded_rectangle(
        [(left + 14, top + 14), (right + 14, bottom + 14)],
        radius=58, fill=(175, 158, 163))
    # 外枠
    draw.rounded_rectangle([(left, top), (right, bottom)],
                            radius=56, fill=(38, 36, 40))
    # 画面
    border = 14
    il, it, ir, ib = left + border, top + border, right - border, bottom - border
    draw.rounded_rectangle([(il, it), (ir, ib)],
                            radius=44, fill=BG_COLOR)
    # Dynamic Island
    di_w, di_h = 170, 30
    draw.rounded_rectangle(
        [(cx - di_w // 2, it + 16), (cx + di_w // 2, it + 16 + di_h)],
        radius=15, fill=(38, 36, 40))
    return (il, it, ir, ib)


# ── モック画面の描画 ──────────────────────────────────

def render_today_screen(canvas: Image.Image, area: tuple):
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx = (l + r) // 2
    h = b - t  # 使える高さ

    draw.text((cx, t + int(h * 0.055)), "今日のシグナル",
              font=find_font(38, "bold"), fill=DARK_TEXT, anchor="mm")
    draw.line([(l + 40, t + int(h * 0.085)), (r - 40, t + int(h * 0.085))],
              fill=DIVIDER, width=2)

    # 体内マップ（高さの中央より少し上）
    map_cy = t + int(h * 0.38)
    map_cx = cx
    map_r = int(min((r - l) * 0.30, h * 0.22))
    draw.ellipse(
        [(map_cx - map_r, map_cy - map_r), (map_cx + map_r, map_cy + map_r)],
        outline=BG_ROSE, width=3, fill=(250, 242, 245))
    inner_r = int(map_r * 0.27)
    draw.ellipse(
        [(map_cx - inner_r, map_cy - inner_r), (map_cx + inner_r, map_cy + inner_r)],
        fill=CARD_WHITE, outline=DIVIDER, width=2)
    draw.text((map_cx, map_cy), "体内\nマップ",
              font=find_font(20, "bold"), fill=BG_ROSE_DARK, anchor="mm")

    parts = ["髪", "美肌", "目元", "循環", "腸", "筋"]
    for i, part in enumerate(parts):
        ang = -math.pi / 2 + math.pi * 2 * i / 6
        px = int(map_cx + map_r * math.cos(ang))
        py = int(map_cy + map_r * math.sin(ang))
        draw_pearl(canvas, px, py, 24, PEARL_COLORS[i])
        lx = px + int(40 * math.cos(ang))
        ly = py + int(40 * math.sin(ang))
        draw.text((lx, ly), part, font=find_font(22, "bold"), fill=DARK_TEXT, anchor="mm")

    # クエスト欄
    q_top = t + int(h * 0.62)
    draw.text((cx, q_top), "本日のクエスト",
              font=find_font(32, "bold"), fill=DARK_TEXT, anchor="mm")
    row_h = int(h * 0.10)
    for i, q in enumerate(["セルフケアを記録", "クイズに挑戦", "アドバイスを読む"]):
        qy = q_top + int(h * 0.06) + i * row_h
        draw.rounded_rectangle(
            [(l + 50, qy - 30), (r - 50, qy + 30)],
            radius=18, fill=CARD_WHITE, outline=DIVIDER, width=2)
        draw_pearl(canvas, l + 90, qy, 18, PEARL_COLORS[i])
        draw.text((l + 120, qy), f" {q}",
                  font=find_font(28, "regular"), fill=DARK_TEXT, anchor="lm")


def render_care_screen(canvas: Image.Image, area: tuple):
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx = (l + r) // 2
    h = b - t

    draw.text((cx, t + int(h * 0.055)), "セルフケア",
              font=find_font(38, "bold"), fill=DARK_TEXT, anchor="mm")
    draw.text((cx, t + int(h * 0.090)), "6つの部位・毎日ひとつ",
              font=find_font(26, "regular"), fill=MID_TEXT, anchor="mm")
    draw.line([(l + 40, t + int(h * 0.115)), (r - 40, t + int(h * 0.115))],
              fill=DIVIDER, width=2)

    cards = ["髪エクソ", "美肌エクソ", "目元エクソ", "循環エクソ", "腸内エクソ", "筋肉エクソ"]
    card_w = (r - l - 80) // 2 - 12
    card_h = int(h * 0.27)
    sy = t + int(h * 0.13)
    gap = int(h * 0.015)
    for i, name in enumerate(cards):
        row, col = divmod(i, 2)
        x = l + 40 + col * (card_w + 24)
        y = sy + row * (card_h + gap)
        bg = CARD_WHITE if i % 2 == 0 else CARD_ROSE
        draw.rounded_rectangle(
            [(x, y), (x + card_w, y + card_h)],
            radius=22, fill=bg, outline=BG_ROSE_DARK, width=2)
        pearl_y = y + int(card_h * 0.38)
        draw_pearl(canvas, x + card_w // 2, pearl_y, 36, PEARL_COLORS[i])
        draw.text((x + card_w // 2, y + int(card_h * 0.72)),
                  name, font=find_font(28, "bold"), fill=DARK_TEXT, anchor="mm")
        draw.text((x + card_w // 2, y + int(card_h * 0.91)),
                  "→", font=find_font(26, "bold"), fill=BG_ROSE_DARK, anchor="mm")


def render_boost_screen(canvas: Image.Image, area: tuple):
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx = (l + r) // 2
    h = b - t

    draw.text((cx, t + int(h * 0.055)), "Boost",
              font=find_font(38, "bold"), fill=DARK_TEXT, anchor="mm")
    draw.text((cx, t + int(h * 0.090)), "サプリ・点滴を記録",
              font=find_font(26, "regular"), fill=MID_TEXT, anchor="mm")
    draw.line([(l + 40, t + int(h * 0.115)), (r - 40, t + int(h * 0.115))],
              fill=DIVIDER, width=2)

    items = [
        ("NMN", "抗加齢"),
        ("コラーゲン", "美肌"),
        ("高濃度ビタミンC", "免疫"),
        ("レスベラトロール", "循環"),
        ("プラセンタ", "再生"),
        ("グルタチオン", "解毒"),
    ]
    row_h = int(h * 0.128)
    sy = t + int(h * 0.135)
    for i, (item, tag) in enumerate(items):
        y = sy + i * row_h
        cy_row = y + row_h // 2 - 4
        draw.rounded_rectangle(
            [(l + 40, y + 6), (r - 40, y + row_h - 6)],
            radius=18, fill=CARD_WHITE, outline=DIVIDER, width=2)
        draw_pearl(canvas, l + 88, cy_row, 22, PEARL_COLORS[i % len(PEARL_COLORS)])
        draw.text((l + 124, cy_row), item,
                  font=find_font(28, "bold"), fill=DARK_TEXT, anchor="lm")
        tag_x1, tag_x2 = r - 136, r - 54
        draw.rounded_rectangle(
            [(tag_x1, cy_row - 22), (tag_x2, cy_row + 22)],
            radius=12, fill=BG_ROSE)
        draw.text(((tag_x1 + tag_x2) // 2, cy_row),
                  tag, font=find_font(20, "bold"), fill=CARD_WHITE, anchor="mm")
        draw.text((r - 46, cy_row), "+",
                  font=find_font(38, "bold"), fill=BG_ROSE_DARK, anchor="mm")


def render_garden_screen(canvas: Image.Image, area: tuple):
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx = (l + r) // 2
    h = b - t

    draw.text((cx, t + int(h * 0.055)), "Garden",
              font=find_font(38, "bold"), fill=DARK_TEXT, anchor="mm")
    draw.text((cx, t + int(h * 0.090)), "続けると細胞が育つ",
              font=find_font(26, "regular"), fill=MID_TEXT, anchor="mm")
    draw.line([(l + 40, t + int(h * 0.115)), (r - 40, t + int(h * 0.115))],
              fill=DIVIDER, width=2)

    # メイン細胞（画面中央）
    cell_cx = cx
    cell_cy = t + int(h * 0.46)
    cell_r = int(min((r - l) * 0.28, h * 0.24))
    for rs in range(cell_r, 0, -8):
        tf = rs / cell_r
        cr = int(BG_ROSE[0] + (255 - BG_ROSE[0]) * (1 - tf) * 0.65)
        cg = int(BG_ROSE[1] + (255 - BG_ROSE[1]) * (1 - tf) * 0.65)
        cb = int(BG_ROSE[2] + (255 - BG_ROSE[2]) * (1 - tf) * 0.65)
        draw.ellipse(
            [(cell_cx - rs, cell_cy - rs), (cell_cx + rs, cell_cy + rs)],
            fill=(cr, cg, cb))
    nuc_r = int(cell_r * 0.27)
    draw.ellipse(
        [(cell_cx - nuc_r, cell_cy - nuc_r), (cell_cx + nuc_r, cell_cy + nuc_r)],
        fill=BG_ROSE_DARK)
    draw.text((cell_cx, cell_cy), "Lv.7",
              font=find_font(28, "bold"), fill=CARD_WHITE, anchor="mm")

    # 周囲バッジ（cell_r から相対距離で配置）
    dist = int(cell_r * 1.45)
    badge_positions = [(-dist, -int(dist * 0.4)),
                       (dist,  -int(dist * 0.5)),
                       (-int(dist * 0.9),  int(dist * 0.5)),
                       (dist,   int(dist * 0.45))]
    badge_labels = ["新芽", "つぼみ", "花", "実"]
    badge_colors = [PEARL_TEAL, PEARL_ORANGE, BG_ROSE_DARK, ACCENT_GOLD]
    badge_r = int(cell_r * 0.22)
    for (bx_off, by_off), label, col in zip(badge_positions, badge_labels, badge_colors):
        bx = cell_cx + bx_off
        by = cell_cy + by_off
        draw.ellipse([(bx - badge_r, by - badge_r), (bx + badge_r, by + badge_r)],
                     fill=CARD_WHITE, outline=col, width=3)
        draw.text((bx, by), label,
                  font=find_font(24, "bold"), fill=col, anchor="mm")

    # EP バー
    ep_y = t + int(h * 0.80)
    bar_x1, bar_x2 = l + 80, r - 80
    draw.rounded_rectangle(
        [(bar_x1, ep_y - 18), (bar_x2, ep_y + 18)],
        radius=18, fill=DIVIDER)
    bar_w = int((bar_x2 - bar_x1) * 0.62)
    draw.rounded_rectangle(
        [(bar_x1, ep_y - 18), (bar_x1 + bar_w, ep_y + 18)],
        radius=18, fill=ACCENT_GOLD)
    draw.text((cx, ep_y + 48), "EP 234 / 400",
              font=find_font(28, "bold"), fill=DARK_TEXT, anchor="mm")

    # ステータス行（下部）
    stat_y = t + int(h * 0.91)
    for i, (label, val) in enumerate([("記録", "23日"), ("連続", "7日"), ("進化", "4回")]):
        sx = l + 80 + i * int((r - l - 160) / 3) + int((r - l - 160) / 6)
        draw.text((sx, stat_y), f"{label}\n{val}",
                  font=find_font(22, "bold"), fill=DARK_TEXT, anchor="mm")


def render_me_screen(canvas: Image.Image, area: tuple):
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx = (l + r) // 2
    h = b - t

    draw.text((cx, t + int(h * 0.055)), "Me",
              font=find_font(38, "bold"), fill=DARK_TEXT, anchor="mm")
    draw.text((cx, t + int(h * 0.090)), "あなたの記録",
              font=find_font(26, "regular"), fill=MID_TEXT, anchor="mm")
    draw.line([(l + 40, t + int(h * 0.115)), (r - 40, t + int(h * 0.115))],
              fill=DIVIDER, width=2)

    stats = [
        ("連続記録", "7", "日", PEARL_TEAL),
        ("累計記録", "23", "日", BG_ROSE_DARK),
        ("EP", "234", "pt", ACCENT_GOLD),
        ("レベル", "7", "Lv", PEARL_NAVY),
    ]
    card_h = int(h * 0.155)
    sy = t + int(h * 0.135)
    gap = int(h * 0.018)
    for i, (label, value, unit, col) in enumerate(stats):
        y = sy + i * (card_h + gap)
        draw.rounded_rectangle(
            [(l + 40, y), (r - 40, y + card_h)],
            radius=20, fill=CARD_WHITE, outline=DIVIDER, width=2)
        band_w = 36
        draw.rounded_rectangle(
            [(l + 40, y), (l + 40 + band_w, y + card_h)],
            radius=20, fill=col)
        mid_y = y + card_h // 2
        draw.text((l + 96, mid_y), label,
                  font=find_font(28, "regular"), fill=MID_TEXT, anchor="lm")
        draw.text((r - 56, mid_y), f"{value} {unit}",
                  font=find_font(46, "bold"), fill=DARK_TEXT, anchor="rm")

    # フッターバナー
    fy = sy + 4 * (card_h + gap) + int(h * 0.02)
    draw.rounded_rectangle(
        [(l + 50, fy), (r - 50, fy + int(h * 0.10))],
        radius=18, fill=CARD_ROSE, outline=BG_ROSE_DARK, width=2)
    draw.text((cx, fy + int(h * 0.032)), "記録は端末の中だけ",
              font=find_font(28, "bold"), fill=BG_ROSE_DARK, anchor="mm")
    draw.text((cx, fy + int(h * 0.070)), "アカウント不要・課金なし",
              font=find_font(24, "regular"), fill=MID_TEXT, anchor="mm")


# ── スクリーン定義 ──────────────────────────────────

SCREENS = [
    {
        "key": "iphone-67-1-today",
        "headline": ["毎日の体のシグナルを、", "3人組と一緒に。"],
        "char": "link/link-yukkuri-smile-mouth-open.png",
        "char_position": "left",
        "render": render_today_screen,
    },
    {
        "key": "iphone-67-2-care",
        "headline": ["6つのケアを、", "毎日ひとつずつ。"],
        "char": "tanunee/tanuki-yukkuri-smile-mouth-open.png",
        "char_position": "right",
        "render": render_care_screen,
    },
    {
        "key": "iphone-67-3-boost",
        "headline": ["16種類のサプリ・点滴を、", "ひと目で管理。"],
        "char": "konta/kitsune-yukkuri-smile-mouth-open.png",
        "char_position": "left",
        "render": render_boost_screen,
    },
    {
        "key": "iphone-67-4-garden",
        "headline": ["続けるほど、", "3人組と細胞が育つ。"],
        "char": "link/link-yukkuri-blink-mouth-open.png",
        "char_position": "right",
        "render": render_garden_screen,
    },
    {
        "key": "iphone-67-5-me",
        "headline": ["記録は、", "あなたの端末の中だけ。"],
        "char": "tanunee/tanuki-yukkuri-half-eyes-mouth-closed.png",
        "char_position": "left",
        "render": render_me_screen,
    },
]


def compose_screenshot(spec: dict) -> Image.Image:
    canvas = make_background().convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    # キャッチコピー（上部）
    head_font = find_font(76, "bold")
    head_y = 190
    for i, line in enumerate(spec["headline"]):
        draw.text((SS_W // 2, head_y + i * 108), line,
                  font=head_font, fill=DARK_TEXT, anchor="mm")

    # スマホモック — キャラの上に空間を残しつつ画面を広く使う
    phone_cx = SS_W // 2
    phone_cy = int(SS_H * 0.49)
    area = draw_phone_mockup(canvas, phone_cx, phone_cy, phone_w=860)
    spec["render"](canvas, area)

    # キャラクター（下部）
    char = trim_alpha(load_character(spec["char"]))
    char = fit_height(char, 400)
    char_y = SS_H - char.height - 60
    if spec["char_position"] == "left":
        char_x = 60
    else:
        char_x = SS_W - char.width - 60
    canvas.paste(char, (char_x, char_y), char)

    # フッター
    draw.text((SS_W // 2, SS_H - 44), "Kimito-Link",
              font=find_font(30, "regular"), fill=MID_TEXT, anchor="mm")

    return canvas.convert("RGB")


def main():
    for spec in SCREENS:
        print(f"-- {spec['key']} --")
        img = compose_screenshot(spec)
        out = OUT_DIR / f"{spec['key']}.png"
        img.save(out, "PNG", optimize=True)
        print(f"   saved → {out.relative_to(ROOT)}  {img.size}")


if __name__ == "__main__":
    main()
