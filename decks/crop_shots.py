# Crop the raw 1440x900 captures down to the part of each page worth showing.
#
# A browser screenshot dropped whole into a slide is mostly empty margin — at
# slide size the content ends up too small to read. These crops are chosen by
# eye, once, and recorded here so a re-capture can be re-cropped identically.
#
#     python decks/crop_shots.py
#
# Raw captures live in decks/assets/ as NN-name.png; crops are written beside
# them as NN-name.crop.png, which is what system-overview.js embeds.

from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parent / "assets"

# (left, top, right, bottom) in the 1440x900 capture.
CROPS = {
    "01-landing": (30, 0, 1310, 760),
    "02-questions": (300, 190, 1320, 860),
    "04-results-top": (110, 180, 1040, 850),
    "05-results-cards": (140, 60, 1010, 670),
    "07-field-profile": (110, 165, 1030, 580),
    "08-field-suppressed": (110, 130, 900, 870),
    "10-admin-overview": (0, 0, 1440, 680),
    "11-admin-field-distribution": (270, 95, 1420, 670),
    "12-admin-response-charts": (270, 90, 1420, 890),
    "13-admin-survey-data": (270, 90, 1420, 890),
    "15-algorithm-tester": (280, 80, 1420, 740),
    "16-admin-accuracy": (280, 395, 1420, 850),
}


def main():
    for stem, box in CROPS.items():
        source = ASSETS / f"{stem}.png"
        if not source.exists():
            print(f"missing {source.name} — skipped")
            continue
        image = Image.open(source).crop(box)
        target = ASSETS / f"{stem}.crop.png"
        image.save(target, optimize=True)
        print(f"{target.name:<38} {image.width}x{image.height}")


if __name__ == "__main__":
    main()
