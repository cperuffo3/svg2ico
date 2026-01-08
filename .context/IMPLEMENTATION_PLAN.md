# Implementation Plan - svg2ico

Based on the project brief and UI/UX spec, this document outlines the implementation plan organized into logical phases.

---

## Phase 1: Backend Foundation

### 1.1 Database Schema Setup
- Add `ConversionMetric` and `RateLimit` models to `apps/api/prisma/schema.prisma`
- Run `pnpm db:generate` and `pnpm db:migrate`

### 1.2 Install Backend Dependencies
```bash
pnpm --filter @svg2ico/api add @resvg/resvg-js sharp sharp-ico png2icons
pnpm --filter @svg2ico/api add @nestjs/throttler
pnpm --filter @svg2ico/api add -D @types/multer
```

### 1.3 Create Conversion Module
- `apps/api/src/conversion/conversion.module.ts` - NestJS module
- `apps/api/src/conversion/conversion.controller.ts` - `POST /api/v1/convert` endpoint
- `apps/api/src/conversion/conversion.service.ts` - Core conversion logic:
  - SVG → PNG (resvg-js at multiple resolutions)
  - PNG → ICO (sharp-ico)
  - PNG → ICNS (png2icons)
  - In-memory processing, no file storage

### 1.4 Create Metrics Service
- `apps/api/src/metrics/metrics.module.ts`
- `apps/api/src/metrics/metrics.service.ts` - Async logging of conversion stats
- `apps/api/src/metrics/metrics.controller.ts` - `GET /api/v1/metrics` admin endpoint

### 1.5 Rate Limiting
- Configure `@nestjs/throttler` with Prisma-backed storage
- 60 conversions/hour per hashed IP

---

## Phase 2: Frontend Foundation

### 2.1 Install shadcn/ui Components
```bash
cd apps/web
npx shadcn@latest add button card slider radio-group checkbox progress toast alert
```

### 2.2 Set Up Design Tokens
- Configure CSS custom properties in `apps/web/src/index.css` per UI spec
- Set up color tokens, typography scale, spacing scale

### 2.3 Create Core Components
- `src/components/Dropzone.tsx` - Drag-and-drop file upload with states (empty, hover, invalid)
- `src/components/PreviewCanvas.tsx` - SVG preview with checkerboard transparency background
- `src/components/FormatSelector.tsx` - Radio card group for .ico/.icns/both
- `src/components/ScaleSlider.tsx` - Padding/scale control (50%-100%)
- `src/components/ConversionProgress.tsx` - Loading state with spinner

---

## Phase 3: Core Conversion Flow

### 3.1 API Integration
- `src/api/convert.ts` - TanStack Query mutation for conversion endpoint
- Handle multipart form-data upload
- Binary file download response handling

### 3.2 Build Main Converter Component
- `src/components/Converter.tsx` - State machine for conversion flow:
  - State 1: Empty (upload prompt)
  - State 2: Drag over (visual feedback)
  - State 3: File loaded (preview + options)
  - State 4: Converting (loading)
  - State 5: Success (download)
  - State 6: Error (retry options)

### 3.3 File Handling
- FileReader API for SVG preview
- Client-side validation (file type, size < 10MB)
- Blob URL creation for download trigger

---

## Phase 4: UI Polish & States

### 4.1 Layout Components
- `src/components/Header.tsx` - Logo, tagline, GitHub link
- `src/components/Footer.tsx` - Privacy policy, terms links
- Update `apps/web/src/App.tsx` with full page layout

### 4.2 Error Handling
- Toast notifications for errors
- Inline validation messages
- Error state UI with retry options
- Rate limit countdown display

### 4.3 Animations
- Page load fade-in
- Dropzone hover/drag-over transitions
- Success checkmark animation
- Error shake animation

### 4.4 Responsive Design
- Mobile layout (stacked, smaller preview)
- Tablet/desktop layout (side-by-side where applicable)

---

## Phase 5: Backend Hardening

### 5.1 Input Validation
- File size limit (10MB)
- SVG format validation
- Sanitize error messages (no file content leakage)

### 5.2 Processing Limits
- 30-second timeout
- Max SVG dimensions (4096x4096)
- Memory management for large files

### 5.3 Icon Resolution Generation
- ICO: 16x16, 32x32, 48x48, 256x256
- ICNS: Full set via png2icons (16-512 @1x and @2x)

---

## Phase 6: Final Integration

### 6.1 End-to-End Testing
- Test various SVG files (simple, complex, with transparency)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing

### 6.2 Health Check
- Extend existing health endpoint to include database status

### 6.3 Ad Placeholder
- Create placeholder component for future AdSense integration
- Desktop sidebar (300x250) and mobile banner (320x100)

---

## File Structure (New Files)

```
apps/api/
├── src/
│   ├── conversion/
│   │   ├── conversion.module.ts
│   │   ├── conversion.controller.ts
│   │   ├── conversion.service.ts
│   │   └── dto/
│   │       └── convert.dto.ts
│   ├── metrics/
│   │   ├── metrics.module.ts
│   │   ├── metrics.controller.ts
│   │   └── metrics.service.ts
│   └── rate-limit/
│       └── prisma-throttler.storage.ts
└── prisma/
    └── schema.prisma (updated)

apps/web/
└── src/
    ├── api/
    │   └── convert.ts
    ├── components/
    │   ├── Converter.tsx
    │   ├── Dropzone.tsx
    │   ├── PreviewCanvas.tsx
    │   ├── FormatSelector.tsx
    │   ├── ScaleSlider.tsx
    │   ├── ConversionProgress.tsx
    │   ├── Header.tsx
    │   ├── Footer.tsx
    │   └── AdPlaceholder.tsx
    ├── hooks/
    │   └── useConversion.ts
    └── lib/
        └── validation.ts
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SVG Rendering | resvg-js | 3-4x faster, excellent SVG compliance, no browser deps |
| ICO Generation | sharp-ico | High performance, libvips-based |
| ICNS Generation | png2icons | Platform-independent, TypeScript |
| State Management | React state + TanStack Query | Simple for single-page tool |
| Rate Limiting | @nestjs/throttler + Prisma | Database-backed, persistent across restarts |

---

## Implementation Order

1. **Phase 1** - Backend foundation (database + conversion endpoint)
2. **Phase 2** - Frontend foundation (components + design tokens)
3. **Phase 3** - Core conversion flow (wire up frontend to backend)
4. **Phase 4** - UI polish (animations, error handling, responsive)
5. **Phase 5** - Backend hardening (validation, limits, security)
6. **Phase 6** - Final integration (testing, health checks, ad placeholders)

---

*Last updated: January 2026*
