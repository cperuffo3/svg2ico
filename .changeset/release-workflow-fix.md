---
'@svg2ico/api': patch
'@svg2ico/web': patch
---

ci: fix releases not deploying to Railway. The release workflow now pushes `master` and `production` atomically and no longer cancels in-progress runs (the version-commit push was cancelling the original run before it reached the production push). Also bumps `actions/checkout` and `actions/setup-node` to v7.
