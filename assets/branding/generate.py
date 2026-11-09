"""Generate Clai's brand SVG sources (mark, wordmark, lockups, favicon, app icon).

    uv run --no-project --with fonttools python assets/branding/generate.py

The mark ("the aperture"): a squared C, the open edge of a document and a citation bracket,
with a sage bar sliding out of it: the answer coming out of the document.
The wordmark is "clai" set in Geist SemiBold and outlined; the dot of the i is replaced by
the same sage bar.
"""

from __future__ import annotations

from pathlib import Path

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
SRC = HERE / "source"
FONT = HERE / "fonts" / "Geist-SemiBold.ttf"

INK_DARK = "#0C0E0D"  # page background
CREAM = "#F2F1EC"  # mark on dark
SAGE = "#B8D9C6"  # accent on dark
SAGE_DEEP = "#4E7A65"  # accent on light (contrast)

# ── Mark geometry (64-unit grid) ─────────────────────────────────────
# The aperture: an open squared C with softened outer corners, stroke 10.
APERTURE = (
    "M38 10 H17 Q6 10 6 21 V43 Q6 54 17 54 H38 V44 H18 Q16 44 16 42 V22 Q16 20 18 20 H38 Z"
)
# The evidence bar sits detached, outside the aperture's open edge, so the mark reads as
# "C" plus a line of evidence leaving the document (an inner bar read as the letter E).
BAR = '<rect x="43" y="28.5" width="15" height="7" rx="1.5"'


def mark(ink: str, accent: str, title: bool = True) -> str:
    t = '<title id="t">Clai</title>' if title else ""
    aria = ' role="img" aria-labelledby="t"' if title else ' aria-hidden="true"'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"{aria}>{t}'
        f'<path fill="{ink}" d="{APERTURE}"/>{BAR} fill="{accent}"/></svg>\n'
    )


def tile(size_rx: float = 14) -> str:
    """Mark on a dark tile: favicon and app icon (legible on light and dark browser chrome)."""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        f'<rect width="64" height="64" rx="{size_rx}" fill="{INK_DARK}"/>'
        f'<g transform="translate(6.4 6.4) scale(0.8)"><path fill="{CREAM}" d="{APERTURE}"/>{BAR} fill="{SAGE}"/></g></svg>\n'
    )


# ── Wordmark ─────────────────────────────────────────────────────────
def wordmark_paths(size: float = 48, tracking: float = -1.6) -> tuple[str, tuple[float, float, float, float], float]:
    """Outline 'clai'. Returns (path data without the i's dot, dot bbox, total width)."""
    font = TTFont(str(FONT))
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    scale = size / font["head"].unitsPerEm
    x = 0.0
    parts: list[str] = []
    dot_box = (0.0, 0.0, 0.0, 0.0)
    for ch in "clai":
        name = cmap[ord(ch)]
        rec = DecomposingRecordingPen(glyphs)
        glyphs[name].draw(rec)
        contours: list[list[tuple[str, tuple]]] = [[]]
        for op, args in rec.value:
            contours[-1].append((op, args))
            if op in ("closePath", "endPath"):
                contours.append([])
        contours = [c for c in contours if c]
        if ch == "i":
            # The dot is the contour whose lowest point is highest; drop it and remember its box.
            def bottom(c: list[tuple[str, tuple]]) -> float:
                return min(pt[1] for _, args in c for pt in args if isinstance(pt, tuple))

            dot = max(contours, key=bottom)
            pts = [pt for _, args in dot for pt in args if isinstance(pt, tuple)]
            xs, ys = [p[0] for p in pts], [p[1] for p in pts]
            dot_box = (x + min(xs) * scale, -max(ys) * scale, (max(xs) - min(xs)) * scale, (max(ys) - min(ys)) * scale)
            contours = [c for c in contours if c is not dot]
        pen = SVGPathPen(glyphs)
        tpen = TransformPen(pen, (scale, 0, 0, -scale, x, 0))
        for contour in contours:
            for op, args in contour:
                getattr(tpen, op)(*args)
        parts.append(pen.getCommands())
        x += glyphs[name].width * scale + tracking
    return " ".join(parts), dot_box, x - tracking


def fmt(d: str) -> str:
    import re

    return re.sub(r"-?\d+\.\d+", lambda m: f"{float(m.group()):.2f}".rstrip("0").rstrip("."), d)


def wordmark_svg(path: str, dot: tuple[float, float, float, float], width: float, ink: str, accent: str, baseline: float = 40) -> str:
    dx, dy, dw, dh = dot
    # The i's dot becomes a bar: same height as the dot, wider, flush with its left edge.
    bar = f'<rect x="{dx:.2f}" y="{baseline + dy:.2f}" width="{dw * 1.9:.2f}" height="{dh:.2f}" rx="1.2" fill="{accent}"/>'
    w = width + dw * 1.2
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} 48" role="img" aria-labelledby="t">'
        f'<title id="t">Clai</title><path fill="{ink}" transform="translate(0 {baseline})" d="{fmt(path)}"/>{bar}</svg>\n'
    ), w


def lockup_svg(path: str, dot: tuple[float, float, float, float], width: float, ink: str, accent: str) -> str:
    dx, dy, dw, dh = dot
    off = 58  # mark is 48px tall, then 10px gap
    bar = f'<rect x="{off + dx:.2f}" y="{40 + dy:.2f}" width="{dw * 1.9:.2f}" height="{dh:.2f}" rx="1.2" fill="{accent}"/>'
    w = off + width + dw * 1.2
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} 48" role="img" aria-labelledby="t"><title id="t">Clai</title>'
        f'<g transform="scale(0.75)"><path fill="{ink}" d="{APERTURE}"/>{BAR} fill="{accent}"/></g>'
        f'<path fill="{ink}" transform="translate({off} 40)" d="{fmt(path)}"/>{bar}</svg>\n'
    )


def main() -> None:
    SRC.mkdir(exist_ok=True)
    for old in SRC.glob("*.svg"):
        old.unlink()
    (SRC / "mark.svg").write_text(mark(CREAM, SAGE), encoding="utf-8")  # primary: on dark
    (SRC / "mark-light.svg").write_text(mark(INK_DARK, SAGE_DEEP), encoding="utf-8")
    (SRC / "mark-mono.svg").write_text(mark("currentColor", "currentColor"), encoding="utf-8")
    (SRC / "favicon.svg").write_text(tile(), encoding="utf-8")
    (SRC / "app-icon.svg").write_text(tile(14), encoding="utf-8")
    path, dot, width = wordmark_paths()
    for name, ink, accent in (("", CREAM, SAGE), ("-light", INK_DARK, SAGE_DEEP), ("-mono", "currentColor", "currentColor")):
        svg, _ = wordmark_svg(path, dot, width, ink, accent)
        (SRC / f"wordmark{name}.svg").write_text(svg, encoding="utf-8")
        (SRC / f"logo{name}.svg").write_text(lockup_svg(path, dot, width, ink, accent), encoding="utf-8")
    (SRC / "wordmark-path.txt").write_text(f"{fmt(path)}\n{dot}\n{width}\n", encoding="utf-8")
    print("wrote", sorted(p.name for p in SRC.iterdir()))


if __name__ == "__main__":
    main()
