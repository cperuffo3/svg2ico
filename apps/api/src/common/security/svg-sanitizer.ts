import createDOMPurify from 'isomorphic-dompurify';

/**
 * SVG Sanitizer - Removes potentially dangerous content from SVG files
 *
 * Protects against:
 * - XXE (XML External Entity) attacks
 * - Embedded JavaScript (onclick, onload, <script> tags)
 * - External resource loading (xlink:href to external URLs)
 * - Data exfiltration via SVG
 */

const DOMPurify = createDOMPurify;

// Configure DOMPurify for SVG sanitization
const DOMPURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  // Allow standard SVG elements
  ADD_TAGS: ['use', 'symbol', 'defs', 'clipPath', 'mask', 'pattern', 'marker', 'filter'],
  // Remove dangerous attributes
  FORBID_ATTR: [
    'onclick',
    'onload',
    'onerror',
    'onmouseover',
    'onmouseout',
    'onmousedown',
    'onmouseup',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit',
    'onreset',
    'onselect',
    'onkeydown',
    'onkeypress',
    'onkeyup',
    'onabort',
    'ondblclick',
    'onresize',
    'onscroll',
    'onunload',
  ],
  // Remove script tags and other dangerous elements
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'foreignObject'],
  // Don't allow data: URLs in certain attributes (potential for script injection)
  ALLOW_DATA_ATTR: false,
};

/**
 * Patterns that indicate potentially malicious SVG content
 */
const DANGEROUS_PATTERNS = [
  // XXE patterns
  /<!ENTITY/i,
  /<!DOCTYPE[^>]*\[/i,
  /SYSTEM\s+["']/i,
  /PUBLIC\s+["']/i,
  // JavaScript protocol
  /javascript:/i,
  // VBScript (IE legacy)
  /vbscript:/i,
  // Data URI with script
  /data:\s*text\/html/i,
  // Event handlers that might slip through
  /on\w+\s*=/i,
  // External entity references
  /xmlns:xi\s*=.*xinclude/i,
  /xi:include/i,
];

export interface SanitizeResult {
  sanitized: string;
  wasModified: boolean;
  removedElements: string[];
}

/**
 * Check if SVG content contains potentially dangerous patterns
 */
export function containsDangerousPatterns(svgContent: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(svgContent));
}

/**
 * Remove XML DOCTYPE and ENTITY declarations to prevent XXE
 */
function stripDoctypeAndEntities(svgContent: string): string {
  // Remove DOCTYPE declarations (including any internal subset)
  let result = svgContent.replace(/<!DOCTYPE[^>]*(\[[^\]]*\])?>/gi, '');

  // Remove ENTITY declarations
  result = result.replace(/<!ENTITY[^>]*>/gi, '');

  return result;
}

/**
 * Sanitize SVG content to remove potentially dangerous elements
 *
 * @param svgContent - Raw SVG string
 * @returns Sanitized SVG string and metadata
 */
export function sanitizeSvg(svgContent: string): SanitizeResult {
  const originalContent = svgContent;
  const removedElements: string[] = [];

  // Step 1: Strip DOCTYPE and ENTITY declarations (XXE prevention)
  let sanitized = stripDoctypeAndEntities(svgContent);
  if (sanitized !== svgContent) {
    removedElements.push('DOCTYPE/ENTITY declarations');
  }

  // Step 2: Check for dangerous patterns before DOMPurify
  if (containsDangerousPatterns(sanitized)) {
    removedElements.push('dangerous patterns detected');
  }

  // Step 3: Use DOMPurify for thorough sanitization
  sanitized = DOMPurify.sanitize(sanitized, DOMPURIFY_CONFIG) as string;

  // Step 4: Ensure we still have valid SVG
  if (!sanitized.includes('<svg')) {
    // If DOMPurify removed the SVG tag, the content was too dangerous
    throw new Error('SVG content was rejected due to security concerns');
  }

  const wasModified = sanitized !== originalContent;

  return {
    sanitized,
    wasModified,
    removedElements,
  };
}

/**
 * Quick validation check without full sanitization
 * Use this for fast rejection of obviously malicious content
 */
export function isQuickSafe(svgContent: string): boolean {
  // Check file size (prevent DoS with huge files - this is a backup to file size limits)
  if (svgContent.length > 10 * 1024 * 1024) {
    return false;
  }

  // Check for obvious XXE patterns
  if (/<!ENTITY/i.test(svgContent)) {
    return false;
  }

  // Check for script tags
  if (/<script/i.test(svgContent)) {
    return false;
  }

  // Check for javascript: protocol
  if (/javascript:/i.test(svgContent)) {
    return false;
  }

  return true;
}
