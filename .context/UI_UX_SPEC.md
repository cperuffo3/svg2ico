# UI/UX Specification - svg2ico

This document defines the visual design, layout, and interaction patterns for the svg2ico web application.

## Design System

- **Framework**: shadcn/ui components with Tailwind CSS v4
- **Font**: Geist (already configured in starter)
- **Theme**: Light mode only for MVP (dark mode in future)
- **Style**: Clean, minimal, single-purpose tool aesthetic
- **Accent Color**: Blue (conversion/action) with subtle gradients
- **Personality**: Fast, trustworthy, privacy-focused

## Color Tokens

### Light Theme (MVP)

```css
/* Background */
--background-page: hsl(210 20% 98%);      /* Subtle blue-gray tint */
--background-card: hsl(0 0% 100%);         /* Pure white cards */
--background-dropzone: hsl(210 40% 96%);   /* Light blue for drop area */
--background-dropzone-active: hsl(210 50% 94%); /* Highlighted on drag */

/* Foreground */
--foreground-primary: hsl(222 47% 11%);    /* Near black */
--foreground-secondary: hsl(215 16% 47%);  /* Muted gray */
--foreground-muted: hsl(215 16% 65%);      /* Placeholder text */

/* Accent Colors */
--accent-primary: hsl(221 83% 53%);        /* Blue - main CTA */
--accent-primary-hover: hsl(221 83% 47%);  /* Darker blue on hover */
--accent-success: hsl(142 71% 45%);        /* Green - success states */
--accent-warning: hsl(38 92% 50%);         /* Yellow/orange - warnings */
--accent-destructive: hsl(0 84% 60%);      /* Red - errors */

/* Borders */
--border-default: hsl(214 32% 91%);        /* Subtle borders */
--border-focus: hsl(221 83% 53%);          /* Blue focus ring */
--border-dropzone: hsl(221 83% 53%);       /* Dashed border on drop */
```

## Typography Scale

```css
--font-heading-1: 2rem (32px), font-weight: 700    /* Page title */
--font-heading-2: 1.5rem (24px), font-weight: 600  /* Section headers */
--font-body: 1rem (16px), font-weight: 400         /* Body text */
--font-body-sm: 0.875rem (14px), font-weight: 400  /* Secondary text */
--font-caption: 0.75rem (12px), font-weight: 500   /* Labels, hints */
```

## Spacing Scale

```css
--space-xs: 0.25rem (4px)
--space-sm: 0.5rem (8px)
--space-md: 1rem (16px)
--space-lg: 1.5rem (24px)
--space-xl: 2rem (32px)
--space-2xl: 3rem (48px)
```

---

## Page Layout

### Overall Structure

```
+------------------------------------------------------------------+
|                         HEADER (sticky)                          |
|  [Logo: svg2ico]                              [GitHub] [Theme?]  |
+------------------------------------------------------------------+
|                                                                  |
|                     MAIN CONTENT AREA                            |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |                                                            |  |
|  |                    CONVERTER CARD                          |  |
|  |                    (centered, max-width: 640px)            |  |
|  |                                                            |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|                        [AD PLACEMENT]                            |
|                        (below converter)                         |
|                                                                  |
+------------------------------------------------------------------+
|                           FOOTER                                 |
|        Privacy Policy | Terms | Made with care                   |
+------------------------------------------------------------------+
```

### Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Full-width card, stacked controls, smaller preview |
| Tablet | 640-1024px | Centered card with padding |
| Desktop | > 1024px | Centered card, optional sidebar ad |

---

## Screen States

### State 1: Empty (Initial Load)

```
+----------------------------------------------------------+
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |     +--------------------------------------+       |  |
|  |     |                                      |       |  |
|  |     |    [Cloud Upload Icon - 48px]        |       |  |
|  |     |                                      |       |  |
|  |     |    Drag & drop your SVG here         |       |  |
|  |     |              or                      |       |  |
|  |     |    [Browse Files] (text button)      |       |  |
|  |     |                                      |       |  |
|  |     |    Accepts .svg files up to 10MB     |       |  |
|  |     |                                      |       |  |
|  |     +--------------------------------------+       |  |
|  |              (dashed border, rounded)              |  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

**Dropzone Specifications:**
- Border: 2px dashed `--border-default`
- Border radius: 12px
- Padding: 48px (desktop), 32px (mobile)
- Background: `--background-dropzone`
- Icon: Lucide `Upload` or `CloudUpload`, 48px, `--foreground-muted`
- Text: "Drag & drop your SVG here" - `--foreground-primary`, 18px
- Subtext: "or" - `--foreground-muted`, 14px
- Link: "Browse Files" - `--accent-primary`, underline on hover
- Hint: "Accepts .svg files up to 10MB" - `--foreground-muted`, 12px

### State 2: Drag Over (File Hovering)

```
+----------------------------------------------------------+
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |     +======================================+       |  |
|  |     ||                                    ||       |  |
|  |     ||   [Cloud Upload Icon - animated]   ||       |  |
|  |     ||                                    ||       |  |
|  |     ||      Drop your file here           ||       |  |
|  |     ||                                    ||       |  |
|  |     +======================================+       |  |
|  |        (solid border, scale up slightly)           |  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

**Changes from Empty State:**
- Border: 2px solid `--accent-primary` (solid, not dashed)
- Background: `--background-dropzone-active`
- Transform: scale(1.02) with 150ms ease transition
- Icon: Subtle bounce animation
- Text changes to: "Drop your file here"

### State 3: File Loaded (Preview + Options)

```
+----------------------------------------------------------+
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |  +----------------+  +-------------------------+   |  |
|  |  |                |  |  filename.svg           |   |  |
|  |  |    [SVG        |  |  24.5 KB                |   |  |
|  |  |    PREVIEW]    |  |  [x] Remove             |   |  |
|  |  |                |  +-------------------------+   |  |
|  |  |    200x200     |                                |  |
|  |  |                |  Scale & Padding               |  |
|  |  +----------------+  +-------------------------+   |  |
|  |                      | [===========|----] 75%  |   |  |
|  |                      +-------------------------+   |  |
|  |                      50%                    100%   |  |
|  |                                                    |  |
|  |  Output Format                                     |  |
|  |  +------------+ +------------+ +---------------+   |  |
|  |  | [x] .ico   | | [x] .icns  | | [ ] Both      |   |  |
|  |  | Windows    | | macOS      | | Download .zip |   |  |
|  |  +------------+ +------------+ +---------------+   |  |
|  |                                                    |  |
|  |  [ ] Remove background (make transparent)          |  |
|  |                                                    |  |
|  |  +------------------------------------------------+|  |
|  |  |            [Convert & Download]                ||  |
|  |  +------------------------------------------------+|  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

**Preview Panel:**
- Size: 200x200px (desktop), 160x160px (mobile)
- Background: Checkerboard pattern (to show transparency)
- Border: 1px solid `--border-default`
- Border radius: 8px
- SVG rendered centered, respecting aspect ratio

**File Info:**
- Filename: truncate with ellipsis if > 24 chars
- File size: formatted (KB/MB)
- Remove button: text link, `--accent-destructive` on hover

**Scale Slider:**
- shadcn/ui Slider component
- Range: 50% to 100%
- Default: 100%
- Shows current value as percentage
- Updates preview in real-time

**Format Selection:**
- Radio button group styled as cards
- Three options: .ico, .icns, Both
- Default: .ico selected
- Card style: border highlight when selected

**Background Removal Toggle:**
- shadcn/ui Checkbox
- Label: "Remove background (make transparent)"
- Unchecked by default

**Convert Button:**
- Full width
- Height: 48px
- Background: `--accent-primary`
- Text: White, 16px, font-weight: 600
- Border radius: 8px
- Hover: `--accent-primary-hover`

### State 4: Converting (Loading)

```
+----------------------------------------------------------+
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |  +----------------+  +-------------------------+   |  |
|  |  |                |  |  filename.svg           |   |  |
|  |  |    [SVG        |  |  24.5 KB                |   |  |
|  |  |    PREVIEW]    |  +-------------------------+   |  |
|  |  |                |                                |  |
|  |  |    (dimmed)    |  Converting...                 |  |
|  |  |                |  [=====>          ] 45%        |  |
|  |  +----------------+                                |  |
|  |                                                    |  |
|  |  (All controls disabled/dimmed)                    |  |
|  |                                                    |  |
|  |  +------------------------------------------------+|  |
|  |  |    [Spinner]  Converting to .ico...            ||  |
|  |  +------------------------------------------------+|  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

**Loading State:**
- Preview: 50% opacity overlay
- Progress bar: indeterminate or percentage if available
- Spinner: shadcn/ui Spinner in button
- Button disabled, shows current action
- All inputs disabled

### State 5: Success (Download Ready)

```
+----------------------------------------------------------+
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |     +--------------------------------------+       |  |
|  |     |                                      |       |  |
|  |     |    [Checkmark Circle Icon - green]   |       |  |
|  |     |                                      |       |  |
|  |     |    Conversion Complete!              |       |  |
|  |     |                                      |       |  |
|  |     |    filename.ico (45.2 KB)            |       |  |
|  |     |    Downloaded automatically          |       |  |
|  |     |                                      |       |  |
|  |     |    [Download Again]  [Convert New]   |       |  |
|  |     |                                      |       |  |
|  |     +--------------------------------------+       |  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

**Success State:**
- Icon: Lucide `CheckCircle2`, 64px, `--accent-success`
- Auto-download triggers immediately
- Shows output filename and size
- Two buttons:
  - "Download Again" - secondary style (outline)
  - "Convert Another" - primary style (filled)

### State 6: Error

```
+----------------------------------------------------------+
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |     +--------------------------------------+       |  |
|  |     |                                      |       |  |
|  |     |    [Alert Circle Icon - red]         |       |  |
|  |     |                                      |       |  |
|  |     |    Conversion Failed                 |       |  |
|  |     |                                      |       |  |
|  |     |    The SVG file contains unsupported |       |  |
|  |     |    features. Please try a simpler    |       |  |
|  |     |    SVG or contact support.           |       |  |
|  |     |                                      |       |  |
|  |     |    [Try Again]  [Upload Different]   |       |  |
|  |     |                                      |       |  |
|  |     +--------------------------------------+       |  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
```

**Error Types & Messages:**

| Error Code | User Message |
|------------|--------------|
| FILE_TOO_LARGE | "File exceeds 10MB limit. Please use a smaller SVG." |
| INVALID_FORMAT | "This doesn't appear to be a valid SVG file." |
| CONVERSION_FAILED | "Conversion failed. The SVG may contain unsupported features." |
| RATE_LIMITED | "Too many conversions. Please wait a few minutes." |
| SERVER_ERROR | "Something went wrong on our end. Please try again." |
| NETWORK_ERROR | "Unable to connect. Check your internet connection." |

---

## Component Specifications

### Header

```
+------------------------------------------------------------------+
| svg2ico                                              [GitHub]    |
| [Logo/Icon] Convert SVG to ICO & ICNS                            |
+------------------------------------------------------------------+
```

- Height: 64px
- Background: `--background-card` with subtle bottom border
- Logo: "svg2ico" in Geist font, 24px, bold
- Tagline: "Convert SVG to ICO & ICNS" - 14px, `--foreground-secondary`
- GitHub link: Icon only, links to project repo (if open source)

### Dropzone Component

| Property | Value |
|----------|-------|
| Min Height | 280px (desktop), 200px (mobile) |
| Max Width | 100% of card |
| Border | 2px dashed `--border-default` |
| Border Radius | 12px |
| Padding | 48px (desktop), 24px (mobile) |
| Transition | all 150ms ease |

**States:**
- Default: Dashed border, muted colors
- Hover: Border color changes to `--accent-primary`
- Drag Over: Solid border, background highlight, scale(1.02)
- Invalid File: Red border shake animation

### Preview Canvas

- Dimensions: 200x200px square
- Background: CSS checkerboard pattern for transparency
- SVG centered with `object-fit: contain`
- Border: 1px solid `--border-default`
- Border radius: 8px
- Box shadow: subtle inner shadow

**Checkerboard CSS:**
```css
background-image:
  linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
  linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
  linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
background-size: 20px 20px;
background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
```

### Format Selection Cards

```
+------------------+
| ( ) .ico         |
|     Windows      |
|     icons        |
+------------------+
```

- Width: Equal width, flex distribution
- Height: Auto, min 72px
- Padding: 16px
- Border: 2px solid `--border-default`
- Border radius: 8px
- Selected: Border `--accent-primary`, light blue background
- Hover: Border `--foreground-muted`

### Primary Button

- Height: 48px
- Padding: 0 24px
- Border radius: 8px
- Font: 16px, font-weight: 600
- Background: `--accent-primary`
- Text: White
- Hover: `--accent-primary-hover`
- Focus: Ring 2px `--accent-primary` with offset
- Disabled: 50% opacity, cursor not-allowed
- Loading: Shows spinner left of text

### Secondary Button

- Same dimensions as primary
- Background: transparent
- Border: 2px solid `--border-default`
- Text: `--foreground-primary`
- Hover: Background `--background-dropzone`

### Slider Component

- Track height: 6px
- Track color: `--border-default`
- Fill color: `--accent-primary`
- Thumb: 20px circle, white with shadow
- Thumb focus: Ring 2px `--accent-primary`

---

## Animations & Transitions

### Page Load
- Card fades in and slides up slightly
- Duration: 300ms ease-out
- Delay: 100ms

### Dropzone Hover
- Border color transition: 150ms ease
- Transform scale: 150ms ease

### File Upload Success
- Preview slides in from right
- Options fade in sequentially (50ms stagger)
- Duration: 200ms ease-out

### Converting Spinner
- Rotation: infinite linear 1s
- Progress bar: indeterminate shimmer animation

### Success State
- Checkmark icon: Scale from 0 with bounce
- Text fades in after icon
- Duration: 400ms ease-out

### Error Shake
- Horizontal shake animation for invalid file
- Duration: 300ms
- Keyframes: translateX(-10px, 10px, -10px, 0)

---

## Responsive Layouts

### Mobile (< 640px)

```
+--------------------------------+
|           svg2ico              |
|  Convert SVG to ICO & ICNS     |
+--------------------------------+
|                                |
|  +---------------------------+ |
|  |                           | |
|  |    [Upload Icon]          | |
|  |    Drag & drop or         | |
|  |    [Browse Files]         | |
|  |                           | |
|  +---------------------------+ |
|                                |
+--------------------------------+
```

After file load:
```
+--------------------------------+
|           svg2ico              |
+--------------------------------+
|                                |
|  +-------------------------+   |
|  |      [SVG PREVIEW]      |   |
|  |        160x160          |   |
|  +-------------------------+   |
|                                |
|  filename.svg (24.5 KB) [x]    |
|                                |
|  Scale & Padding               |
|  [===============|---] 75%     |
|                                |
|  Output Format                 |
|  +-------------------------+   |
|  |   ( ) .ico - Windows    |   |
|  +-------------------------+   |
|  +-------------------------+   |
|  |   ( ) .icns - macOS     |   |
|  +-------------------------+   |
|  +-------------------------+   |
|  |   ( ) Both - .zip       |   |
|  +-------------------------+   |
|                                |
|  [ ] Remove background         |
|                                |
|  [    Convert & Download    ]  |
|                                |
+--------------------------------+
```

### Desktop (> 1024px with Ad)

```
+------------------------------------------------------------------+
|  svg2ico - Convert SVG to ICO & ICNS                  [GitHub]   |
+------------------------------------------------------------------+
|                                                                  |
|        +----------------------------------+    +-----------+     |
|        |                                  |    |           |     |
|        |       CONVERTER CARD             |    |    AD     |     |
|        |       (max-width: 560px)         |    |  SIDEBAR  |     |
|        |                                  |    |  300x250  |     |
|        |                                  |    |           |     |
|        +----------------------------------+    +-----------+     |
|                                                                  |
+------------------------------------------------------------------+
```

---

## Accessibility Requirements

### Keyboard Navigation
- Tab order: Dropzone → File input → Slider → Format options → Checkbox → Button
- Enter/Space activates buttons and toggles
- Escape closes any dialogs
- Arrow keys adjust slider

### Focus States
- Visible focus ring on all interactive elements
- Focus ring: 2px solid `--accent-primary` with 2px offset
- Focus visible only on keyboard navigation (`:focus-visible`)

### Screen Reader
- Dropzone: `role="button"` with `aria-label="Upload SVG file"`
- Progress: `aria-live="polite"` for status updates
- Errors: `role="alert"` with `aria-live="assertive"`
- Format selection: Radio group with proper labeling

### Color Contrast
- All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
- Icons have sufficient contrast
- Error/success states don't rely solely on color

---

## Ad Placement Specifications

### Desktop Sidebar (Preferred)
- Position: Right of converter card
- Size: 300x250 (Medium Rectangle)
- Spacing: 24px from converter card
- Only visible on screens > 1200px

### Mobile/Tablet Banner
- Position: Below converter card
- Size: 320x100 or 320x50
- Spacing: 24px margin top
- Clearly labeled: "Advertisement" in small text above

### Ad Guidelines
- Never interrupt conversion flow
- No popup or interstitial ads
- Ads should not shift layout after loading
- Use placeholder during ad load (prevent CLS)

---

## Error Handling UI

### Inline Validation
- Show immediately on invalid file drop
- Red border on dropzone
- Error message below dropzone
- Auto-dismiss after 5 seconds or on new action

### Toast Notifications
- Position: Bottom right (desktop), bottom center (mobile)
- Duration: 4 seconds for info, 6 seconds for errors
- Dismissible with X button
- Stack up to 3 toasts

### Rate Limit Message
```
+----------------------------------------------------------+
|  [Clock Icon] Too Many Requests                          |
|                                                          |
|  You've reached the limit of 60 conversions per hour.    |
|  Please try again in 23 minutes.                         |
|                                                          |
|  [Show countdown timer: 23:45]                           |
+----------------------------------------------------------+
```

---

## Future Considerations (Not MVP)

### Dark Mode
- Toggle in header
- System preference detection
- Smooth transition between themes

### Batch Upload
- Multi-file dropzone
- List view of queued files
- Individual progress indicators

### Advanced Options Panel
- Collapsible "Advanced" section
- Custom resolution inputs
- Color picker for background
- Compression quality slider

---

## Component Inventory (shadcn/ui)

Required components to install:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add slider
npx shadcn@latest add radio-group
npx shadcn@latest add checkbox
npx shadcn@latest add progress
npx shadcn@latest add toast
npx shadcn@latest add alert
```

Custom components to build:
- `Dropzone` - File upload with drag-and-drop
- `PreviewCanvas` - SVG preview with checkerboard background
- `FormatCard` - Styled radio option cards
- `ConversionProgress` - Loading state with progress

---

## Design Assets Needed

1. **Favicon**: Use a simple icon representing conversion (arrows + SVG)
2. **Logo**: "svg2ico" wordmark in Geist font
3. **Social Preview**: 1200x630 image for link sharing
4. **Placeholder Icons**: Lucide icons throughout (Upload, Check, AlertCircle, Download)

---

*Last updated: January 2026*
*Version: 1.0 (MVP)*
