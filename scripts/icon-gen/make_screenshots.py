"""
ゆっくりエクソソーム App Store スクリーンショット生成

iPhone 6.7" / 6.5" 用の 1290×2796 PNG を5枚生成する。
各画面：上部にキャッチコピー、中央にスマホモック+各画面のミニUI、下部に3キャラ
ブランドガイドに沿った上品ベージュ × くすみローズの世界観。

出力先: store-assets/appstore/ios-screenshots/
"""
from __future__ import annotations
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC_IMAGES = ROOT / "src" / "images" / "characters"
OUT_DIR = ROOT / "store-assets" / "appstore" / "ios-screenshots"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# iPhone 6.7" スクショサイズ
SS_W, SS_H = 1290, 2796

# ブランドカラー
BG_COLOR = (255, 250, 243)
BG_ROSE = (201, 137, 154)
ACCENT_GOLD = (201, 169, 110)
DARK_TEXT = (46, 38, 34)
MID_TEXT = (138, 125, 118)
PEARL_NAVY = (31, 58, 110)
PEARL_ORANGE = (199, 107, 31)
PEARL_WHITE = (232, 232, 236)

# フォント取得
def find_font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont:
    candidates_serif = [
        r"C:\Windows\Fonts\YuMincho.ttc",
        r"C:\Windows\Fonts\msmincho.ttc",
    ]
    candidates_sans = [
        r"C:\Windows\Fonts\YuGothB.ttc" if weight == "bold" else r"C:\Windows\Fonts\YuGothR.ttc",
        r"C:\Windows\Fonts\meiryob.ttc" if weight == "bold" else r"C:\Windows\Fonts\meiryo.ttc",
        r"C:\Windows\Fonts\msgothic.ttc",
    ]
    candidates = candidates_serif if weight == "serif" else candidates_sans
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except OSError:
            continue
    return ImageFont.load_default()


def make_background(w=SS_W, h=SS_H) -> Image.Image:
    """クリームベージュ + 上から下に薄ローズグラデ"""
    bg = Image.new("RGB", (w, h), BG_COLOR)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    # 上にローズの霞、下に向かって透明に
    for y in range(0, h):
        t = 1 - (y / h)  # 上が1、下が0
        alpha = int(50 * t * t)
        draw.line([(0, y), (w, y)], fill=(BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], alpha))
    bg.paste(overlay, (0, 0), overlay)
    return bg


def load_character(filename: str) -> Image.Image:
    p = SRC_IMAGES / filename
    return Image.open(p).convert("RGBA")


def trim_alpha(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def fit_height(img: Image.Image, target_h: int) -> Image.Image:
    w, h = img.size
    new_w = int(w * target_h / h)
    return img.resize((new_w, target_h), Image.LANCZOS)


def draw_pearl(canvas: Image.Image, cx: int, cy: int, radius: int, base_color: tuple):
    draw = ImageDraw.Draw(canvas)
    steps = 10
    for i in range(steps, 0, -1):
        t = i / steps
        r_c = int(base_color[0] + (255 - base_color[0]) * (1 - t) * 0.5)
        g_c = int(base_color[1] + (255 - base_color[1]) * (1 - t) * 0.5)
        b_c = int(base_color[2] + (255 - base_color[2]) * (1 - t) * 0.5)
        rad = int(radius * t)
        draw.ellipse([(cx - rad, cy - rad), (cx + rad, cy + rad)], fill=(r_c, g_c, b_c, 255))


def text_block(canvas: Image.Image, x: int, y: int, lines: list, font, color, anchor="lt"):
    """複数行テキストを描画"""
    draw = ImageDraw.Draw(canvas)
    for i, line in enumerate(lines):
        offset_y = i * (font.size + 16)
        draw.text((x, y + offset_y), line, font=font, fill=color, anchor=anchor)


def draw_phone_mockup(canvas: Image.Image, cx: int, cy: int, phone_w: int = 720) -> tuple:
    """画面を描画するスマホフレームを描く。中身領域(left,top,right,bottom)を返す"""
    phone_h = int(phone_w * (2.16))  # iPhone のアスペクト比に近づける
    left = cx - phone_w // 2
    top = cy - phone_h // 2
    right = cx + phone_w // 2
    bottom = cy + phone_h // 2

    draw = ImageDraw.Draw(canvas)
    # 外枠（黒、角丸）
    border = 10
    frame_color = (40, 40, 45)
    draw.rounded_rectangle(
        [(left, top), (right, bottom)],
        radius=58, fill=frame_color,
    )
    # 画面（クリーム）
    inner_l = left + border
    inner_t = top + border
    inner_r = right - border
    inner_b = bottom - border
    draw.rounded_rectangle(
        [(inner_l, inner_t), (inner_r, inner_b)],
        radius=48, fill=BG_COLOR,
    )
    # ノッチ
    notch_w = 200
    notch_h = 30
    draw.rounded_rectangle(
        [(cx - notch_w // 2, top + border + 10), (cx + notch_w // 2, top + border + 10 + notch_h)],
        radius=15, fill=frame_color,
    )

    return (inner_l, inner_t, inner_r, inner_b)


# ──────────────────────────────────────────────
# Screen mockups (各画面の中身を簡略化して描画)
# ──────────────────────────────────────────────

def render_today_screen(canvas: Image.Image, area: tuple):
    """Today画面の簡略モック"""
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx = (l + r) // 2
    # タイトル
    title_font = find_font(36, "bold")
    draw.text((cx, t + 80), "今日のシグナル", font=title_font, fill=DARK_TEXT, anchor="mm")
    # 体内マップ風（円形）
    map_cx, map_cy = cx, t + 380
    map_r = 220
    draw.ellipse(
        [(map_cx - map_r, map_cy - map_r), (map_cx + map_r, map_cy + map_r)],
        outline=(BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], 180),
        width=3,
        fill=(BG_COLOR[0], BG_COLOR[1] - 5, BG_COLOR[2] - 5),
    )
    # 6つの部位ドット
    import math
    parts = ["髪", "美肌", "目元", "循環", "腸", "筋"]
    for i, part in enumerate(parts):
        ang = -math.pi / 2 + math.pi * 2 * i / 6
        px = int(map_cx + map_r * math.cos(ang))
        py = int(map_cy + map_r * math.sin(ang))
        draw_pearl(canvas, px, py, 22, [PEARL_NAVY, PEARL_ORANGE, PEARL_WHITE, ACCENT_GOLD, PEARL_NAVY, PEARL_ORANGE][i])
        # ラベル
        label_font = find_font(20, "regular")
        label_x = px + (40 if math.cos(ang) > 0 else -40)
        label_y = py
        anchor = "lm" if math.cos(ang) > 0 else "rm"
        draw.text((label_x, label_y), part, font=label_font, fill=DARK_TEXT, anchor=anchor)
    # クエスト
    quest_y = t + 720
    quest_font = find_font(28, "regular")
    draw.text((cx, quest_y), "本日のクエスト", font=find_font(30, "bold"), fill=DARK_TEXT, anchor="mm")
    for i, q in enumerate(["セルフケアを記録", "クイズに挑戦", "アドバイスを読む"]):
        y = quest_y + 60 + i * 80
        # ロゼット
        draw.rounded_rectangle(
            [(l + 80, y - 30), (r - 80, y + 30)],
            radius=20, fill=(BG_COLOR[0] - 10, BG_COLOR[1] - 10, BG_COLOR[2] - 5, 255),
            outline=(BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], 100), width=2,
        )
        draw.text((l + 110, y), f"○ {q}", font=quest_font, fill=DARK_TEXT, anchor="lm")


def render_care_screen(canvas: Image.Image, area: tuple):
    """Care画面の簡略モック - 6つのケアカード"""
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx = (l + r) // 2
    draw.text((cx, t + 80), "セルフケア", font=find_font(36, "bold"), fill=DARK_TEXT, anchor="mm")
    cards = [
        ("髪", "髪エクソ"),
        ("美肌", "美肌エクソ"),
        ("目元", "目元エクソ"),
        ("循環", "循環エクソ"),
        ("腸", "腸内エクソ"),
        ("筋", "筋肉エクソ"),
    ]
    card_w = (r - l - 80) // 2 - 10
    card_h = 240
    start_y = t + 200
    for i, (icon, name) in enumerate(cards):
        row = i // 2
        col = i % 2
        x = l + 40 + col * (card_w + 20)
        y = start_y + row * (card_h + 20)
        draw.rounded_rectangle(
            [(x, y), (x + card_w, y + card_h)],
            radius=24, fill=BG_COLOR,
            outline=(BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], 80), width=2,
        )
        # アイコン円
        draw_pearl(canvas, x + card_w // 2, y + 70, 35,
                   [PEARL_NAVY, PEARL_ORANGE, PEARL_WHITE, ACCENT_GOLD, PEARL_NAVY, PEARL_ORANGE][i])
        draw.text((x + card_w // 2, y + 170), name, font=find_font(28, "bold"), fill=DARK_TEXT, anchor="mm")


def render_boost_screen(canvas: Image.Image, area: tuple):
    """Boost画面 - サプリ・点滴リスト"""
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx = (l + r) // 2
    draw.text((cx, t + 80), "Boost", font=find_font(36, "bold"), fill=DARK_TEXT, anchor="mm")
    draw.text((cx, t + 130), "点滴・サプリ", font=find_font(24, "regular"), fill=MID_TEXT, anchor="mm")
    items = ["NMN", "コラーゲン", "高濃度ビタミンC", "レスベラトロール", "プラセンタ"]
    for i, item in enumerate(items):
        y = t + 220 + i * 100
        draw.rounded_rectangle(
            [(l + 60, y - 40), (r - 60, y + 40)],
            radius=20, fill=BG_COLOR,
            outline=(BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], 80), width=2,
        )
        # 左端のドット
        draw_pearl(canvas, l + 110, y, 22,
                   [PEARL_NAVY, PEARL_ORANGE, ACCENT_GOLD, PEARL_WHITE, PEARL_NAVY][i])
        draw.text((l + 160, y), item, font=find_font(28, "regular"), fill=DARK_TEXT, anchor="lm")
        # 右端「+」
        draw.text((r - 90, y), "+", font=find_font(40, "bold"), fill=BG_ROSE, anchor="mm")


def render_garden_screen(canvas: Image.Image, area: tuple):
    """Garden画面 - 細胞育成"""
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx = (l + r) // 2
    draw.text((cx, t + 80), "Garden", font=find_font(36, "bold"), fill=DARK_TEXT, anchor="mm")
    # 中央に大きな細胞（円のグラデ）
    cell_cx, cell_cy = cx, t + 450
    cell_r = 200
    for r_step in range(cell_r, 0, -10):
        t_step = r_step / cell_r
        color_r = int(BG_ROSE[0] + (255 - BG_ROSE[0]) * (1 - t_step) * 0.7)
        color_g = int(BG_ROSE[1] + (255 - BG_ROSE[1]) * (1 - t_step) * 0.7)
        color_b = int(BG_ROSE[2] + (255 - BG_ROSE[2]) * (1 - t_step) * 0.7)
        draw.ellipse(
            [(cell_cx - r_step, cell_cy - r_step), (cell_cx + r_step, cell_cy + r_step)],
            fill=(color_r, color_g, color_b),
        )
    # 周囲にバッジ
    badges = ["新芽", "つぼみ", "花", "実"]
    for i, badge in enumerate(badges):
        bx = cell_cx + int(280 * (-1 if i % 2 == 0 else 1) * (1 if i < 2 else 0.5))
        by = cell_cy + int((i - 1.5) * 100)
        draw.ellipse([(bx - 40, by - 40), (bx + 40, by + 40)], fill=BG_COLOR,
                     outline=ACCENT_GOLD, width=3)
        draw.text((bx, by), badge[:1], font=find_font(28, "bold"), fill=DARK_TEXT, anchor="mm")
    # レベル
    draw.text((cx, t + 800), "Lv.7  EP 234", font=find_font(32, "bold"), fill=DARK_TEXT, anchor="mm")


def render_me_screen(canvas: Image.Image, area: tuple):
    """Me画面 - 統計"""
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx = (l + r) // 2
    draw.text((cx, t + 80), "Me", font=find_font(36, "bold"), fill=DARK_TEXT, anchor="mm")
    # 大きな数字
    stats = [("連続", "7", "日"), ("累計", "23", "日"), ("EP", "234", ""), ("Lv", "7", "")]
    start_y = t + 220
    card_h = 130
    for i, (label, value, unit) in enumerate(stats):
        y = start_y + i * (card_h + 20)
        draw.rounded_rectangle(
            [(l + 60, y), (r - 60, y + card_h)],
            radius=20, fill=BG_COLOR,
            outline=(BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], 80), width=2,
        )
        draw.text((l + 110, y + card_h // 2), label, font=find_font(28, "regular"), fill=MID_TEXT, anchor="lm")
        draw.text((r - 110, y + card_h // 2), f"{value} {unit}", font=find_font(48, "bold"), fill=DARK_TEXT, anchor="rm")
    # フッターメッセージ
    draw.text((cx, t + 940), "記録は端末の中だけ", font=find_font(24, "regular"), fill=MID_TEXT, anchor="mm")
    draw.text((cx, t + 980), "アカウント不要・課金なし", font=find_font(24, "regular"), fill=MID_TEXT, anchor="mm")


# ──────────────────────────────────────────────
# Screenshot compose function
# ──────────────────────────────────────────────

SCREENS = [
    {
        "key": "01-today",
        "headline": ["毎日の体のシグナルを、", "3人組と一緒に。"],
        "char": "link/link-yukkuri-smile-mouth-open.png",
        "char_position": "left",
        "render": render_today_screen,
    },
    {
        "key": "02-care",
        "headline": ["6つのケアを、", "毎日ひとつずつ。"],
        "char": "tanunee/tanuki-yukkuri-smile-mouth-open.png",
        "char_position": "right",
        "render": render_care_screen,
    },
    {
        "key": "03-boost",
        "headline": ["16種類のサプリ・点滴を、", "ひと目で管理。"],
        "char": "konta/kitsune-yukkuri-smile-mouth-open.png",
        "char_position": "left",
        "render": render_boost_screen,
    },
    {
        "key": "04-garden",
        "headline": ["続けるほど、", "3人組と細胞が育つ。"],
        "char": "link/link-yukkuri-blink-mouth-open.png",
        "char_position": "right",
        "render": render_garden_screen,
    },
    {
        "key": "05-me",
        "headline": ["記録は、", "あなたの端末の中だけ。"],
        "char": "tanunee/tanuki-yukkuri-half-eyes-mouth-closed.png",
        "char_position": "left",
        "render": render_me_screen,
    },
]


def compose_screenshot(spec: dict) -> Image.Image:
    canvas = make_background().convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    # 上部キャッチコピー（明朝風）
    head_font = find_font(72, "bold")
    head_y = 200
    for i, line in enumerate(spec["headline"]):
        draw.text((SS_W // 2, head_y + i * 100), line,
                  font=head_font, fill=DARK_TEXT, anchor="mm")

    # 中央にスマホモック
    phone_cx = SS_W // 2
    phone_cy = SS_H // 2 + 80
    area = draw_phone_mockup(canvas, phone_cx, phone_cy, phone_w=820)
    spec["render"](canvas, area)

    # 下部にキャラ
    char = trim_alpha(load_character(spec["char"]))
    char = fit_height(char, 360)
    if spec["char_position"] == "left":
        char_x = 80
    else:
        char_x = SS_W - char.width - 80
    char_y = SS_H - char.height - 100
    canvas.paste(char, (char_x, char_y), char)

    # フッター（小さくロゴ的なもの）
    footer_font = find_font(28, "regular")
    draw.text((SS_W // 2, SS_H - 50), "Kimito-Link",
              font=footer_font, fill=MID_TEXT, anchor="mm")

    return canvas.convert("RGB")


def main():
    for spec in SCREENS:
        print(f"-- {spec['key']} --")
        img = compose_screenshot(spec)
        out = OUT_DIR / f"{spec['key']}.png"
        img.save(out, "PNG", optimize=True)
        print(f"[OK] {out.relative_to(ROOT)} {img.size}")


if __name__ == "__main__":
    main()
