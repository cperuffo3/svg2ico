---
'@svg2ico/api': patch
---

**Backend:**

- Fix "archiver is not a function" runtime error on ZIP downloads by migrating to archiver v8's named class exports (`new ZipArchive(...)`)
- Add local type declaration for archiver v8 since `@types/archiver` has not been updated upstream
