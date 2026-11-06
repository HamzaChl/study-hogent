"""Pakt de foto's uit een les-PDF uit naar public/content/<cursus>/img/ (privé, niet in git).

    pip install pymupdf
    python3 scripts/extract_images.py <pdf> <courseId> [prefix]

Bestandsnamen: <prefix>pNN-K.jpg  (NN = pagina, K = volgnummer op de pagina).
Voor Les 02 is de prefix leeg (p05-2.jpg, p46-2.jpg, …), zoals in content/constructie/lectures/les02.json.
Logo's en de achtergrond van de slidesjabloon worden overgeslagen.
"""
import os
import sys

import pymupdf

if len(sys.argv) < 3:
    sys.exit(__doc__)
pdf, course = sys.argv[1], sys.argv[2]
prefix = sys.argv[3] if len(sys.argv) > 3 else ""
out = os.path.join("public", "content", course, "img")
os.makedirs(out, exist_ok=True)

doc = pymupdf.open(pdf)
template = {(561, 426), (89, 51)}  # slide-achtergrond en logo in de KASK/HOGENT-sjabloon
n = 0
for i, page in enumerate(doc, 1):
    for j, info in enumerate(page.get_images(full=True)):
        pix = pymupdf.Pixmap(doc, info[0])
        if (pix.width, pix.height) in template or pix.width < 150:
            continue
        if pix.n - pix.alpha >= 4:
            pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
        if pix.alpha:
            pix = pymupdf.Pixmap(pix, 0)
        if pix.width > 1400:
            pix = pymupdf.Pixmap(pix, 1400, int(pix.height * 1400 / pix.width))
        pix.save(os.path.join(out, f"{prefix}p{i:02d}-{j}.jpg"), jpg_quality=82)
        n += 1
print(f"{n} afbeeldingen → {out}/")
