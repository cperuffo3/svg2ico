---
"@svg2ico/api": patch
---

fix: accept SVG files with leading comments before the root element

Uploading a valid SVG that begins with a comment (e.g. a license header like
JetBrains icon files ship with) was rejected with "The uploaded file is not a
valid SVG. Expected file to start with <svg or <?xml declaration."

The backend validation only accepted files whose first characters were `<svg`
or `<?xml`. It now skips anything that may legally precede the root element —
a BOM, XML declaration, comments, and a DOCTYPE — and requires the root
element itself to be `<svg`. This also tightens validation slightly: a file
starting with `<?xml` whose root element is not `<svg` is now rejected.
