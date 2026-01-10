/**
 * Utility functions for detecting and removing SVG backgrounds.
 * Used for the "smart" background removal feature.
 */

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Parse an SVG string and return a Document
 */
function parseSvg(svgString: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(svgString, 'image/svg+xml');
}

/**
 * Get the viewBox dimensions from an SVG element
 */
function getViewBox(svgElement: SVGSVGElement): ViewBox {
  const viewBoxAttr = svgElement.getAttribute('viewBox');
  if (viewBoxAttr) {
    const [x, y, width, height] = viewBoxAttr.split(/[\s,]+/).map(Number);
    return { x, y, width, height };
  }

  // Fall back to width/height attributes
  const width = parseFloat(svgElement.getAttribute('width') || '0');
  const height = parseFloat(svgElement.getAttribute('height') || '0');
  return { x: 0, y: 0, width, height };
}

/**
 * Check if an element is a potential background element
 * (rect, path, circle, or ellipse that covers the entire viewbox)
 */
function isBackgroundElement(element: Element, viewBox: ViewBox): boolean {
  const tagName = element.tagName.toLowerCase();

  // Check for rect elements
  if (tagName === 'rect') {
    const x = parseFloat(element.getAttribute('x') || '0');
    const y = parseFloat(element.getAttribute('y') || '0');
    const width = parseFloat(element.getAttribute('width') || '0');
    const height = parseFloat(element.getAttribute('height') || '0');

    // Check if rect covers the entire viewbox (with some tolerance)
    const tolerance = 0.01;
    const coversWidth = width >= viewBox.width * (1 - tolerance);
    const coversHeight = height >= viewBox.height * (1 - tolerance);
    const startsAtOrigin = x <= viewBox.x + tolerance && y <= viewBox.y + tolerance;

    return coversWidth && coversHeight && startsAtOrigin;
  }

  // Check for circle elements that could be backgrounds (large centered circles)
  if (tagName === 'circle') {
    const cx = parseFloat(element.getAttribute('cx') || '0');
    const cy = parseFloat(element.getAttribute('cy') || '0');
    const r = parseFloat(element.getAttribute('r') || '0');

    // Check if circle is centered and covers the viewbox
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    const isCentered = Math.abs(cx - centerX) < 1 && Math.abs(cy - centerY) < 1;
    const minDimension = Math.min(viewBox.width, viewBox.height);
    const coversViewbox = r >= (minDimension / 2) * 0.95;

    return isCentered && coversViewbox;
  }

  // Check for ellipse elements
  if (tagName === 'ellipse') {
    const cx = parseFloat(element.getAttribute('cx') || '0');
    const cy = parseFloat(element.getAttribute('cy') || '0');
    const rx = parseFloat(element.getAttribute('rx') || '0');
    const ry = parseFloat(element.getAttribute('ry') || '0');

    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    const isCentered = Math.abs(cx - centerX) < 1 && Math.abs(cy - centerY) < 1;
    const coversWidth = rx >= (viewBox.width / 2) * 0.95;
    const coversHeight = ry >= (viewBox.height / 2) * 0.95;

    return isCentered && coversWidth && coversHeight;
  }

  // Check for path elements - look for simple rectangular paths
  if (tagName === 'path') {
    const d = element.getAttribute('d') || '';
    // Simple heuristic: check for rectangular path commands
    // M0,0 L100,0 L100,100 L0,100 Z or similar
    const isRectPath = /^M\s*[\d.]+[\s,]+[\d.]+\s*(L\s*[\d.]+[\s,]+[\d.]+\s*){3,}Z?\s*$/i.test(
      d.trim(),
    );
    if (isRectPath) {
      // Extract coordinates and check if they form a viewbox-covering rectangle
      const coords = d.match(/[\d.]+/g)?.map(Number) || [];
      if (coords.length >= 8) {
        const xs = coords.filter((_, i) => i % 2 === 0);
        const ys = coords.filter((_, i) => i % 2 === 1);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const coversWidth = maxX - minX >= viewBox.width * 0.95;
        const coversHeight = maxY - minY >= viewBox.height * 0.95;
        const startsNearOrigin = minX <= viewBox.x + 1 && minY <= viewBox.y + 1;

        return coversWidth && coversHeight && startsNearOrigin;
      }
    }
  }

  return false;
}

/**
 * Check if an element has a fill (not transparent/none)
 */
function hasFill(element: Element): boolean {
  const fill = element.getAttribute('fill');
  const style = element.getAttribute('style') || '';

  // Check inline style for fill
  const styleFill = style.match(/fill\s*:\s*([^;]+)/)?.[1]?.trim();

  const effectiveFill = styleFill || fill;

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
 * Find background elements in an SVG
 * Returns elements that appear to be backgrounds (large elements at the back)
 */
function findBackgroundElements(svgDoc: Document): Element[] {
  const svgElement = svgDoc.querySelector('svg');
  if (!svgElement) return [];

  const viewBox = getViewBox(svgElement as SVGSVGElement);
  if (viewBox.width === 0 || viewBox.height === 0) return [];

  const backgrounds: Element[] = [];

  // Get all direct children and first-level group children
  const candidates: Element[] = [];

  // Check direct children of SVG
  for (const child of Array.from(svgElement.children)) {
    if (child.tagName.toLowerCase() === 'g') {
      // Check first child of groups
      const firstChild = child.children[0];
      if (firstChild) {
        candidates.push(firstChild);
      }
    } else if (['rect', 'path', 'circle', 'ellipse'].includes(child.tagName.toLowerCase())) {
      candidates.push(child);
    }
  }

  // Only check the first few elements (backgrounds are typically at the start)
  for (let i = 0; i < Math.min(candidates.length, 3); i++) {
    const element = candidates[i];
    if (isBackgroundElement(element, viewBox) && hasFill(element)) {
      backgrounds.push(element);
      // Usually only one background, so we can stop after finding one
      break;
    }
  }

  return backgrounds;
}

/**
 * Remove a specific color from an SVG
 */
function removeColorFromSvg(svgDoc: Document, colorToRemove: string): void {
  const normalizedColor = normalizeColor(colorToRemove);

  const elements = svgDoc.querySelectorAll('*');
  for (const element of Array.from(elements)) {
    const fill = element.getAttribute('fill');
    if (fill && normalizeColor(fill) === normalizedColor) {
      element.setAttribute('fill', 'none');
    }

    const style = element.getAttribute('style');
    if (style) {
      const newStyle = style.replace(/fill\s*:\s*([^;]+)/gi, (match, fillValue) => {
        if (normalizeColor(fillValue.trim()) === normalizedColor) {
          return 'fill: none';
        }
        return match;
      });
      element.setAttribute('style', newStyle);
    }
  }
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
 * Serialize a Document back to an SVG string
 */
function serializeSvg(svgDoc: Document): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgDoc);
}

export interface BackgroundRemovalResult {
  /** The modified SVG string with background removed */
  svg: string;
  /** Whether a background was detected and removed */
  backgroundRemoved: boolean;
  /** Description of what was removed (for UI feedback) */
  removalDescription?: string;
}

/**
 * Remove background from an SVG using smart detection
 */
export function removeSmartBackground(svgString: string): BackgroundRemovalResult {
  const svgDoc = parseSvg(svgString);
  const backgrounds = findBackgroundElements(svgDoc);

  if (backgrounds.length === 0) {
    return {
      svg: svgString,
      backgroundRemoved: false,
    };
  }

  // Remove detected background elements
  for (const bg of backgrounds) {
    bg.setAttribute('fill', 'none');
    bg.setAttribute('fill-opacity', '0');
    // Also remove stroke if it exists
    if (bg.getAttribute('stroke')) {
      bg.setAttribute('stroke', 'none');
    }
  }

  return {
    svg: serializeSvg(svgDoc),
    backgroundRemoved: true,
    removalDescription: `Removed ${backgrounds.length} background element(s)`,
  };
}

/**
 * Remove a specific color from an SVG
 */
export function removeColorBackground(svgString: string, color: string): BackgroundRemovalResult {
  const svgDoc = parseSvg(svgString);
  removeColorFromSvg(svgDoc, color);

  return {
    svg: serializeSvg(svgDoc),
    backgroundRemoved: true,
    removalDescription: `Removed color ${color}`,
  };
}

/**
 * Process SVG based on background removal options
 */
export function processBackgroundRemoval(
  svgString: string,
  mode: 'none' | 'color' | 'smart',
  color?: string,
): BackgroundRemovalResult {
  switch (mode) {
    case 'smart':
      return removeSmartBackground(svgString);
    case 'color':
      if (color) {
        return removeColorBackground(svgString, color);
      }
      return { svg: svgString, backgroundRemoved: false };
    case 'none':
    default:
      return { svg: svgString, backgroundRemoved: false };
  }
}
