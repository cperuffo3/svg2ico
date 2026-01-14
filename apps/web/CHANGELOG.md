# @starter/web

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

- **Frontend:**
  - Add SEO meta tags with Open Graph and Twitter card support
  - Add JSON-LD structured data for web application schema
  - Add robots.txt and sitemap.xml for search engine crawling
  - Add custom 404 error page with branding
  - Add Apple Touch icon and OG image assets
  - Fix production environment URL handling in API hooks

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
