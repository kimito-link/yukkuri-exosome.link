"""
ゆっくりエクソソーム アプリアイコン生成スクリプト（3人組+パール3粒バージョン）

既存の3キャラ画像 (link/konta/tanunee) を Pillow で合成し、
Kimito-Link ブランドのパール3粒を頭上に配置した
1024×1024 の正方形アイコンを生成する。

Gemini の生成揺らぎなしで、確実にオリジナルキャラの絵柄を保つ。
"""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[2]
SRC_IMAGES = ROOT / "src" / "images" / "characters"
OUTPUT_DIR = ROOT / "store-assets" / "source"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CANVAS_SIZE = 1024

# ブランドカラー
BG_COLOR = (255, 250, 243)       # #fffaf3 クリームベージュ
BG_ROSE = (201, 137, 154)        # #c9899a くすみローズ（薄く端に使う）
PEARL_NAVY = (31, 58, 110)       # #1F3A6E
PEARL_ORANGE = (199, 107, 31)    # #C76B1F
PEARL_WHITE = (232, 232, 236)    # #E8E8EC
PEARL_LINE = (40, 70, 130)       # アーチの線色（やや薄めのネイビー）


def make_background() -> Image.Image:
    """クリームベージュ→四隅にうっすらローズのグラデーション背景"""
    bg = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), BG_COLOR)
    # 四隅だけほんのり色をのせる（radial の逆向き：中心が透明、外側がローズ）
    overlay = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = CANVAS_SIZE // 2, CANVAS_SIZE // 2
    max_r = int(CANVAS_SIZE * 0.85)
    # 外側から中心に向かって、薄→濃→透明のグラデーション
    # 中心 alpha=0、外側 alpha=20 くらい
    steps = 80
    for i in range(steps):
        # 内側→外側
        r_inner = int(max_r * (i / steps))
        r_outer = int(max_r * ((i + 1) / steps))
        if r_outer <= r_inner:
            continue
        # 外側ほど alpha を上げる
        alpha = int(18 * (i / steps))
        draw.ellipse(
            [(cx - r_outer, cy - r_outer), (cx + r_outer, cy + r_outer)],
            outline=None,
            fill=(BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], alpha),
        )
    # 中心を透明に戻す（同心円を全部塗ったので中央を透明で抜く）
    center_clear = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(center_clear)
    cdraw.ellipse(
        [(cx - int(max_r * 0.4), cy - int(max_r * 0.4)),
         (cx + int(max_r * 0.4), cy + int(max_r * 0.4))],
        fill=(255, 250, 243, 255),
    )
    # 直接 paste しないで、中央の透明感のため Gaussian blur
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=30))
    bg.paste(overlay, (0, 0), overlay)
    return bg


def load_character(filename: str) -> Image.Image:
    """背景透過のキャラ画像を読み込む"""
    p = SRC_IMAGES / filename
    if not p.exists():
        raise FileNotFoundError(f"Character image not found: {p}")
    return Image.open(p).convert("RGBA")


def trim_alpha(img: Image.Image) -> Image.Image:
    """透明領域を削って bbox にトリミング"""
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def fit_height(img: Image.Image, target_h: int) -> Image.Image:
    """高さに合わせてアスペクト比を保ったままリサイズ"""
    w, h = img.size
    new_w = int(w * target_h / h)
    return img.resize((new_w, target_h), Image.LANCZOS)


def draw_pearl(canvas: Image.Image, cx: int, cy: int, radius: int, base_color: tuple):
    """立体感のあるパールを描画。base_color に対してハイライト・シャドウを足す。"""
    draw = ImageDraw.Draw(canvas)
    # 影（パールの下に薄く落ちる）
    shadow = Image.new("RGBA", (radius * 4, radius * 4), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.ellipse(
        [
            (radius * 2 - radius + 4, radius * 2 - radius + radius // 2),
            (radius * 2 + radius + 4, radius * 2 + radius + radius // 2),
        ],
        fill=(0, 0, 0, 60),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=radius * 0.18))
    canvas.paste(shadow, (cx - radius * 2, cy - radius * 2), shadow)

    # 本体：薄→濃のグラデーションを近似する複数同心円
    steps = 12
    for i in range(steps, 0, -1):
        t = i / steps
        # 中心ほど色が薄く（白寄り）
        r = int(base_color[0] + (255 - base_color[0]) * (1 - t) * 0.5)
        g = int(base_color[1] + (255 - base_color[1]) * (1 - t) * 0.5)
        b = int(base_color[2] + (255 - base_color[2]) * (1 - t) * 0.5)
        rad = int(radius * t)
        draw.ellipse(
            [(cx - rad, cy - rad), (cx + rad, cy + rad)],
            fill=(r, g, b, 255),
        )
    # ハイライト：左上に小さな白光
    hl_r = int(radius * 0.35)
    hl_cx = cx - int(radius * 0.35)
    hl_cy = cy - int(radius * 0.35)
    highlight = Image.new("RGBA", (hl_r * 4, hl_r * 4), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(highlight)
    hdraw.ellipse(
        [(hl_r * 2 - hl_r, hl_r * 2 - hl_r), (hl_r * 2 + hl_r, hl_r * 2 + hl_r)],
        fill=(255, 255, 255, 200),
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(radius=hl_r * 0.4))
    canvas.paste(highlight, (hl_cx - hl_r * 2, hl_cy - hl_r * 2), highlight)


def draw_pearl_arch(canvas: Image.Image, points: list):
    """3粒のパールを結ぶアーチ線を描く（中心が上、両端が下のなだらかなカーブ）"""
    draw = ImageDraw.Draw(canvas)
    # 3 点を通る円弧を 60 分割して描画
    if len(points) != 3:
        return
    (x1, y1), (x2, y2), (x3, y3) = points
    # 3点を通る円の中心を求める（外心の式）
    ax, ay = x1, y1
    bx, by = x2, y2
    cx, cy_ = x3, y3
    d = 2.0 * (ax * (by - cy_) + bx * (cy_ - ay) + cx * (ay - by))
    if abs(d) < 1e-6:
        # 線形の3点 → 単純に直線で結ぶ
        draw.line(points, fill=PEARL_LINE, width=4)
        return
    ux = (
        (ax**2 + ay**2) * (by - cy_)
        + (bx**2 + by**2) * (cy_ - ay)
        + (cx**2 + cy_**2) * (ay - by)
    ) / d
    uy = (
        (ax**2 + ay**2) * (cx - bx)
        + (bx**2 + by**2) * (ax - cx)
        + (cx**2 + cy_**2) * (bx - ax)
    ) / d
    r = math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2)
    # 始点と終点の角度
    a1 = math.atan2(y1 - uy, x1 - ux)
    a3 = math.atan2(y3 - uy, x3 - ux)
    # 中点 a2 の角度
    a2 = math.atan2(y2 - uy, x2 - ux)
    # 始点→中点→終点 の順に sweep
    angles = [a1]
    # 細かく線分で結ぶ
    N = 80
    # a1 → a2 → a3 と単調に変化する角度配列を作る
    def lerp(a, b, t):
        # 角度補間（-pi 〜 pi の範囲を考慮せず、近似で OK）
        return a + (b - a) * t

    arc_points = []
    for t in [i / N for i in range(N + 1)]:
        if t <= 0.5:
            ang = lerp(a1, a2, t / 0.5)
        else:
            ang = lerp(a2, a3, (t - 0.5) / 0.5)
        arc_points.append((ux + r * math.cos(ang), uy + r * math.sin(ang)))
    for i in range(len(arc_points) - 1):
        draw.line([arc_points[i], arc_points[i + 1]], fill=PEARL_LINE, width=3)


def compose_3chars_icon() -> Image.Image:
    canvas = make_background().convert("RGBA")

    # キャラ画像読み込み（笑顔・口開けバージョンで統一）
    konta = trim_alpha(load_character("konta/kitsune-yukkuri-smile-mouth-open.png"))
    rinku = trim_alpha(load_character("link/link-yukkuri-smile-mouth-open.png"))
    tanunee = trim_alpha(load_character("tanunee/tanuki-yukkuri-smile-mouth-open.png"))

    # サイズ目標：アイコン中央でフェイス3つが大きく見える
    # ただし上にパールアーチを置く余白を確保するため、頭サイズは控えめに
    CHAR_H = 460
    konta = fit_height(konta, CHAR_H)
    rinku = fit_height(rinku, CHAR_H)
    tanunee = fit_height(tanunee, CHAR_H)

    # 配置：3人を横並びに、下半分に配置（上部はパールアーチエリア）
    spacing = -30  # 顔が少し重なるくらい寄せる
    total_w = konta.width + rinku.width + tanunee.width + spacing * 2

    x_left = (CANVAS_SIZE - total_w) // 2
    # Y方向：3人の頭は下寄り（上にパール3粒+アーチを置くため）
    base_y = 380
    konta_pos = (x_left, base_y + 20)
    rinku_pos = (x_left + konta.width + spacing, base_y)  # りんくが一番上
    tanunee_pos = (x_left + konta.width + spacing + rinku.width + spacing, base_y + 20)

    # 3人を貼り付け（順番：両脇→中央。中央のりんくが手前に来る）
    canvas.paste(konta, konta_pos, konta)
    canvas.paste(tanunee, tanunee_pos, tanunee)
    canvas.paste(rinku, rinku_pos, rinku)

    # パール3粒をアーチ状に配置（3人の頭上、余裕をもって）
    pearl_r = 56
    konta_head_x = konta_pos[0] + konta.width // 2
    rinku_head_x = rinku_pos[0] + rinku.width // 2
    tanunee_head_x = tanunee_pos[0] + tanunee.width // 2
    # アーチを頭から離して、上部に綺麗に配置
    arch_top_y = 170
    arch_side_y = 240
    pearl_positions = [
        (konta_head_x, arch_side_y),       # 左：ネイビー
        (rinku_head_x, arch_top_y),         # 中央：オレンジ
        (tanunee_head_x, arch_side_y),      # 右：パールホワイト
    ]
    pearl_colors = [PEARL_NAVY, PEARL_ORANGE, PEARL_WHITE]

    # アーチ線を先に引く
    draw_pearl_arch(canvas, pearl_positions)
    # パール本体を描画
    for (px, py), color in zip(pearl_positions, pearl_colors):
        draw_pearl(canvas, px, py, pearl_r, color)

    return canvas.convert("RGB")


def main():
    icon = compose_3chars_icon()
    out_path = OUTPUT_DIR / "icon-source-3chars-1024.png"
    icon.save(out_path, "PNG", optimize=True)
    print(f"[OK] saved: {out_path}")
    # 512 版も書き出し
    icon_512 = icon.resize((512, 512), Image.LANCZOS)
    icon_512.save(OUTPUT_DIR / "icon-3chars-512.png", "PNG", optimize=True)
    print(f"[OK] saved: {OUTPUT_DIR / 'icon-3chars-512.png'}")
    # 180 版（iOS マスターアイコン）
    icon_180 = icon.resize((180, 180), Image.LANCZOS)
    icon_180.save(OUTPUT_DIR / "icon-3chars-180.png", "PNG", optimize=True)
    print(f"[OK] saved: {OUTPUT_DIR / 'icon-3chars-180.png'}")


if __name__ == "__main__":
    main()
