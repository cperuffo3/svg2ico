---
'@svg2ico/api': minor
'@svg2ico/web': minor
---

**Frontend:**

- Add multi-size PNG export: add multiple resolutions to a list (type a size and click Add, or use one-click presets for common favicon/apple-touch/PWA sizes)
- Export a ZIP containing every requested PNG size; fall back to the single size box when no list is set

**Backend:**

- Add `outputSizes` option to the convert endpoint to render one PNG per size and bundle them as a ZIP
- Filter requested sizes against source dimensions for PNG inputs to avoid upscaling
