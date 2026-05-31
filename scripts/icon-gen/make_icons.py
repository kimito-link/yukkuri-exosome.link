"""
ゆっくりエクソソーム アイコン一括生成スクリプト（汎用版）

3つのバリアントを生成し、各プラットフォームの全サイズに自動展開する：
  A. りんく単体 + パール3粒（最もシンプル、アイコン用途）
  B. りんく + 体内シグナルマップ（記事ヒーロー・OGP用途）
  C. 3人組 + パール3粒（バナー・フィーチャーグラフィック用途）

出力先：
  store-assets/source/        マスター 1024×1024 PNG
  store-assets/appstore/      iOS App Store 1024×1024
  store-assets/play/          Play Store 512×512 + feature graphic 1024×500
  src/icons/                  PWA / favicon / Apple touch icon
  android-twa/                Bubblewrap Android TWA store_icon

CLI:
  python scripts/icon-gen/make_icons.py            # 全部 (A/B/C と 全プラットフォーム)
  python scripts/icon-gen/make_icons.py --only A   # A だけ
  python scripts/icon-gen/make_icons.py --variant rinku-3chars-pearl=C
"""
from __future__ import annotations
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import argparse
import math
import sys

ROOT = Path(__file__).resolve().parents[2]
SRC_IMAGES = ROOT / "src" / "images" / "characters"
OUT_SOURCE = ROOT / "store-assets" / "source"
OUT_APPSTORE = ROOT / "store-assets" / "appstore"
OUT_PLAY = ROOT / "store-assets" / "play"
OUT_WEB_ICONS = ROOT / "src" / "icons"
OUT_ANDROID_TWA = ROOT / "android-twa"

for d in (OUT_SOURCE, OUT_APPSTORE, OUT_PLAY, OUT_WEB_ICONS, OUT_ANDROID_TWA):
    d.mkdir(parents=True, exist_ok=True)

CANVAS_SIZE = 1024

# ブランドカラー
BG_COLOR = (255, 250, 243)       # #fffaf3 クリームベージュ
BG_ROSE = (201, 137, 154)        # #c9899a くすみローズ（端のグラデ）
ACCENT_GOLD = (201, 169, 110)    # #c9a96e シャンパンゴールド
PEARL_NAVY = (31, 58, 110)       # #1F3A6E
PEARL_ORANGE = (199, 107, 31)    # #C76B1F
PEARL_WHITE = (232, 232, 236)    # #E8E8EC
PEARL_LINE = (40, 70, 130)       # アーチの線


# ─────────────────────────────────────────────────────
# 共通ヘルパー
# ─────────────────────────────────────────────────────

def make_background(canvas_size: int = CANVAS_SIZE) -> Image.Image:
    """クリームベージュ→端にうっすらローズのグラデ"""
    bg = Image.new("RGB", (canvas_size, canvas_size), BG_COLOR)
    overlay = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = canvas_size // 2, canvas_size // 2
    max_r = int(canvas_size * 0.85)
    steps = 80
    for i in range(steps):
        r_outer = int(max_r * ((i + 1) / steps))
        alpha = int(18 * (i / steps))
        draw.ellipse(
            [(cx - r_outer, cy - r_outer), (cx + r_outer, cy + r_outer)],
            fill=(BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], alpha),
        )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=30))
    bg.paste(overlay, (0, 0), overlay)
    return bg


def load_character(filename: str) -> Image.Image:
    p = SRC_IMAGES / filename
    if not p.exists():
        raise FileNotFoundError(f"Character image not found: {p}")
    return Image.open(p).convert("RGBA")


def trim_alpha(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def fit_height(img: Image.Image, target_h: int) -> Image.Image:
    w, h = img.size
    new_w = int(w * target_h / h)
    return img.resize((new_w, target_h), Image.LANCZOS)


def draw_pearl(canvas: Image.Image, cx: int, cy: int, radius: int, base_color: tuple):
    """立体感のあるパールを描画（中心が明るく、影付き）"""
    draw = ImageDraw.Draw(canvas)
    # 影
    shadow = Image.new("RGBA", (radius * 4, radius * 4), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.ellipse(
        [(radius * 2 - radius + 4, radius * 2 - radius + radius // 2),
         (radius * 2 + radius + 4, radius * 2 + radius + radius // 2)],
        fill=(0, 0, 0, 60),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=radius * 0.18))
    canvas.paste(shadow, (cx - radius * 2, cy - radius * 2), shadow)
    # 同心円グラデ
    steps = 12
    for i in range(steps, 0, -1):
        t = i / steps
        r_c = int(base_color[0] + (255 - base_color[0]) * (1 - t) * 0.5)
        g_c = int(base_color[1] + (255 - base_color[1]) * (1 - t) * 0.5)
        b_c = int(base_color[2] + (255 - base_color[2]) * (1 - t) * 0.5)
        rad = int(radius * t)
        draw.ellipse(
            [(cx - rad, cy - rad), (cx + rad, cy + rad)],
            fill=(r_c, g_c, b_c, 255),
        )
    # ハイライト
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
    """3点を通るアーチ線を描く"""
    if len(points) != 3:
        return
    draw = ImageDraw.Draw(canvas)
    (x1, y1), (x2, y2), (x3, y3) = points
    ax, ay = x1, y1
    bx, by = x2, y2
    cx_p, cy_p = x3, y3
    d = 2.0 * (ax * (by - cy_p) + bx * (cy_p - ay) + cx_p * (ay - by))
    if abs(d) < 1e-6:
        draw.line(points, fill=PEARL_LINE, width=3)
        return
    ux = (
        (ax**2 + ay**2) * (by - cy_p)
        + (bx**2 + by**2) * (cy_p - ay)
        + (cx_p**2 + cy_p**2) * (ay - by)
    ) / d
    uy = (
        (ax**2 + ay**2) * (cx_p - bx)
        + (bx**2 + by**2) * (ax - cx_p)
        + (cx_p**2 + cy_p**2) * (bx - ax)
    ) / d
    r = math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2)
    a1 = math.atan2(y1 - uy, x1 - ux)
    a2 = math.atan2(y2 - uy, x2 - ux)
    a3 = math.atan2(y3 - uy, x3 - ux)
    def lerp(a, b, t):
        return a + (b - a) * t
    N = 80
    arc_points = []
    for t in [i / N for i in range(N + 1)]:
        if t <= 0.5:
            ang = lerp(a1, a2, t / 0.5)
        else:
            ang = lerp(a2, a3, (t - 0.5) / 0.5)
        arc_points.append((ux + r * math.cos(ang), uy + r * math.sin(ang)))
    for i in range(len(arc_points) - 1):
        draw.line([arc_points[i], arc_points[i + 1]], fill=PEARL_LINE, width=3)


# ─────────────────────────────────────────────────────
# Variant A: りんく単体 + パール3粒
# ─────────────────────────────────────────────────────

def compose_variant_a() -> Image.Image:
    """アプリアイコン用：りんく単体、シンプル、視認性最大"""
    canvas = make_background().convert("RGBA")
    rinku = trim_alpha(load_character("link/link-yukkuri-smile-mouth-open.png"))
    # りんくを大きく中央に
    rinku = fit_height(rinku, 640)
    rx = (CANVAS_SIZE - rinku.width) // 2
    ry = (CANVAS_SIZE - rinku.height) // 2 + 40  # ちょい下寄りでパール上余白
    canvas.paste(rinku, (rx, ry), rinku)

    # 周囲にパール3粒（左上にネイビー、右下にオレンジ、左下にパールホワイト）
    head_cx = rx + rinku.width // 2
    head_cy = ry + 180  # りんくの頭の高さ
    pearl_r = 56
    # 円周上の3点
    radius_around = 380
    positions = [
        # 左上
        (head_cx - int(radius_around * 0.85), head_cy - int(radius_around * 0.55), PEARL_NAVY),
        # 右上
        (head_cx + int(radius_around * 0.7), head_cy - int(radius_around * 0.5), PEARL_ORANGE),
        # 下中央
        (head_cx - int(radius_around * 0.25), head_cy + int(radius_around * 0.95), PEARL_WHITE),
    ]
    for px, py, color in positions:
        draw_pearl(canvas, px, py, pearl_r, color)

    return canvas.convert("RGB")


# ─────────────────────────────────────────────────────
# Variant B: りんく + 体内シグナルマップ
# ─────────────────────────────────────────────────────

def compose_variant_b() -> Image.Image:
    """記事ヒーロー / OGP 用：りんくが体内マップを背景に佇む"""
    canvas = make_background().convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    # 中央に薄いベージュ人体シルエット（円形に簡略化）
    cx, cy = CANVAS_SIZE // 2, CANVAS_SIZE // 2 + 30
    body_r = 360
    body_overlay = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(body_overlay)
    bdraw.ellipse(
        [(cx - body_r, cy - body_r), (cx + body_r, cy + body_r)],
        fill=(BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], 25),
        outline=(BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], 60),
        width=3,
    )
    body_overlay = body_overlay.filter(ImageFilter.GaussianBlur(radius=3))
    canvas.paste(body_overlay, (0, 0), body_overlay)

    # 体内マップの6つの点（円周上に配置、色違いパール）
    point_colors = [
        PEARL_NAVY, PEARL_ORANGE, PEARL_WHITE,
        ACCENT_GOLD, PEARL_NAVY, PEARL_ORANGE,
    ]
    point_r = 36
    line_color = (BG_ROSE[0], BG_ROSE[1], BG_ROSE[2], 90)
    point_positions = []
    for i in range(6):
        ang = -math.pi / 2 + math.pi * 2 * i / 6
        px = int(cx + body_r * 0.82 * math.cos(ang))
        py = int(cy + body_r * 0.82 * math.sin(ang))
        point_positions.append((px, py))

    # 点同士を細い線で繋ぐ（六角形ネットワーク感）
    line_canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    ldraw = ImageDraw.Draw(line_canvas)
    for i in range(len(point_positions)):
        for j in range(i + 1, len(point_positions)):
            ldraw.line([point_positions[i], point_positions[j]], fill=line_color, width=2)
    canvas.paste(line_canvas, (0, 0), line_canvas)

    # 各点にパール描画
    for (px, py), color in zip(point_positions, point_colors):
        draw_pearl(canvas, px, py, point_r, color)

    # りんくを中央
    rinku = trim_alpha(load_character("link/link-yukkuri-smile-mouth-open.png"))
    rinku = fit_height(rinku, 380)
    rx = (CANVAS_SIZE - rinku.width) // 2
    ry = (CANVAS_SIZE - rinku.height) // 2 + 60
    canvas.paste(rinku, (rx, ry), rinku)

    return canvas.convert("RGB")


# ─────────────────────────────────────────────────────
# Variant C: 3人組 + パール3粒（既存）
# ─────────────────────────────────────────────────────

def compose_variant_c() -> Image.Image:
    """バナー / フィーチャーグラフィック 用：3人組勢揃い"""
    canvas = make_background().convert("RGBA")

    konta = trim_alpha(load_character("konta/kitsune-yukkuri-smile-mouth-open.png"))
    rinku = trim_alpha(load_character("link/link-yukkuri-smile-mouth-open.png"))
    tanunee = trim_alpha(load_character("tanunee/tanuki-yukkuri-smile-mouth-open.png"))

    CHAR_H = 460
    konta = fit_height(konta, CHAR_H)
    rinku = fit_height(rinku, CHAR_H)
    tanunee = fit_height(tanunee, CHAR_H)

    spacing = -30
    total_w = konta.width + rinku.width + tanunee.width + spacing * 2
    x_left = (CANVAS_SIZE - total_w) // 2
    base_y = 380
    konta_pos = (x_left, base_y + 20)
    rinku_pos = (x_left + konta.width + spacing, base_y)
    tanunee_pos = (x_left + konta.width + spacing + rinku.width + spacing, base_y + 20)

    # 両脇 → 中央の順で貼り付け（中央のりんくが手前）
    canvas.paste(konta, konta_pos, konta)
    canvas.paste(tanunee, tanunee_pos, tanunee)
    canvas.paste(rinku, rinku_pos, rinku)

    # パール3粒アーチ
    pearl_r = 56
    konta_head_x = konta_pos[0] + konta.width // 2
    rinku_head_x = rinku_pos[0] + rinku.width // 2
    tanunee_head_x = tanunee_pos[0] + tanunee.width // 2
    arch_top_y = 170
    arch_side_y = 240
    pearl_positions = [
        (konta_head_x, arch_side_y),
        (rinku_head_x, arch_top_y),
        (tanunee_head_x, arch_side_y),
    ]
    pearl_colors = [PEARL_NAVY, PEARL_ORANGE, PEARL_WHITE]
    draw_pearl_arch(canvas, pearl_positions)
    for (px, py), color in zip(pearl_positions, pearl_colors):
        draw_pearl(canvas, px, py, pearl_r, color)

    return canvas.convert("RGB")


VARIANTS = {
    "A": ("rinku-pearls", compose_variant_a),
    "B": ("rinku-bodymap", compose_variant_b),
    "C": ("3chars-pearls", compose_variant_c),
}


# ─────────────────────────────────────────────────────
# 各プラットフォームへの自動展開
# ─────────────────────────────────────────────────────

def propagate_to_platforms(master_1024: Image.Image, variant_key: str, master: bool):
    """master=True のとき、各プラットフォームのファイル名にコピー"""
    name, _ = VARIANTS[variant_key]

    # 全 variant でマスター 1024 を保存
    out = OUT_SOURCE / f"icon-{name}-1024.png"
    master_1024.save(out, "PNG", optimize=True)
    print(f"[OK] {out.relative_to(ROOT)}")

    # 512 / 180 / 64 / etc も保存
    for sz in (512, 192, 180, 64, 48, 32, 16):
        small = master_1024.resize((sz, sz), Image.LANCZOS)
        out = OUT_SOURCE / f"icon-{name}-{sz}.png"
        small.save(out, "PNG", optimize=True)

    if not master:
        return

    # === A (アプリアイコン用): 各プラットフォームの公式パスにも書き込む ===
    if variant_key == "A":
        # iOS App Store
        master_1024.save(OUT_APPSTORE / "app-icon-1024.png", "PNG", optimize=True)
        print(f"[OK] {(OUT_APPSTORE / 'app-icon-1024.png').relative_to(ROOT)}")

        # Play Store icon (512)
        master_1024.resize((512, 512), Image.LANCZOS).save(
            OUT_PLAY / "icon-512.png", "PNG", optimize=True
        )
        print(f"[OK] {(OUT_PLAY / 'icon-512.png').relative_to(ROOT)}")

        # Android TWA
        master_1024.resize((512, 512), Image.LANCZOS).save(
            OUT_ANDROID_TWA / "store_icon.png", "PNG", optimize=True
        )
        print(f"[OK] {(OUT_ANDROID_TWA / 'store_icon.png').relative_to(ROOT)}")

        # Web PWA / favicon / apple touch
        sizes_for_web = {
            "icon-192.png": 192,
            "icon-512.png": 512,
            "apple-touch-icon.png": 180,
            "favicon-16.png": 16,
            "favicon-32.png": 32,
            "favicon-48.png": 48,
            "favicon-64.png": 64,
        }
        for filename, sz in sizes_for_web.items():
            master_1024.resize((sz, sz), Image.LANCZOS).save(
                OUT_WEB_ICONS / filename, "PNG", optimize=True
            )
        # multi-size favicon.ico
        ico_imgs = [master_1024.resize(s, Image.LANCZOS) for s in [(16, 16), (32, 32), (48, 48)]]
        ico_imgs[0].save(
            OUT_WEB_ICONS / "favicon.ico", format="ICO",
            sizes=[(16, 16), (32, 32), (48, 48)],
        )
        print(f"[OK] {(OUT_WEB_ICONS / 'favicon.ico').relative_to(ROOT)} (multi-size)")
        # マスター標準名にも書き込む
        master_1024.save(OUT_SOURCE / "icon-source-1024.png", "PNG", optimize=True)
        print(f"[OK] {(OUT_SOURCE / 'icon-source-1024.png').relative_to(ROOT)} (master alias)")

    # === B (OGP用): OGP 1200×630 を生成 ===
    if variant_key == "B":
        og = Image.new("RGB", (1200, 630), BG_COLOR)
        # 中央に正方形画像を配置
        og_inner = master_1024.resize((600, 600), Image.LANCZOS)
        og.paste(og_inner, ((1200 - 600) // 2, (630 - 600) // 2))
        og.save(OUT_WEB_ICONS / "og-image.jpg", "JPEG", quality=92, optimize=True)
        print(f"[OK] {(OUT_WEB_ICONS / 'og-image.jpg').relative_to(ROOT)} (1200×630)")

    # === C (バナー用): Play feature graphic 1024×500 を生成 ===
    if variant_key == "C":
        fg = Image.new("RGB", (1024, 500), BG_COLOR)
        # 中央に C の正方形を縮小して配置 + 余白
        fg_inner = master_1024.resize((500, 500), Image.LANCZOS)
        fg.paste(fg_inner, ((1024 - 500) // 2, 0))
        fg.save(OUT_PLAY / "feature-graphic.png", "PNG", optimize=True)
        print(f"[OK] {(OUT_PLAY / 'feature-graphic.png').relative_to(ROOT)} (1024×500)")


# ─────────────────────────────────────────────────────
# main
# ─────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Generate ゆっくりエクソソーム app icons (A/B/C variants)"
    )
    parser.add_argument(
        "--only", choices=list(VARIANTS.keys()),
        help="生成するバリアントを1つに限定（A=単体, B=体内マップ, C=3人組）"
    )
    parser.add_argument(
        "--master", choices=list(VARIANTS.keys()),
        default="A",
        help="どのバリアントをアプリアイコンマスターとして各プラットフォームに配備するか（デフォルト A）"
    )
    args = parser.parse_args()

    targets = [args.only] if args.only else list(VARIANTS.keys())

    print(f"== Building variants: {', '.join(targets)} ==")
    print(f"== Master (propagated to platforms): {args.master} ==\n")

    for v in targets:
        name, fn = VARIANTS[v]
        print(f"-- Variant {v} ({name}) --")
        img = fn()
        propagate_to_platforms(img, v, master=(v == args.master))
        print()

    print("== Done ==")


if __name__ == "__main__":
    main()
