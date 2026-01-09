/**
 * SVG processing utilities for background removal and transformations.
 * Ported from frontend utils/removeBackground.ts for server-side processing.
 */

import type { BackgroundRemovalMode, RoundnessValue } from './dto/convert.dto.js';

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Parse viewBox attribute from SVG string
 */
function parseViewBox(svgString: string): ViewBox {
  // Try to get viewBox attribute
  const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const [x, y, width, height] = viewBoxMatch[1].split(/[\s,]+/).map(Number);
    return { x: x || 0, y: y || 0, width: width || 0, height: height || 0 };
  }

  // Fall back to width/height attributes
  const widthMatch = svgString.match(/width=["']([^"']+)["']/i);
  const heightMatch = svgString.match(/height=["']([^"']+)["']/i);
  const width = widthMatch ? parseFloat(widthMatch[1]) : 0;
  const height = heightMatch ? parseFloat(heightMatch[1]) : 0;

  return { x: 0, y: 0, width, height };
}

/**
 * Normalize a color string to a consistent format for comparison
 */
function normalizeColor(color: string): string {
  const trimmed = color.trim().toLowerCase();

  // Handle hex colors
  if (trimmed.startsWith('#')) {
    // Expand shorthand hex
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return trimmed;
  }

  // Handle named colors (convert common ones to hex)
  const namedColors: Record<string, string> = {
    white: '#ffffff',
    black: '#000000',
    red: '#ff0000',
    green: '#008000',
    blue: '#0000ff',
    transparent: 'transparent',
  };

  return namedColors[trimmed] || trimmed;
}

/**
 * Check if a rect element covers the entire viewbox
 */
function isBackgroundRect(elementMatch: RegExpMatchArray, viewBox: ViewBox): boolean {
  const fullElement = elementMatch[0];

  const xMatch = fullElement.match(/\bx=["']([^"']+)["']/);
  const yMatch = fullElement.match(/\by=["']([^"']+)["']/);
  const widthMatch = fullElement.match(/\bwidth=["']([^"']+)["']/);
  const heightMatch = fullElement.match(/\bheight=["']([^"']+)["']/);

  const x = xMatch ? parseFloat(xMatch[1]) : 0;
  const y = yMatch ? parseFloat(yMatch[1]) : 0;
  const width = widthMatch ? parseFloat(widthMatch[1]) : 0;
  const height = heightMatch ? parseFloat(heightMatch[1]) : 0;

  // Check if rect covers the entire viewbox (with some tolerance)
  const tolerance = 0.01;
  const coversWidth = width >= viewBox.width * (1 - tolerance);
  const coversHeight = height >= viewBox.height * (1 - tolerance);
  const startsAtOrigin = x <= viewBox.x + tolerance && y <= viewBox.y + tolerance;

  return coversWidth && coversHeight && startsAtOrigin;
}

/**
 * Check if a circle element covers the viewbox
 */
function isBackgroundCircle(elementMatch: RegExpMatchArray, viewBox: ViewBox): boolean {
  const fullElement = elementMatch[0];

  const cxMatch = fullElement.match(/\bcx=["']([^"']+)["']/);
  const cyMatch = fullElement.match(/\bcy=["']([^"']+)["']/);
  const rMatch = fullElement.match(/\br=["']([^"']+)["']/);

  const cx = cxMatch ? parseFloat(cxMatch[1]) : 0;
  const cy = cyMatch ? parseFloat(cyMatch[1]) : 0;
  const r = rMatch ? parseFloat(rMatch[1]) : 0;

  const centerX = viewBox.x + viewBox.width / 2;
  const centerY = viewBox.y + viewBox.height / 2;
  const isCentered = Math.abs(cx - centerX) < 1 && Math.abs(cy - centerY) < 1;
  const minDimension = Math.min(viewBox.width, viewBox.height);
  const coversViewbox = r >= (minDimension / 2) * 0.95;

  return isCentered && coversViewbox;
}

/**
 * Check if an ellipse element covers the viewbox
 */
function isBackgroundEllipse(elementMatch: RegExpMatchArray, viewBox: ViewBox): boolean {
  const fullElement = elementMatch[0];

  const cxMatch = fullElement.match(/\bcx=["']([^"']+)["']/);
  const cyMatch = fullElement.match(/\bcy=["']([^"']+)["']/);
  const rxMatch = fullElement.match(/\brx=["']([^"']+)["']/);
  const ryMatch = fullElement.match(/\bry=["']([^"']+)["']/);

  const cx = cxMatch ? parseFloat(cxMatch[1]) : 0;
  const cy = cyMatch ? parseFloat(cyMatch[1]) : 0;
  const rx = rxMatch ? parseFloat(rxMatch[1]) : 0;
  const ry = ryMatch ? parseFloat(ryMatch[1]) : 0;

  const centerX = viewBox.x + viewBox.width / 2;
  const centerY = viewBox.y + viewBox.height / 2;
  const isCentered = Math.abs(cx - centerX) < 1 && Math.abs(cy - centerY) < 1;
  const coversWidth = rx >= (viewBox.width / 2) * 0.95;
  const coversHeight = ry >= (viewBox.height / 2) * 0.95;

  return isCentered && coversWidth && coversHeight;
}

/**
 * Check if element has a fill (not transparent/none)
 */
function hasFill(elementString: string): boolean {
  const fillMatch = elementString.match(/\bfill=["']([^"']+)["']/);
  const styleMatch = elementString.match(/\bstyle=["']([^"']+)["']/);
  const styleFillMatch = styleMatch?.[1].match(/fill\s*:\s*([^;]+)/);

  const effectiveFill = styleFillMatch?.[1]?.trim() || fillMatch?.[1];

  // No fill attribute or transparent
  if (!effectiveFill || effectiveFill === 'none' || effectiveFill === 'transparent') {
    return false;
  }

  // Check for rgba with 0 alpha
  if (effectiveFill.includes('rgba') && effectiveFill.includes(',0)')) {
    return false;
  }

  return true;
}

/**
 * Remove background using smart detection (finds full-viewbox elements)
 */
export function removeSmartBackground(svgString: string): string {
  const viewBox = parseViewBox(svgString);
  if (viewBox.width === 0 || viewBox.height === 0) {
    return svgString;
  }

  let result = svgString;

  // Find potential background elements (rect, circle, ellipse)
  // Look for elements near the start of the SVG (backgrounds are typically first)
  const elementPatterns = [/<rect[^>]*>/gi, /<circle[^>]*>/gi, /<ellipse[^>]*>/gi];

  for (const pattern of elementPatterns) {
    const matches = result.matchAll(pattern);
    let count = 0;

    for (const match of matches) {
      if (count >= 3) break; // Only check first 3 of each type

      if (!hasFill(match[0])) {
        count++;
        continue;
      }

      let isBackground = false;
      if (pattern.source.includes('rect')) {
        isBackground = isBackgroundRect(match, viewBox);
      } else if (pattern.source.includes('circle')) {
        isBackground = isBackgroundCircle(match, viewBox);
      } else if (pattern.source.includes('ellipse')) {
        isBackground = isBackgroundEllipse(match, viewBox);
      }

      if (isBackground) {
        // Replace the element's fill with none
        const original = match[0];
        let modified = original;

        // Remove fill attribute and add fill="none"
        modified = modified.replace(/\bfill=["'][^"']*["']/gi, '');
        modified = modified.replace(/\bfill-opacity=["'][^"']*["']/gi, '');
        modified = modified.replace(/>$/, ' fill="none">');
        modified = modified.replace(/\/>$/, ' fill="none"/>');

        result = result.replace(original, modified);
        // Found and removed a background, we can stop
        return result;
      }

      count++;
    }
  }

  return result;
}

/**
 * Remove a specific color from an SVG
 */
export function removeColorBackground(svgString: string, color: string): string {
  const normalizedColor = normalizeColor(color);
  let result = svgString;

  // Replace fill attributes that match the color
  result = result.replace(/fill=["']([^"']+)["']/gi, (match, fillValue) => {
    if (normalizeColor(fillValue) === normalizedColor) {
      return 'fill="none"';
    }
    return match;
  });

  // Replace fill in style attributes
  result = result.replace(/style=["']([^"']+)["']/gi, (match, styleValue) => {
    const newStyle = styleValue.replace(
      /fill\s*:\s*([^;]+)/gi,
      (fillMatch: string, fillValue: string) => {
        if (normalizeColor(fillValue.trim()) === normalizedColor) {
          return 'fill: none';
        }
        return fillMatch;
      },
    );
    return `style="${newStyle}"`;
  });

  return result;
}

/**
 * Process SVG based on background removal options
 */
export function processBackgroundRemoval(
  svgString: string,
  mode: BackgroundRemovalMode,
  color?: string,
): string {
  switch (mode) {
    case 'smart':
      return removeSmartBackground(svgString);
    case 'color':
      if (color) {
        return removeColorBackground(svgString, color);
      }
      return svgString;
    case 'none':
    default:
      return svgString;
  }
}

/**
 * Apply corner radius to SVG by wrapping content with a clipPath
 */
export function applyCornerRadius(svgString: string, cornerRadius: RoundnessValue): string {
  if (cornerRadius === 0) {
    return svgString;
  }

  const viewBox = parseViewBox(svgString);
  if (viewBox.width === 0 || viewBox.height === 0) {
    return svgString;
  }

  // Calculate pixel radius from percentage
  const minDimension = Math.min(viewBox.width, viewBox.height);
  const radiusPixels = (cornerRadius / 100) * minDimension;

  // Create a unique ID for the clip path
  const clipId = `rounded-corners-${Date.now()}`;

  // Create the clip path definition with rounded rectangle
  const clipPathDef = `
    <defs>
      <clipPath id="${clipId}">
        <rect
          x="${viewBox.x}"
          y="${viewBox.y}"
          width="${viewBox.width}"
          height="${viewBox.height}"
          rx="${radiusPixels}"
          ry="${radiusPixels}"
        />
      </clipPath>
    </defs>`;

  // Find where to insert the defs (after opening svg tag)
  const svgOpenTagMatch = svgString.match(/<svg[^>]*>/i);
  if (!svgOpenTagMatch) {
    return svgString;
  }

  const svgOpenTag = svgOpenTagMatch[0];
  const afterOpenTag = svgString.indexOf(svgOpenTag) + svgOpenTag.length;

  // Check if there's already a defs section
  const existingDefsMatch = svgString.match(/<defs[^>]*>/i);
  let resultSvg: string;

  if (existingDefsMatch) {
    // Insert clip path inside existing defs
    const defsInsertPoint = svgString.indexOf(existingDefsMatch[0]) + existingDefsMatch[0].length;
    resultSvg =
      svgString.slice(0, defsInsertPoint) +
      `
      <clipPath id="${clipId}">
        <rect
          x="${viewBox.x}"
          y="${viewBox.y}"
          width="${viewBox.width}"
          height="${viewBox.height}"
          rx="${radiusPixels}"
          ry="${radiusPixels}"
        />
      </clipPath>` +
      svgString.slice(defsInsertPoint);
  } else {
    // Insert new defs section
    resultSvg = svgString.slice(0, afterOpenTag) + clipPathDef + svgString.slice(afterOpenTag);
  }

  // Wrap all content (except defs) in a group with the clip path
  // Find the closing svg tag
  const closingSvgIndex = resultSvg.lastIndexOf('</svg>');
  if (closingSvgIndex === -1) {
    return svgString;
  }

  // Extract content between opening tag and closing tag
  const newSvgOpenTagMatch = resultSvg.match(/<svg[^>]*>/i);
  if (!newSvgOpenTagMatch) {
    return svgString;
  }

  const contentStart = resultSvg.indexOf(newSvgOpenTagMatch[0]) + newSvgOpenTagMatch[0].length;

  // Find end of defs section
  const defsEndMatch = resultSvg.match(/<\/defs>/i);
  const contentAfterDefs = defsEndMatch
    ? resultSvg.indexOf(defsEndMatch[0]) + defsEndMatch[0].length
    : contentStart;

  // Get content after defs
  const contentBetween = resultSvg.slice(contentAfterDefs, closingSvgIndex);

  // Wrap content in group with clip-path
  const wrappedContent = `<g clip-path="url(#${clipId})">${contentBetween}</g>`;

  resultSvg =
    resultSvg.slice(0, contentAfterDefs) + wrappedContent + resultSvg.slice(closingSvgIndex);

  return resultSvg;
}

export interface SvgProcessingOptions {
  backgroundRemovalMode: BackgroundRemovalMode;
  backgroundRemovalColor?: string;
  cornerRadius: RoundnessValue;
}

/**
 * Apply all SVG processing transformations
 */
export function processSvg(svgString: string, options: SvgProcessingOptions): string {
  let result = svgString;

  // 1. Apply background removal first
  result = processBackgroundRemoval(
    result,
    options.backgroundRemovalMode,
    options.backgroundRemovalColor,
  );

  // 2. Apply corner radius
  result = applyCornerRadius(result, options.cornerRadius);

  return result;
}
