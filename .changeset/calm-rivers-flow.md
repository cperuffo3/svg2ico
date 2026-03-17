---
'@svg2ico/api': patch
---

**Backend:**

- Fix memory leak caused by transient-scoped logger creating unbounded instances
- Fix job queue timeout closures retaining input buffers after job completion
- Add connection pool limits and idle timeout to PostgreSQL adapter
- Optimize admin stats queries to use DB aggregation instead of loading full tables into memory
