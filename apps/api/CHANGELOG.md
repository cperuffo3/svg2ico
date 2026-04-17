# @starter/api

## 0.11.0

### Minor Changes

- 5718562: **Backend:**
  - Remove the unused `users` table (Prisma model, migration, and seed data)
  - Admin user-growth and conversions time series now return a continuous daily series from the first recorded day through today, zero-filling days with no activity
  - `GET /admin/stats/users/conversions` no longer caps at 50 users — returns all users sorted by total conversions descending

  **Frontend:**
  - Admin "Users" and "Conversions" charts now plot the entire data lifetime instead of clipping at the last day with activity (or the last 30 days for conversions)
  - Weekly x-axis ticks anchored on Monday with a month/year label only when crossing into a new month; hourly view ticks every hour with labels every 4 hours
  - "Conversions by User" section now shows every user, split across two equal side-by-side cards with narrower sparklines, preserving most-to-least ordering
  - Rename the conversions chart "Last 30 Days" toggle to "All Time"

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

## 0.6.3

### Patch Changes

- 84a96ab: **DevOps:**
  - Configure Dependabot to target develop branch instead of master for pull requests

## 0.6.2

### Patch Changes

- 27aa85a: **Backend:**
  - Fix raw SQL query using Prisma model names instead of mapped table/column names in admin overview endpoint

## 0.6.1

### Patch Changes

- 410d60d: **Backend:**
  - Fix memory leak caused by transient-scoped logger creating unbounded instances
  - Fix job queue timeout closures retaining input buffers after job completion
  - Add connection pool limits and idle timeout to PostgreSQL adapter
  - Optimize admin stats queries to use DB aggregation instead of loading full tables into memory

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

## 0.4.1

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
