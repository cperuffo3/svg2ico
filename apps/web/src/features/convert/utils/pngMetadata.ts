/**
 * PNG Metadata Parser
 * Extracts DPI and bit depth from PNG files by reading IHDR and pHYs chunks
 */

export interface PngMetadata {
  width: number;
  height: number;
  bitDepth: number; // 1, 2, 4, 8, or 16 per channel
  colorType: number; // 0=grayscale, 2=RGB, 3=indexed, 4=grayscale+alpha, 6=RGBA
  effectiveBitDepth: 8 | 24 | 32; // Mapped to our PngColorDepth type
  dpi: number | null; // null if pHYs chunk not found or not in meters
}

/**
 * Read a 4-byte big-endian unsigned integer from a DataView
 */
function readUint32BE(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

/**
 * Read a 4-byte ASCII string from a DataView
 */
function readChunkType(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

/**
 * Map PNG color type and bit depth to our effective bit depth
 * - 8-bit: indexed color (256 colors)
 * - 24-bit: truecolor RGB (no alpha)
 * - 32-bit: truecolor RGBA (with alpha)
 */
function mapToEffectiveBitDepth(colorType: number, _bitDepth: number): 8 | 24 | 32 {
  // Color types:
  // 0 = Grayscale
  // 2 = RGB (truecolor)
  // 3 = Indexed (palette)
  // 4 = Grayscale + Alpha
  // 6 = RGBA (truecolor + alpha)

  if (colorType === 3) {
    // Indexed color - always 8-bit (256 colors max)
    return 8;
  }

  if (colorType === 0 || colorType === 2) {
    // Grayscale or RGB without alpha
    // Grayscale: 1-16 bits per pixel
    // RGB: bitDepth * 3 (24 or 48 bits)
    return 24;
  }

  if (colorType === 4 || colorType === 6) {
    // Has alpha channel
    return 32;
  }

  // Default to 32-bit for unknown types
  return 32;
}

/**
 * Parse PNG metadata from an ArrayBuffer
 */
export function parsePngMetadata(buffer: ArrayBuffer): PngMetadata | null {
  const view = new DataView(buffer);

  // Check PNG signature (89 50 4E 47 0D 0A 1A 0A)
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i++) {
    if (view.getUint8(i) !== signature[i]) {
      return null; // Not a valid PNG
    }
  }

  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  let dpi: number | null = null;

  // Parse chunks starting after signature (byte 8)
  let offset = 8;

  while (offset < buffer.byteLength - 12) {
    const chunkLength = readUint32BE(view, offset);
    const chunkType = readChunkType(view, offset + 4);
    const dataOffset = offset + 8;

    if (chunkType === 'IHDR') {
      // IHDR chunk contains: width (4), height (4), bit depth (1), color type (1), ...
      width = readUint32BE(view, dataOffset);
      height = readUint32BE(view, dataOffset + 4);
      bitDepth = view.getUint8(dataOffset + 8);
      colorType = view.getUint8(dataOffset + 9);
    } else if (chunkType === 'pHYs') {
      // pHYs chunk contains: pixels per unit X (4), pixels per unit Y (4), unit (1)
      const pixelsPerUnitX = readUint32BE(view, dataOffset);
      const pixelsPerUnitY = readUint32BE(view, dataOffset + 4);
      const unit = view.getUint8(dataOffset + 8);

      // Unit 1 = meter, convert to DPI (dots per inch)
      // 1 inch = 0.0254 meters, so DPI = pixels per meter * 0.0254
      if (unit === 1 && pixelsPerUnitX === pixelsPerUnitY) {
        dpi = Math.round(pixelsPerUnitX * 0.0254);
      }
    } else if (chunkType === 'IEND') {
      // End of PNG
      break;
    }

    // Move to next chunk: length (4) + type (4) + data (length) + CRC (4)
    offset += 12 + chunkLength;
  }

  if (width === 0 || height === 0) {
    return null; // Invalid PNG - no IHDR found
  }

  return {
    width,
    height,
    bitDepth,
    colorType,
    effectiveBitDepth: mapToEffectiveBitDepth(colorType, bitDepth),
    dpi,
  };
}

/**
 * Parse PNG metadata from a data URL
 */
export async function parsePngMetadataFromDataUrl(dataUrl: string): Promise<PngMetadata | null> {
  try {
    // Convert data URL to ArrayBuffer
    const response = await fetch(dataUrl);
    const buffer = await response.arrayBuffer();
    return parsePngMetadata(buffer);
  } catch {
    return null;
  }
}

/**
 * Parse PNG metadata from a File
 */
export function parsePngMetadataFromFile(file: File): Promise<PngMetadata | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        resolve(parsePngMetadata(buffer));
      } else {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}
