"""
exosome.kimito.link アプリアイコン生成

Kimito-Link 丸ロゴ × エクソソーム粒子を合成して、
favicon / apple-touch / PWA / OG 画像を一括生成。
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import random
import math

# パス設定
BASE = Path(__file__).resolve().parent.parent
LOGO_SRC = BASE / "images" / "kimito-link-logo" / "logo_kimito-link_RGB_maru_blue.png"
OUT_DIR = BASE / "icons"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def make_square_icon(size: int) -> Image.Image:
    """正方形アプリアイコン（ロゴ + 粒子付き）"""
    # 背景：柔らかいグラデーション
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # 背景の角丸エリア
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(bg)
    radius = int(size * 0.22)  # iOS 風の角丸

    # 背景グラデーションを2段で表現（上＝薄水色、下＝薄ピンク）
    grad_top = (212, 232, 255, 255)
    grad_bot = (255, 226, 235, 255)
    for y in range(size):
        ratio = y / (size - 1)
        r = int(grad_top[0] * (1 - ratio) + grad_bot[0] * ratio)
        g = int(grad_top[1] * (1 - ratio) + grad_bot[1] * ratio)
        b = int(grad_top[2] * (1 - ratio) + grad_bot[2] * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # 角丸マスク
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=255)

    # 中央にロゴを縮小して配置
    logo = Image.open(LOGO_SRC).convert("RGBA")
    logo_target = int(size * 0.62)
    logo = logo.resize((logo_target, logo_target), Image.LANCZOS)

    # ロゴの後ろにふんわり光輪
    glow_size = int(size * 0.78)
    glow = Image.new("RGBA", (glow_size, glow_size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([(0, 0), (glow_size, glow_size)], fill=(255, 255, 255, 160))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=size * 0.04))

    # 粒子（エクソソーム）を周囲に配置
    particles_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(particles_layer)

    random.seed(42)  # 再現性のため固定シード
    # 6個の粒子を円周状に配置
    particle_specs = [
        # (角度°, 距離率, サイズ率, 色)
        (35,  0.42, 0.14, (255, 143, 163, 230)),   # ピンク（りんく）
        (110, 0.45, 0.11, (255, 179, 71, 230)),    # オレンジ（こん太）
        (175, 0.43, 0.13, (193, 154, 107, 230)),   # ブラウン（たぬ姉）
        (235, 0.46, 0.10, (126, 200, 227, 230)),   # 水色
        (295, 0.41, 0.12, (255, 143, 163, 200)),
        (340, 0.46, 0.09, (126, 200, 227, 200)),
    ]
    cx, cy = size / 2, size / 2
    for ang_deg, dist_r, size_r, color in particle_specs:
        ang = math.radians(ang_deg)
        dx = math.cos(ang) * size * dist_r
        dy = math.sin(ang) * size * dist_r
        px, py = cx + dx, cy + dy
        psize = size * size_r
        # 粒子のグロー
        glow_p_size = int(psize * 2.4)
        glow_p = Image.new("RGBA", (glow_p_size, glow_p_size), (0, 0, 0, 0))
        gpdraw = ImageDraw.Draw(glow_p)
        gpdraw.ellipse([(0, 0), (glow_p_size, glow_p_size)],
                       fill=(color[0], color[1], color[2], 80))
        glow_p = glow_p.filter(ImageFilter.GaussianBlur(radius=psize * 0.4))
        particles_layer.alpha_composite(
            glow_p,
            (int(px - glow_p_size / 2), int(py - glow_p_size / 2))
        )
        # 粒子本体
        pdraw.ellipse(
            [(px - psize / 2, py - psize / 2),
             (px + psize / 2, py + psize / 2)],
            fill=color
        )
        # ハイライト
        hsize = psize * 0.35
        pdraw.ellipse(
            [(px - psize / 2 + psize * 0.15, py - psize / 2 + psize * 0.15),
             (px - psize / 2 + psize * 0.15 + hsize, py - psize / 2 + psize * 0.15 + hsize)],
            fill=(255, 255, 255, 230)
        )

    # 合成
    img = Image.alpha_composite(img, bg)

    # 光輪
    glow_xy = ((size - glow_size) // 2, (size - glow_size) // 2)
    img.alpha_composite(glow, glow_xy)

    # 粒子
    img = Image.alpha_composite(img, particles_layer)

    # ロゴ
    logo_xy = ((size - logo_target) // 2, (size - logo_target) // 2)
    img.alpha_composite(logo, logo_xy)

    # 全体に角丸マスク適用
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def make_round_favicon(size: int) -> Image.Image:
    """ファビコン用の完全な丸"""
    sq = make_square_icon(size)
    # 円形マスク
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.ellipse([(0, 0), (size, size)], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(sq, (0, 0), mask)
    return out


def make_og_image(width: int = 1200, height: int = 630) -> Image.Image:
    """SNSシェア用 OG画像"""
    # 背景を不透明な単色で初期化（白）→ 上にグラデを描画
    img = Image.new("RGB", (width, height), (255, 250, 243))
    draw = ImageDraw.Draw(img)

    # 背景グラデーション
    grad_top = (255, 245, 230)
    grad_bot = (216, 243, 255)
    for y in range(height):
        ratio = y / (height - 1)
        r = int(grad_top[0] * (1 - ratio) + grad_bot[0] * ratio)
        g = int(grad_top[1] * (1 - ratio) + grad_bot[1] * ratio)
        b = int(grad_top[2] * (1 - ratio) + grad_bot[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # RGBAレイヤーに変換して粒子を描画
    img = img.convert("RGBA")

    # 背景に粒子（円のレイヤーをぼかしてオーバーレイ）
    random.seed(7)
    for _ in range(15):
        px = random.randint(50, width - 50)
        py = random.randint(40, height - 40)
        psize = random.randint(40, 90)
        color = random.choice([
            (255, 143, 163, 110),
            (255, 179, 71, 110),
            (126, 200, 227, 110),
            (193, 154, 107, 90),
        ])
        # 大きめキャンバスに円を描いてからガウシアンぼかし
        canvas_size = psize * 6
        glow = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse(
            [(canvas_size // 2 - psize, canvas_size // 2 - psize),
             (canvas_size // 2 + psize, canvas_size // 2 + psize)],
            fill=color
        )
        glow = glow.filter(ImageFilter.GaussianBlur(radius=psize * 0.6))
        img.alpha_composite(
            glow,
            (px - canvas_size // 2, py - canvas_size // 2)
        )

    # 描画コンテキスト再取得
    draw = ImageDraw.Draw(img)

    # 左：丸ロゴ大
    logo = Image.open(LOGO_SRC).convert("RGBA")
    logo_size = 360
    logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
    img.alpha_composite(logo, (100, (height - logo_size) // 2))

    # 中央：「の」
    try:
        font_no = ImageFont.truetype("C:/Windows/Fonts/YuGothB.ttc", 60)
        font_title = ImageFont.truetype("C:/Windows/Fonts/YuGothB.ttc", 100)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/YuGothR.ttc", 32)
    except (OSError, IOError):
        font_no = ImageFont.load_default()
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # 「の」
    no_x = 100 + logo_size + 30
    draw.text((no_x, height // 2 - 30), "の", fill=(120, 110, 100, 255), font=font_no)

    # タイトル
    title_x = no_x + 80
    title_y = height // 2 - 130
    draw.text((title_x, title_y), "ゆっくり", fill=(255, 143, 163, 255), font=font_title)
    draw.text((title_x, title_y + 110), "エクソソーム", fill=(126, 180, 200, 255), font=font_title)

    # サブタイトル
    draw.text((title_x, title_y + 240), "3人組と毎日ちょっとずつ、セルフケア",
              fill=(120, 110, 100, 255), font=font_sub)

    return img.convert("RGB")


# ===== 生成 =====

print("Generating square app icons...")
for size in [192, 512]:
    icon = make_square_icon(size)
    icon.save(OUT_DIR / f"icon-{size}.png", "PNG")
    print(f"  -> icon-{size}.png")

print("Generating Apple touch icon...")
apple = make_square_icon(180)
apple.save(OUT_DIR / "apple-touch-icon.png", "PNG")
print("  -> apple-touch-icon.png")

print("Generating round favicons...")
for size in [16, 32, 48, 64]:
    icon = make_round_favicon(size)
    icon.save(OUT_DIR / f"favicon-{size}.png", "PNG")
    print(f"  -> favicon-{size}.png")

# favicon.ico をマルチサイズで保存
print("Generating favicon.ico...")
ico_imgs = [make_round_favicon(s) for s in [16, 32, 48, 64]]
ico_imgs[0].save(
    OUT_DIR / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
)
print("  -> favicon.ico")

print("Generating OG image (1200x630)...")
og = make_og_image()
og.save(OUT_DIR / "og-image.jpg", "JPEG", quality=90)
print("  -> og-image.jpg")

# ルートにもfavicon.icoをコピー
ROOT_FAVI = BASE / "favicon.ico"
ico_imgs[0].save(
    ROOT_FAVI,
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
)
print(f"  -> root favicon.ico")

print("\nAll icons generated in:", OUT_DIR)
