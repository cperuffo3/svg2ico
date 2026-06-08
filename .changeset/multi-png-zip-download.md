---
"@svg2ico/api": patch
"@svg2ico/web": patch
---

fix: multi-size PNG export now downloads a ZIP instead of a single PNG

The convert response for a multi-size PNG export is sent as a ZIP with the
filename in the `Content-Disposition` header, but CORS did not expose that
header to the browser. Cross-origin (web on :5173 → API on :3000), the frontend
read `null` for the header and fell back to naming the file `icon.png`, so a
multi-PNG ZIP was saved as a single `.png`.

- API: expose `Content-Disposition` (and `X-Processing-Time-Ms`) via CORS so the
  browser can read the real download filename.
- Web: fall back to `icons.zip` for multi-size PNG exports when the header is
  unavailable.
