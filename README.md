# SVG2ICO

A free online tool for converting SVG files into platform-specific icon formats. Available at [svg2ico.com](https://svg2ico.com).

![Screenshot](apps/web/public/logo/og-image.png)

## What It Does

SVG2ICO converts your SVG vector graphics into ready-to-use icon files:

- **ICO** - Windows icon format with multi-resolution support (16x16, 32x32, 48x48, 256x256)
- **ICNS** - macOS icon format with complete resolution set (16x16 through 512x512 @1x and @2x)
- **PNG** - High-quality export with custom sizes from 16x16 to 1024x1024

## Features

- **Real-Time Preview** - See your icon in macOS/Windows contexts with dark/light themes
- **Background Removal** - Automatically detect and remove backgrounds, or specify a color
- **Customizable Output** - Adjust scale (50-200%) and corner radius (0-50%)
- **Batch Export** - Download ICO + ICNS together as a ZIP
- **Fast** - Rust-powered conversion completes in under 5 seconds

## Privacy

Your files are processed in-memory only. We never store or access your uploaded content. Files are processed and immediately deleted.

## Limitations

- Maximum file size: 10MB
- SVG input only (PNG/JPEG support planned)
- One file at a time (batch conversion planned)

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: NestJS, Prisma, PostgreSQL
- **Image Processing**: Resvg (Rust-powered SVG rendering), Sharp
- **Infrastructure**: Turborepo monorepo

## License

BSL 1.1
