---
'@svg2ico/api': minor
'@svg2ico/web': minor
---

**Backend:**

- Add structured SVG error payloads carrying `errorType`, `matchedPatterns`, `patternLocations`, and `canSubmit` so the frontend can render rich error UX
- Add SSRF-safe inlining of external `<image href="https://...">` references so resvg can render them; reject content-type / blocked-host / size / HTTP failures as hard errors
- Add `POST /api/v1/convert/svg-preview` endpoint that returns the inlined SVG for the upload preview (only invoked when external refs are present)
- Add `ErrorSubmission` Prisma model and migration for opt-in user submissions of failed SVGs
- Add `POST /api/v1/convert/error-submissions` (public, rate-limited) plus admin `GET/PATCH/DELETE /api/v1/admin/error-submissions[/:id]` routes
- Preserve HttpException structured response bodies through the global exception filter so extra fields reach the client
- Switch to `app.useBodyParser('json', { limit: '12mb' })` to accept submission payloads and avoid the direct `express` import
- Use `createRequire` for the CJS `archiver` import to fix Node 24 ESM interop

**Frontend:**

- Add `SvgErrorDialog` with a Monaco XML editor that prettifies the SVG and highlights the problematic block when conversion fails
- Add opt-in submission flow inside the dialog, posting the SVG plus error context to the new submissions endpoint
- Add admin **Submissions** tab with list/detail view: inline preview, Monaco source viewer with highlights, error metadata, mark reviewed/unreviewed, reviewer notes, delete
- Add a "View details and submit file for review" link to the inline conversion error so the dialog can be re-opened
- Inline external image references client-side (via the new preview endpoint) only when the SVG actually contains them, so the upload preview matches what conversion will produce
- Render the admin submissions inline preview through the same preview endpoint so external images show despite the page CSP
- Match Monaco's theme to the app's light/dark setting via the existing `useTheme` hook
- Add `cursor-pointer` to admin submission list rows
