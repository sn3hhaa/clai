# Clai brand guidelines

## Mark

An open **C** (the conversation) holding a small **evidence block** (the cited passage).
It's built from two shapes so it reads at 16 px.

| File | Use |
|---|---|
| `source/mark.svg` | light backgrounds |
| `source/mark-dark.svg` | dark backgrounds |
| `source/mark-mono.svg` | single colour (`currentColor`) |
| `source/favicon.svg` | browser tab; switches colours with the system theme |
| `source/app-icon.svg` | app and touch icons (mark on a warm-white tile) |
| `source/logo.svg`, `logo-dark.svg`, `logo-mono.svg` | mark + wordmark lockups |
| `source/wordmark.svg` | wordmark alone ("clai", outlined Geist SemiBold) |
| `exports/*.png` | transparent PNG renders of all of the above |
| `social/*.png` | GitHub social preview (1280×640), X and LinkedIn cards (1200×630) |

Regenerate the exports with `cd frontend; npm run brand`.

**Clear space:** keep at least the height of the evidence block around the mark.
**Don't:** recolour the block anything but mint, rotate or outline the mark, add
effects, or set the wordmark in another typeface.

## Colour

| Token | Hex | Use |
|---|---|---|
| ink | `#0F0F0E` | text, mark, primary buttons |
| ink-2 | `#626260` | secondary text, lead paragraphs |
| ink-3 | `#8B8B88` | captions, metadata |
| background | `#FFFFFF` | pages |
| surface-2 | `#F5F4F1` | cards |
| line | `#E7E6E2` | hairlines |
| mint | `#2E9E85` | the evidence block, small accents, graphics only |
| mint-ink | `#1F7A66` | mint text on white (passes WCAG AA) |
| seafoam | `#7FE0C4` | the Aura, evidence highlights |

## Type

- **Headings:** STIX Two Text, regular, 40/48 px on the website.
- **Body and UI:** Inter, 16/25.6 px; lead text 19 px in ink-2.
- **References and status:** Geist Mono, for clause/page references and labels.
- **Wordmark:** Geist SemiBold, outlined.

All four are licensed under the SIL Open Font License. Copies and licences are in `fonts/`.

## Imagery

Painted landscape bands use George Inness, *Landscape* (1884 or 1889), from The
Metropolitan Museum of Art's Open Access collection (public domain, object 11231).
Credit it wherever it appears. Product imagery must be real screenshots of Clai.
Demonstrations, such as the homepage Aura, are labelled as such.
