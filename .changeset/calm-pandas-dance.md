---
'@svg2ico/api': minor
'@svg2ico/web': minor
---

**Backend:**

- Remove the unused `users` table (Prisma model, migration, and seed data)
- Admin user-growth and conversions time series now return a continuous daily series from the first recorded day through today, zero-filling days with no activity
- `GET /admin/stats/users/conversions` no longer caps at 50 users — returns all users sorted by total conversions descending

**Frontend:**

- Admin "Users" and "Conversions" charts now plot the entire data lifetime instead of clipping at the last day with activity (or the last 30 days for conversions)
- Weekly x-axis ticks anchored on Monday with a month/year label only when crossing into a new month; hourly view ticks every hour with labels every 4 hours
- "Conversions by User" section now shows every user, split across two equal side-by-side cards with narrower sparklines, preserving most-to-least ordering
- Rename the conversions chart "Last 30 Days" toggle to "All Time"
