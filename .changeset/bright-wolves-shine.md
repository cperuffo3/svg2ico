---
'@svg2ico/api': minor
'@svg2ico/web': minor
---

**Backend:**

- Add per-user daily activity time series to the user conversions endpoint for sparkline rendering
- Return global normalization values (maxDailyCount, totalDays) so all sparklines share a consistent scale

**Frontend:**

- Replace bar chart in admin "Conversions by User" section with compact sparkline list
- Add inline SVG sparkline showing each user's daily conversion activity over the full data lifetime
- Display total and failed counts as plain numbers instead of stacked bars
