---
'@svg2ico/api': minor
'@svg2ico/web': minor
---

feat(api, web): Bucket admin daily counts and graphs in the viewer's timezone

Admin stats endpoints (`/admin/stats/users`, `/admin/stats/users/conversions`,
`/admin/stats/conversions`) now accept an optional `tz` query parameter (IANA name,
e.g. `America/Los_Angeles`). Daily date bucketing uses
`(created_at AT TIME ZONE 'UTC' AT TIME ZONE $tz)::date` and the date-range fill
computes "today" in that same zone, so the last bar of every chart and the
"New Users Today" tile reflect the viewer's local calendar day instead of the
server's UTC day. The web admin hooks send the browser's resolved timezone
automatically; missing or invalid values fall back to UTC.
