---
'@svg2ico/api': patch
'@svg2ico/web': patch
---

fix: recover from database restarts and show an outage screen when the API is down

After Postgres restarted uncleanly, the API's pooled connections went dead and
every query hung forever. Because rate limiting is stored in Postgres, every
conversion hung too, while the site kept looking normal.

- API: the pg pool now has connection, query and statement timeouts plus TCP
  keepalive, so dead connections fail fast and are replaced; the pool recovers
  on its own once Postgres is back. Idle-client errors are logged instead of
  crashing the process.
- API: rate limiting fails open when its database storage is unavailable, so
  conversions (which don't need the database) keep working during a DB outage.
- API: `/api/v1/health` answers 503 within 2s when the database is unreachable
  instead of hanging.
- Web: the app checks API health before first paint and shows a "We're
  experiencing problems" screen when the backend is down, then restores itself
  automatically on recovery. Conversion and SVG-preview requests now time out
  instead of hanging, and a failed conversion triggers an immediate re-check.
- Web: fix oversized-icon classes that rendered the error, 404, upload-error
  and outage page icons at text size.
- Web: stop committing compiled `vite.config.js`/`.d.ts`. Vite loads
  `vite.config.js` before `vite.config.ts`, so it was running a stale compiled
  copy, and every `pnpm build` rewrote those tracked files. The config project
  now emits only declarations, into `node_modules/.tmp`.
- Repo: add `.gitattributes` forcing LF so Windows checkouts match Prettier
  (`endOfLine: lf`); previously `core.autocrlf` produced hundreds of local
  `prettier/prettier` lint errors.
