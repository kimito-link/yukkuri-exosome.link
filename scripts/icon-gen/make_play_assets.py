"""
Google Play フィーチャーグラフィック（1024×500）＋ スクリーンショット（1080×1920）生成
iOS スクリーンショットと同デザイン、サイズだけ変更
"""
from __future__ import annotations
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[2]
SRC_IMAGES = ROOT / "src" / "images" / "characters"
PLAY_DIR = ROOT / "store-assets" / "play"
SS_DIR = PLAY_DIR / "screenshots"
SS_DIR.mkdir(parents=True, exist_ok=True)

# ── Play スクリーンショットサイズ ──
SS_W, SS_H = 1080, 1920

# ── カラーパレット（iOS と共通）──
BG_TOP        = (188, 115, 133)
BG_TOP_DARK   = (152,  85, 103)
BG_BOTTOM     = (255, 250, 243)
CARD_WHITE    = (255, 255, 255)
CARD_ROSE     = (252, 238, 242)
BG_ROSE       = (201, 137, 154)
BG_ROSE_DARK  = (152,  85, 103)
ACCENT_GOLD   = (180, 145,  80)
DARK_TEXT     = ( 40,  32,  28)
MID_TEXT      = (120, 100,  92)
HEADLINE_TEXT = (255, 255, 255)
PEARL_NAVY    = ( 31,  58, 110)
PEARL_ORANGE  = (199, 107,  31)
PEARL_TEAL    = ( 60, 140, 130)
DIVIDER       = (220, 205, 210)
PEARL_COLORS  = [PEARL_NAVY, PEARL_ORANGE, ACCENT_GOLD, PEARL_TEAL, BG_ROSE_DARK, PEARL_NAVY]

TOP_RATIO = 0.58


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


def make_background(w: int, h: int) -> Image.Image:
    bg = Image.new("RGB", (w, h), BG_BOTTOM)
    draw = ImageDraw.Draw(bg)
    split_y = int(h * TOP_RATIO)
    for y in range(split_y):
        t = y / split_y
        r = int(BG_TOP_DARK[0] + (BG_TOP[0] - BG_TOP_DARK[0]) * t)
        g = int(BG_TOP_DARK[1] + (BG_TOP[1] - BG_TOP_DARK[1]) * t)
        b = int(BG_TOP_DARK[2] + (BG_TOP[2] - BG_TOP_DARK[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    blend_h = int(h * 0.06)
    for dy in range(blend_h):
        t = dy / blend_h
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t)
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t)
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t)
        draw.line([(0, split_y + dy), (w, split_y + dy)], fill=(r, g, b))
    return bg


def load_character(filename: str) -> Image.Image:
    return Image.open(SRC_IMAGES / filename).convert("RGBA")


def trim_alpha(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def fit_height(img: Image.Image, target_h: int) -> Image.Image:
    w, h = img.size
    return img.resize((int(w * target_h / h), target_h), Image.LANCZOS)


def draw_pearl(canvas: Image.Image, cx: int, cy: int, radius: int, base_color: tuple):
    draw = ImageDraw.Draw(canvas)
    for i in range(8, 0, -1):
        t = i / 8
        rc = int(base_color[0] + (255 - base_color[0]) * (1 - t) * 0.45)
        gc = int(base_color[1] + (255 - base_color[1]) * (1 - t) * 0.45)
        bc = int(base_color[2] + (255 - base_color[2]) * (1 - t) * 0.45)
        rad = max(1, int(radius * t))
        draw.ellipse([(cx - rad, cy - rad), (cx + rad, cy + rad)], fill=(rc, gc, bc))


def draw_phone_mockup(canvas: Image.Image, cx: int, cy: int, phone_w: int):
    phone_h = int(phone_w * 1.9)
    left, top = cx - phone_w // 2, cy - phone_h // 2
    right, bottom = cx + phone_w // 2, cy + phone_h // 2
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle([(left+10, top+10), (right+10, bottom+10)], radius=50, fill=(100, 80, 88))
    draw.rounded_rectangle([(left, top), (right, bottom)], radius=48, fill=(28, 24, 30))
    b = 12
    il, it, ir, ib = left+b, top+b, right-b, bottom-b
    draw.rounded_rectangle([(il, it), (ir, ib)], radius=38, fill=CARD_WHITE)
    di_w, di_h = int(phone_w * 0.19), int(phone_w * 0.035)
    draw.rounded_rectangle([(cx-di_w//2, it+12), (cx+di_w//2, it+12+di_h)], radius=12, fill=(28,24,30))
    return (il, it, ir, ib)


# ── モック内描画（iOS 版と同じ、座標は相対比率ベース）──

def render_today(canvas, area):
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx = (l+r)//2; h = b-t
    draw.text((cx, t+int(h*.055)), "今日のシグナル", font=find_font(28,"bold"), fill=DARK_TEXT, anchor="mm")
    draw.line([(l+30,t+int(h*.085)),(r-30,t+int(h*.085))], fill=DIVIDER, width=2)
    mcx, mcy = cx, t+int(h*.36)
    mr = int(min((r-l)*.28, h*.20))
    draw.ellipse([(mcx-mr,mcy-mr),(mcx+mr,mcy+mr)], outline=BG_ROSE, width=3, fill=(250,242,245))
    ir2 = int(mr*.27)
    draw.ellipse([(mcx-ir2,mcy-ir2),(mcx+ir2,mcy+ir2)], fill=CARD_WHITE, outline=DIVIDER, width=2)
    draw.text((mcx,mcy),"体内\nマップ", font=find_font(14,"bold"), fill=BG_ROSE_DARK, anchor="mm")
    for i,part in enumerate(["髪","美肌","目元","循環","腸","筋"]):
        ang = -math.pi/2 + math.pi*2*i/6
        px,py = int(mcx+mr*math.cos(ang)), int(mcy+mr*math.sin(ang))
        draw_pearl(canvas,px,py,18,PEARL_COLORS[i])
        draw.text((px+int(30*math.cos(ang)),py+int(30*math.sin(ang))),part,font=find_font(16,"bold"),fill=DARK_TEXT,anchor="mm")
    qt = t+int(h*.60)
    draw.text((cx,qt),"本日のクエスト",font=find_font(24,"bold"),fill=DARK_TEXT,anchor="mm")
    rh = int(h*.10)
    for i,q in enumerate(["セルフケアを記録","クイズに挑戦","アドバイスを読む"]):
        qy = qt+int(h*.06)+i*rh
        draw.rounded_rectangle([(l+36,qy-22),(r-36,qy+22)],radius=13,fill=CARD_WHITE,outline=DIVIDER,width=2)
        draw_pearl(canvas,l+68,qy,13,PEARL_COLORS[i])
        draw.text((l+90,qy),f" {q}",font=find_font(20,"regular"),fill=DARK_TEXT,anchor="lm")


def render_care(canvas, area):
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx=(l+r)//2; h=b-t
    draw.text((cx,t+int(h*.055)),"セルフケア",font=find_font(28,"bold"),fill=DARK_TEXT,anchor="mm")
    draw.text((cx,t+int(h*.090)),"6つの部位・毎日ひとつ",font=find_font(19,"regular"),fill=MID_TEXT,anchor="mm")
    draw.line([(l+30,t+int(h*.115)),(r-30,t+int(h*.115))],fill=DIVIDER,width=2)
    cw=(r-l-60)//2-10; ch=int(h*.245); sy=t+int(h*.13); gap=int(h*.01)
    for i,name in enumerate(["髪エクソ","美肌エクソ","目元エクソ","循環エクソ","腸内エクソ","筋肉エクソ"]):
        row,col=divmod(i,2); x=l+30+col*(cw+20); y=sy+row*(ch+gap)
        draw.rounded_rectangle([(x,y),(x+cw,y+ch)],radius=16,fill=CARD_WHITE if i%2==0 else CARD_ROSE,outline=BG_ROSE_DARK,width=2)
        draw_pearl(canvas,x+cw//2,y+int(ch*.38),26,PEARL_COLORS[i])
        draw.text((x+cw//2,y+int(ch*.72)),name,font=find_font(20,"bold"),fill=DARK_TEXT,anchor="mm")
        draw.text((x+cw//2,y+int(ch*.90)),"→",font=find_font(18,"bold"),fill=BG_ROSE_DARK,anchor="mm")


def render_me(canvas, area):
    l, t, r, b = area
    draw = ImageDraw.Draw(canvas)
    cx=(l+r)//2; h=b-t
    draw.text((cx,t+int(h*.055)),"Me",font=find_font(28,"bold"),fill=DARK_TEXT,anchor="mm")
    draw.text((cx,t+int(h*.090)),"あなたの記録",font=find_font(19,"regular"),fill=MID_TEXT,anchor="mm")
    draw.line([(l+30,t+int(h*.115)),(r-30,t+int(h*.115))],fill=DIVIDER,width=2)
    stats=[("連続記録","7","日",PEARL_TEAL),("累計記録","23","日",BG_ROSE_DARK),("EP","234","pt",ACCENT_GOLD),("レベル","7","Lv",PEARL_NAVY)]
    ch=int(h*.142); sy=t+int(h*.135); gap=int(h*.014)
    for i,(label,val,unit,col) in enumerate(stats):
        y=sy+i*(ch+gap)
        draw.rounded_rectangle([(l+30,y),(r-30,y+ch)],radius=14,fill=CARD_WHITE,outline=DIVIDER,width=2)
        draw.rounded_rectangle([(l+30,y),(l+56,y+ch)],radius=14,fill=col)
        my=y+ch//2
        draw.text((l+72,my),label,font=find_font(20,"regular"),fill=MID_TEXT,anchor="lm")
        draw.text((r-42,my),f"{val} {unit}",font=find_font(34,"bold"),fill=DARK_TEXT,anchor="rm")
    fy=sy+4*(ch+gap)+int(h*.015)
    draw.rounded_rectangle([(l+40,fy),(r-40,fy+int(h*.092))],radius=13,fill=CARD_ROSE,outline=BG_ROSE_DARK,width=2)
    draw.text((cx,fy+int(h*.029)),"記録は端末の中だけ",font=find_font(20,"bold"),fill=BG_ROSE_DARK,anchor="mm")
    draw.text((cx,fy+int(h*.063)),"アカウント不要・課金なし",font=find_font(17,"regular"),fill=MID_TEXT,anchor="mm")


SCREENS = [
    {"key":"play-1-today",   "headline":["毎日の体のシグナルを、","3人組と一緒に。"],   "char":"link/link-yukkuri-smile-mouth-open.png",         "pos":"left",  "render":render_today},
    {"key":"play-2-care",    "headline":["6つのケアを、","毎日ひとつずつ。"],           "char":"tanunee/tanuki-yukkuri-smile-mouth-open.png",     "pos":"right", "render":render_care},
    {"key":"play-3-me",      "headline":["記録は、","あなたの端末の中だけ。"],          "char":"tanunee/tanuki-yukkuri-half-eyes-mouth-closed.png","pos":"left",  "render":render_me},
]


def compose_screenshot(spec: dict) -> Image.Image:
    canvas = make_background(SS_W, SS_H).convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    # キャッチコピー（白文字）
    hfont = find_font(64, "bold")
    hy = int(SS_H * 0.10)
    for i, line in enumerate(spec["headline"]):
        draw.text((SS_W//2+2, hy+i*90+2), line, font=hfont, fill=(100,60,70), anchor="mm")
        draw.text((SS_W//2,   hy+i*90),   line, font=hfont, fill=HEADLINE_TEXT, anchor="mm")
    # モック
    pcx, pcy = SS_W//2, int(SS_H*0.48)
    area = draw_phone_mockup(canvas, pcx, pcy, phone_w=int(SS_W*0.78))
    spec["render"](canvas, area)
    # キャラ
    char_img = trim_alpha(load_character(spec["char"]))
    char_img = fit_height(char_img, int(SS_H * 0.20))
    cy2 = SS_H - char_img.height - 36
    cx2 = 40 if spec["pos"] == "left" else SS_W - char_img.width - 40
    canvas.paste(char_img, (cx2, cy2), char_img)
    # フッター
    draw.text((SS_W//2, SS_H-32), "Kimito-Link", font=find_font(22,"regular"), fill=MID_TEXT, anchor="mm")
    return canvas.convert("RGB")


# ── フィーチャーグラフィック 1024×500 ──

def make_feature_graphic() -> Image.Image:
    W, H = 1024, 500
    canvas = make_background(W, H).convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    # キャラ3体（右下、小さめ）
    chars = [
        ("link/link-yukkuri-smile-mouth-open.png",          190),
        ("tanunee/tanuki-yukkuri-smile-mouth-open.png",     170),
        ("konta/kitsune-yukkuri-smile-mouth-open.png",      160),
    ]
    positions = [(W-480, H-200), (W-320, H-185), (W-175, H-175)]
    for (fname, h_px), (cx2, cy2) in zip(chars, positions):
        try:
            ch = trim_alpha(load_character(fname))
            ch = fit_height(ch, h_px)
            canvas.paste(ch, (cx2, cy2), ch)
        except Exception:
            pass

    # テキスト（左半分、中央縦寄り）
    draw.text((60, 150), "ゆっくりエクソソーム", font=find_font(58, "bold"), fill=HEADLINE_TEXT, anchor="lm")
    draw.text((60, 232), "3人組と始めるセルフケア習慣", font=find_font(34, "regular"), fill=(255,230,235), anchor="lm")
    draw.text((60, 285), "記録だけ・課金なし・アカウント不要", font=find_font(24, "regular"), fill=(255,210,220), anchor="lm")

    # パール装飾（右上）
    for i, (px, py, r) in enumerate([(820,55,22),(900,90,16),(960,45,13),(855,140,18),(930,170,14)]):
        draw_pearl(canvas, px, py, r, PEARL_COLORS[i % len(PEARL_COLORS)])

    return canvas.convert("RGB")


def main():
    print("=== フィーチャーグラフィック ===")
    fg = make_feature_graphic()
    out = PLAY_DIR / "feature-graphic-1024x500.png"
    fg.save(out, "PNG")
    print(f"  saved → {out.relative_to(ROOT)}")

    print("\n=== Play スクリーンショット ===")
    for spec in SCREENS:
        img = compose_screenshot(spec)
        out = SS_DIR / f"{spec['key']}.png"
        img.save(out, "PNG")
        print(f"  saved → {out.relative_to(ROOT)}  {img.size}")


if __name__ == "__main__":
    main()
