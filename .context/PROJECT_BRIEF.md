# svg2ico - Project Brief

## Overview

svg2ico is a simple, client-side web application that converts SVG files to .ico (Windows icon) and .icns (macOS icon) formats. The app provides basic editing capabilities like scaling/padding and background removal, monetized through non-intrusive advertising. Future iterations will support PNG and JPEG input formats.

## Purpose

Developers and designers frequently need to convert SVG graphics to icon formats for applications, websites, and operating systems. Existing tools are often complex, require software installation, or upload files to servers (privacy concern). svg2ico solves this by providing a fast, privacy-focused, browser-based converter that processes everything client-side.

## Core User Flow

1. **Upload**: User drags/drops or selects an SVG file (no server upload - client-side only)
2. **Preview & Edit**: User sees a preview with optional editing tools:
   - Scale slider to add padding/adjust size within the square canvas
   - Background removal toggle (for SVGs with backgrounds)
3. **Convert**: User clicks "Convert" and selects output format (.ico, .icns, or both)
4. **Download**: Browser downloads the converted file(s) immediately

**Key principle**: Zero server storage. All conversion happens in the browser using JavaScript libraries.

## Technical Considerations

### Backend Processing (Revised from original frontend-only approach)
- **SVG to PNG**: [@resvg/resvg-js](https://github.com/yisibl/resvg-js) - Rust-powered, high-performance SVG renderer (3-4x faster than alternatives, no headless browser needed)
- **Image processing**: [sharp](https://sharp.pixelplumbing.com/) for high-performance PNG manipulation (scaling, padding)
- **ICO generation**: [sharp-ico](https://www.npmjs.com/package/sharp-ico) for multi-resolution Windows icons
- **ICNS generation**: [png2icons](https://www.npmjs.com/package/png2icons) for macOS icon bundles (platform-independent)
- **File handling**: Multipart form uploads, in-memory processing, no persistent storage

### Architecture
- **Hybrid**: Frontend for UI/validation, backend for conversion processing
- **State management**: React state + TanStack Query for API communication
- **File upload**: FileReader API for preview, multipart/form-data to backend
- **Download**: Backend returns binary files, frontend triggers download via Blob URLs

### Monetization
- **Ad placement**: Non-intrusive display ads (Google AdSense or similar)
  - Recommended: Sidebar ad (desktop) or banner above/below tool (mobile)
  - Avoid: Interstitials, popups, or ads blocking the conversion flow
- **Analytics**: Google Analytics or Plausible for usage tracking

### Hosting
- **Static hosting**: Vercel, Netlify, or Cloudflare Pages (no backend needed)
- **Domain**: svg2ico.com
- **SSL**: Automatic via hosting provider

## MVP Scope

### Must-Have Features
- [ ] Drag-and-drop SVG file upload
- [ ] SVG preview on canvas
- [ ] Scale/padding control (slider: 50%-100% of canvas size)
- [ ] Convert to .ico format (multiple resolutions: 16x16, 32x32, 48x48, 256x256)
- [ ] Convert to .icns format (standard macOS icon sizes)
- [ ] Download converted file(s)
- [ ] Responsive design (mobile & desktop)
- [ ] Basic error handling (invalid files, unsupported formats)
- [ ] Backend metrics tracking (conversion stats, performance data)
- [ ] Rate limiting (60 conversions/hour per IP)

### Nice-to-Have (MVP)
- [ ] "Convert Both" option (downloads .ico + .icns as .zip)
- [ ] Basic background removal (toggle for transparent background)
- [ ] File size display (original vs. converted)
- [ ] Ad integration (single non-intrusive placement)
- [ ] Admin metrics dashboard (view conversion stats, error rates)
- [ ] Health check endpoint (monitor backend + database status)

### Explicitly Out of Scope (MVP)
- PNG/JPEG input support (future enhancement)
- Batch conversion
- Advanced editing (color adjustments, filters)
- User accounts or file history
- Server-side processing

## Future Enhancements

### Phase 2: Multi-Format Support
- [ ] PNG input support
- [ ] JPEG input support (with transparency handling)
- [ ] Automatic background removal for raster images (AI-based)

### Phase 3: Advanced Features
- [ ] Batch conversion (multiple files at once)
- [ ] Preset padding templates (iOS app icons, Windows icons, etc.)
- [ ] Color picker for custom background replacement
- [ ] Image compression optimization
- [ ] Copy-paste from clipboard support

### Phase 4: Monetization & Growth
- [ ] Premium tier (remove ads, faster processing, batch conversion)
- [ ] API access for developers
- [ ] Browser extension version
- [ ] Integration with design tools (Figma plugin?)

## Technical Stack

### Frontend (apps/web)
- React 19 + TypeScript
- Vite for build tooling
- Tailwind CSS v4 for styling
- shadcn/ui for UI components
- TanStack Query (if API calls needed)

### Backend (apps/api) - Required for MVP
- **NestJS** REST API with conversion endpoint
- **Dependencies**: @resvg/resvg-js, sharp, sharp-ico, png2icons
- **Database**: PostgreSQL via Prisma for metrics tracking (NOT file storage)
- **Stateless file processing**: No file storage, all conversion in-memory
- **Rate limiting**: Database-backed throttling (@nestjs/throttler + Prisma)
- Used for:
  - SVG to PNG/ICO/ICNS conversion
  - Complex SVG feature handling (fonts, filters, external resources)
  - Consistent cross-browser output
  - Conversion metrics and analytics collection

### Libraries Selected (Research Complete)
- [x] **SVG rendering**: [@resvg/resvg-js](https://github.com/yisibl/resvg-js) (Rust-powered, backend)
- [x] **ICO encoding**: [sharp-ico](https://www.npmjs.com/package/sharp-ico) + [sharp](https://sharp.pixelplumbing.com/) (backend)
- [x] **ICNS encoding**: [png2icons](https://www.npmjs.com/package/png2icons) (backend, creates both ICO and ICNS)
- [x] **Background removal**: SVG transparency passthrough (MVP), [remove.bg API](https://www.remove.bg/api) for Phase 2 raster inputs

## Success Metrics

- **Primary**: Successful conversion rate (% of uploads that result in downloads)
- **Secondary**:
  - Time to conversion (should be <5 seconds)
  - Mobile usage rate (aim for 30%+ mobile traffic)
  - Ad revenue per 1000 conversions
- **User satisfaction**: Low bounce rate on conversion page

## Recommended Technical Approach (Research-Based)

### Architecture Decision: Frontend-Only vs. Hybrid

**RECOMMENDED: Hybrid Architecture (Client + Backend)**

While the original brief suggested a frontend-only approach, research into SVG handling and icon encoding reveals significant advantages to a hybrid model:

#### Frontend (apps/web) Responsibilities:
- **File upload interface**: Drag-and-drop SVG file handling
- **Preview rendering**: Display SVG in browser using native SVG rendering
- **Basic UI controls**: Scale/padding sliders, format selection
- **File download**: Receive converted files from backend and trigger download
- **Client-side validation**: File size checks, SVG format validation

#### Backend (apps/api) Responsibilities:
- **SVG to PNG conversion**: Using resvg-js (Rust-powered) for high-performance rendering with excellent SVG spec compliance
- **ICO encoding**: Multi-resolution ICO file generation
- **ICNS encoding**: macOS icon format with full resolution support
- **Image processing**: Scaling, padding, background handling

#### Why Backend Processing is Better:

1. **Superior SVG compatibility**: Browser Canvas API has limitations with complex SVG features (external stylesheets, fonts, filters). resvg-js provides excellent SVG spec compliance without browser inconsistencies.

2. **Consistent output**: Server-side rendering ensures identical results across all user devices (no variations due to browser differences). resvg-js produces byte-identical output across all platforms.

3. **High performance**: resvg-js is 3-4x faster than Sharp or canvas-based solutions, with no headless browser overhead.

4. **Better library ecosystem**: Node.js has mature, well-maintained libraries (png2icons, sharp-ico) that aren't available in browsers.

5. **Resource management**: Icon encoding (especially ICNS with multiple resolutions) is CPU-intensive. Offloading to server prevents browser freezing.

6. **Lightweight deployment**: No Puppeteer/Chromium required - resvg-js has zero dependencies and simple deployment.

7. **Future-proof**: Sets up infrastructure for Phase 2 features (AI background removal, batch processing, API access).

### Recommended Technology Stack

#### SVG to PNG Conversion:
- **Primary approach**: [@resvg/resvg-js](https://github.com/yisibl/resvg-js) (Rust-powered, Node.js)
  - 3-4x faster than Sharp or canvas-based alternatives (~40 ops/sec in benchmarks)
  - Excellent SVG spec compliance (filters, gradients, masks, clipping, text)
  - Zero dependencies, no headless browser required
  - Byte-identical output across all platforms (Windows, macOS, Linux, ARM)
  - Supports custom fonts, background colors, cropping, scaling
  - Built on resvg (Rust) with napi-rs bindings
- **Alternative**: [svg-to-png](https://github.com/vincerubinetti/svg-to-png) approach (Browser Canvas API)
  - Could be used for simple SVGs in future client-side-only mode
  - Limitations: external resources blocked by CORS, font dependency on user's system

#### PNG to ICO Encoding:
- **Backend**: [sharp-ico](https://www.npmjs.com/package/sharp-ico) with [sharp](https://sharp.pixelplumbing.com/)
  - High-performance Node.js image processing
  - Built on libvips (fastest image library)
  - Handles multi-resolution ICO files (16x16, 32x32, 48x48, 256x256)
  - 155K+ weekly downloads, actively maintained
- **Alternative**: [png-to-ico](https://www.npmjs.com/package/png-to-ico) (pure JavaScript, no native dependencies)

#### PNG to ICNS Encoding:
- **Backend**: [png2icons](https://www.npmjs.com/package/png2icons) (Node.js)
  - **Platform-independent** (no macOS requirement)
  - Zero native dependencies
  - Generates complete resolution set: 16x16 through 512x512@2x
  - Creates both ICO and ICNS from single source
  - TypeScript-based, well-maintained

### Database Decision: **REQUIRED for Metrics Tracking**

The backend will use a database for **metrics only**, maintaining zero file storage:

**What IS stored (metrics/analytics)**:
- Conversion counts and success/failure rates
- File size distributions (anonymized)
- Output format preferences (ICO, ICNS, both)
- Processing time statistics
- Error types and frequencies
- Browser/platform analytics (user-agent data)
- IP-based rate limiting counters (temporary, no PII)
- Timestamp data for traffic analysis

**What IS NOT stored (privacy-first)**:
- ❌ Uploaded SVG files
- ❌ Generated ICO/ICNS files
- ❌ File contents or previews
- ❌ User identities (unless premium accounts added later)
- ❌ Conversion history per user

**Processing remains stateless**:
- Accept SVG upload via multipart/form-data
- Process conversion in memory
- Log metrics to database (non-blocking, async)
- Return ICO/ICNS file(s) immediately
- Clean up temporary data after response

**Future database use** (Phase 4):
- Premium user accounts and subscriptions
- API access tokens and quotas
- Saved preset configurations (padding, scale settings)

### Prisma Database Schema (MVP)

```prisma
model ConversionMetric {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())

  // Input metrics
  inputSizeBytes  Int
  inputFormat     String   @default("svg")

  // Output metrics
  outputFormat    String   // "ico", "icns", "both"
  outputSizeBytes Int?

  // Processing metrics
  processingTimeMs Int
  success         Boolean
  errorType       String?
  errorMessage    String?

  // Analytics (no PII)
  userAgent       String?
  ipHash          String?  // Hashed IP for rate limiting only

  @@index([createdAt])
  @@index([success])
  @@index([outputFormat])
}

model RateLimit {
  id           String   @id @default(cuid())
  ipHash       String   @unique
  requestCount Int      @default(1)
  windowStart  DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([ipHash])
  @@index([windowStart])
}
```

**Privacy notes**:
- `ipHash`: SHA-256 hash of IP address (not reversible), used only for rate limiting
- No `userId` field in MVP (anonymous conversions)
- `errorMessage` truncated to 500 chars max, sanitized to remove potential file content
- Metrics auto-aggregated daily, detailed records deleted after 90 days (GDPR compliance)

### Detailed Processing Flow

```
User uploads SVG → Frontend validates file
                  ↓
           POST /api/v1/convert
           (multipart form: file, options)
                  ↓
Backend receives SVG → Check rate limit (DB query)
                     → resvg-js renders to PNG(s)
                     → sharp/png2icons encode to ICO/ICNS
                     → Log metrics (async, non-blocking):
                        • Conversion success/failure
                        • File size, format, processing time
                        • Browser/platform data
                     → Return binary file(s)
                     → Clean up temp data
                  ↓
Frontend triggers download(s)
```

### Icon Resolution Specifications

#### ICO Format (Windows):
- **16x16**: Taskbar, small icons
- **32x32**: Standard desktop icons
- **48x48**: Large desktop icons
- **256x256**: High-DPI displays, Windows Vista+
- **Optional**: 64x64, 128x128 for completeness

#### ICNS Format (macOS):
Complete icon set (png2icons generates all automatically):
- **16x16** (@1x and @2x)
- **32x32** (@1x and @2x)
- **64x64** (@1x and @2x)
- **128x128** (@1x and @2x)
- **256x256** (@1x and @2x)
- **512x512** (@1x and @2x)

### File Size & Processing Limits

**Recommended limits**:
- **Max SVG file size**: 10MB (sufficient for complex vector graphics)
- **Max SVG dimensions**: 4096x4096px (reasonable upper bound for icon source)
- **Processing timeout**: 30 seconds (covers complex SVG rendering)
- **Rate limiting**: 60 conversions/hour per IP (prevent abuse, no auth needed)

## Open Questions

1. ~~**ICO/ICNS libraries**: Which browser-compatible libraries exist? May need to build custom encoders.~~ **ANSWERED**: Use sharp-ico + png2icons on backend (Node.js)
2. **Background removal**: Start with simple transparency detection or invest in AI API from start? **RECOMMENDATION**: MVP uses simple transparency passthrough (SVGs already support alpha), Phase 2 adds AI removal for raster inputs
3. ~~**File size limits**: Cap SVG file size at 5MB? 10MB?~~ **ANSWERED**: 10MB max
4. ~~**Icon resolutions**: Which sizes should .ico include? (Recommend: 16, 32, 48, 256)~~ **ANSWERED**: 16, 32, 48, 256 (standard Windows set)
5. ~~**ICNS sizes**: Full iconset or subset? (Recommend: 16, 32, 64, 128, 256, 512, 1024)~~ **ANSWERED**: Full iconset via png2icons (automatic)
6. **Ad network**: Google AdSense, Carbon Ads, or other? **RECOMMENDATION**: Google AdSense for MVP (easiest setup), evaluate Carbon Ads after launch for developer audience

## Privacy & Legal

- **Zero file storage**: Files processed in-memory only, never saved to disk or database
- **Metrics collection**: Aggregate usage statistics (counts, sizes, times) without PII
- **No conversion history**: Users cannot retrieve past conversions (by design)
- **Privacy policy**: Required for analytics/ads, emphasize no file retention
- **Terms of service**: Standard liability limitations, clarify data handling
- **Cookie consent**: Required for ads/analytics (GDPR/CCPA compliance)
- **Marketing message**: "Your files never leave your browser... until they reach our server for processing, then they're immediately deleted" → "Zero file storage, complete privacy"

## Next Steps

1. ~~Research and test ICO/ICNS encoding libraries for browser compatibility~~ **COMPLETE** (See "Recommended Technical Approach" section)
2. Set up project with `pnpm init-project` → rename to svg2ico
3. Design database schema for metrics (Prisma):
   - `ConversionMetric` model: timestamp, inputSize, outputFormat, processingTime, success, errorType, userAgent, ipHash (for rate limiting)
   - `RateLimit` model: ipHash, requestCount, windowStart
4. Install backend dependencies: `@resvg/resvg-js`, `sharp`, `sharp-ico`, `png2icons`
5. Build proof-of-concept: Backend API endpoint for SVG → PNG → ICO/ICNS conversion
6. Implement metrics logging (async, non-blocking after conversion)
7. Design UI mockup (single-page app with upload, preview, options, download flow)
8. Implement frontend file upload + preview using FileReader API
9. Create conversion API endpoint (`POST /api/v1/convert`) with multipart file handling
10. Implement download flow: Backend returns files → Frontend triggers download
11. Add rate limiting (@nestjs/throttler with Prisma storage)
12. Add admin dashboard endpoint (`GET /api/v1/metrics`) for analytics review
13. Test across browsers (Chrome, Firefox, Safari, Edge) and various SVG files
14. Set up hosting: Frontend (Vercel/Netlify), Backend (Railway/Render/Fly.io with PostgreSQL)
15. Configure domain (svg2ico.com) with SSL
16. Add analytics (Google Analytics) and ads (Google AdSense)
17. Create privacy policy (emphasize zero file storage) and terms of service
18. Soft launch and gather feedback
