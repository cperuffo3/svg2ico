---
"@svg2ico/web": minor
---

Improve SEO and CI workflows

**Web SEO:**
- Add reusable `SEOHead` component with per-page meta tags, Open Graph, and canonical URLs
- Add `StructuredData` component for JSON-LD structured data on the homepage
- Add sitemap.xml with routes for all pages
- Extract FAQ and How It Works data into standalone modules for reuse
- Add SEO meta tags to Convert, API Docs, Privacy, and Terms pages
- Add React Helmet Async for document head management

**CI/CD:**
- Group Dependabot PRs into production deps, dev deps, major updates, and GitHub Actions
- Add smoketest workflow (type-check, lint, build) for Dependabot PRs
- Skip changeset requirement for Dependabot PRs
- Add RELEASING.md documentation
