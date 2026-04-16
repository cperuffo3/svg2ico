# @starter/web

## 0.10.0

### Minor Changes

- a70d056: **Backend:**
  - Add per-user daily activity time series to the user conversions endpoint for sparkline rendering
  - Return global normalization values (maxDailyCount, totalDays) so all sparklines share a consistent scale

  **Frontend:**
  - Replace bar chart in admin "Conversions by User" section with compact sparkline list
  - Add inline SVG sparkline showing each user's daily conversion activity over the full data lifetime
  - Display total and failed counts as plain numbers instead of stacked bars

## 0.9.0

### Minor Changes

- d144bd9: **Backend:**
  - Add per-user conversion counts endpoint (`GET /admin/stats/users/conversions`)

  **Frontend:**
  - Fix conversions graph to render successful (green) area in front of failed (red) area
  - Add "Conversions by User" stacked bar chart to Users admin tab

## 0.8.0

### Minor Changes

- 1481cad: **Backend:**
  - Add user growth statistics endpoint returning daily new and cumulative unique users over app lifetime

  **Frontend:**
  - Add Users tab to admin dashboard with cumulative and new-per-day growth chart
  - Improve Conversions chart x-axis to show a tick every day with labels only on Mondays
  - Update all area charts to use gradient-under-the-line minimalist aesthetic

## 0.7.0

### Minor Changes

- a0a0534: Improve SEO and CI workflows

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

## 0.6.3

### Patch Changes

- 84a96ab: **DevOps:**
  - Configure Dependabot to target develop branch instead of master for pull requests

## 0.6.2

## 0.6.1

## 0.5.0

### Minor Changes

- 1c5d802: **Backend:**
  - Add threat analysis and classification system for SVG security scanning
  - Add external reference detection to identify potential SSRF attempts
  - Add endpoint to reset failure statistics in admin dashboard

  **Frontend:**
  - Add client-side SVG validation to pre-catch invalid files before upload
  - Add upload error page with detailed validation feedback
  - Add error state display in conversion progress component
  - Improve FileUploadZone with comprehensive file validation

## 0.4.2

### Patch Changes

- 18ea671: fix styling issues and add railway referral button

## 0.4.1

### Patch Changes

- 83da2cc: fix screen flash issue

## 0.4.0

### Minor Changes

- 94bcd45: **Backend:**
  - Add SVG to ICO/ICNS/PNG conversion API with multi-size support
  - Add worker pool for parallel image processing with job queue
  - Add SVG sanitization and security validation
  - Add admin statistics endpoints for conversion metrics
  - Add rate limiting with Prisma-backed throttler storage
  - Add metrics tracking for conversions and performance

  **Frontend:**
  - Add home page with file upload zone and feature overview
  - Add conversion page with SVG preview and output format selection
  - Add context previews showing icons in Windows, macOS, and Chrome contexts
  - Add PNG background removal with color picker and tolerance controls
  - Add admin dashboard with conversion statistics and performance metrics
  - Add dark mode support with theme toggle
  - Add privacy policy and terms of service pages

  **DevOps:**
  - Add Prisma migrations for conversion tracking schema
  - Add database seed script with sample data

### Patch Changes

- 89394a8: fix railway deployment
- 8859a38: fix robots.txt

## 0.3.0

### Minor Changes

- 4c9022a: **Backend:**
  - Add SVG to ICO/ICNS/PNG conversion API with multi-size support
  - Add worker pool for parallel image processing with job queue
  - Add SVG sanitization and security validation
  - Add admin statistics endpoints for conversion metrics
  - Add rate limiting with Prisma-backed throttler storage
  - Add metrics tracking for conversions and performance

  **Frontend:**
  - Add home page with file upload zone and feature overview
  - Add conversion page with SVG preview and output format selection
  - Add context previews showing icons in Windows, macOS, and Chrome contexts
  - Add PNG background removal with color picker and tolerance controls
  - Add admin dashboard with conversion statistics and performance metrics
  - Add dark mode support with theme toggle
  - Add privacy policy and terms of service pages

  **DevOps:**
  - Add Prisma migrations for conversion tracking schema
  - Add database seed script with sample data

### Patch Changes

- 4c9022a: fix railway deployment

## 0.2.0

### Minor Changes

- 5da1063: **Backend:**
  - Add SVG to ICO/ICNS/PNG conversion API with multi-size support
  - Add worker pool for parallel image processing with job queue
  - Add SVG sanitization and security validation
  - Add admin statistics endpoints for conversion metrics
  - Add rate limiting with Prisma-backed throttler storage
  - Add metrics tracking for conversions and performance

  **Frontend:**
  - Add home page with file upload zone and feature overview
  - Add conversion page with SVG preview and output format selection
  - Add context previews showing icons in Windows, macOS, and Chrome contexts
  - Add PNG background removal with color picker and tolerance controls
  - Add admin dashboard with conversion statistics and performance metrics
  - Add dark mode support with theme toggle
  - Add privacy policy and terms of service pages

  **DevOps:**
  - Add Prisma migrations for conversion tracking schema
  - Add database seed script with sample data

## 0.1.3

### Patch Changes

- add install to init script

## 0.1.2

### Patch Changes

- fix initial deploy issues

## 0.1.1

### Patch Changes

- fix init script
