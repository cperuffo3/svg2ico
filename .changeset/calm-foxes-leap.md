---
'@svg2ico/api': patch
---

**Backend:**

- Fix false-positive SVG rejection where the post-sanitization event-handler check matched `on…=` substrings inside legitimate attribute names (e.g. `diffuseConstant=` on `<feDiffuseLighting>`), causing valid Inkscape SVGs to fail with a "could not be safely processed" error. The detector now requires a whitespace boundary before `on`, matching the stricter pre-sanitization pattern.
