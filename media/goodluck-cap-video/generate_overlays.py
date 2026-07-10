from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont


SCENES = [
    ("好運跑帽", "把好運戴上"),
    ("正面刺繡", "直式好運字樣"),
    ("後方馬蹄", "開口 / 調節帶 / 金屬扣"),
    ("實際佩戴", "正面帽型與側邊閃電"),
    ("側邊閃電", "跑動時仍然清楚醒目"),
    ("背面細節", "馬蹄標誌完整呈現"),
    ("好運跑帽", "商城現正展示"),
]

FONT_MEDIUM = "/System/Library/Fonts/STHeiti Medium.ttc"
FONT_LIGHT = "/System/Library/Fonts/STHeiti Light.ttc"
OUTPUT_DIR = Path(sys.argv[1])


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size, index=0)


for index, (title, subtitle) in enumerate(SCENES):
    overlay = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    if index < 6:
        draw.rectangle((0, 518, 1280, 720), fill=(10, 10, 12, 214))
        draw.rectangle((56, 548, 144, 554), fill=(22, 119, 255, 255))
        draw.text((56, 564), title, font=font(FONT_MEDIUM, 68), fill=(247, 248, 245, 255))
        draw.text((58, 650), subtitle, font=font(FONT_LIGHT, 28), fill=(217, 220, 226, 255))
    else:
        draw.rectangle((0, 0, 1280, 720), fill=(10, 10, 12, 122))
        draw.rectangle((64, 231, 168, 238), fill=(22, 119, 255, 255))
        draw.text((64, 251), title, font=font(FONT_MEDIUM, 92), fill=(247, 248, 245, 255))
        draw.text((68, 371), subtitle, font=font(FONT_MEDIUM, 32), fill=(247, 248, 245, 255))

    draw.text(
        (1246, 28),
        f"{index + 1:02d} / 07",
        font=font(FONT_MEDIUM, 20),
        fill=(247, 248, 245, 204),
        anchor="ra",
    )
    overlay.save(OUTPUT_DIR / f"overlay-{index + 1}.png")
