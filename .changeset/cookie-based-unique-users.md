---
'@svg2ico/api': minor
'@svg2ico/web': minor
---

Switch unique-user analytics from request IP to a cookie-issued anonymous client ID.

The previous IP-based count was suppressed by Express not trusting the upstream proxy: every visitor through a given CDN/PoP shared the proxy's IP, so the unique-user count plateaued (~58) regardless of real new visitors.

**Changes**

- Prisma migration `switch_to_cookie_client_id` drops `ip_hash` from `conversion_metrics` and adds a nullable `client_id_hash`. Conversion volume, format, performance, and failure history are preserved; the unique-user count restarts from deploy.
- New API middleware sets a first-party `svg2ico_cid` cookie (HttpOnly, SameSite=Lax, Secure in production, 1-year max age) containing a random UUID. Only a truncated SHA-256 of the UUID is stored server-side.
- `trust proxy` is set to `2` in `main.ts` to reflect the Cloudflare → Railway → app hop chain (used for Secure-cookie detection and `req.protocol`).
- Rate limiter switched to a `CfThrottlerGuard` that reads the real client IP from `CF-Connecting-IP` (with `req.ip` fallback for non-CF paths). This also fixes the original rate-limiting flaw where every visitor behind a Cloudflare PoP shared one bucket.
- Web frontend sends `credentials: 'include'` on the convert request so the cookie round-trips.
- Privacy policy updated to disclose the analytics cookie and its lifetime.

**Required env on deploy**

`CORS_ORIGIN=https://svg2ico.com` must be set on the API service in Railway. The browser will refuse to send the cookie if `Access-Control-Allow-Origin` is wrong.

**Migration note**

After deploy, the admin Users dashboard will read 0 and grow as cookie-tracked traffic arrives. Historical rows have `client_id_hash = NULL` and are intentionally excluded from unique-user queries.
