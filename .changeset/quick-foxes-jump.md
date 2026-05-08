---
'@svg2ico/api': patch
---

**Backend:**

- Fix 500 errors on `/admin/stats/users`, `/admin/stats/users/conversions`, and `/admin/stats/conversions` caused by mismatched parameter placeholders in timezone-aware GROUP BY expressions
