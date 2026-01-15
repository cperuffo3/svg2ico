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

/**
 * Classification of why a file was rejected or flagged
 */
export enum ThreatClassification {
  // Attack indicators - these patterns are almost never in legitimate files
  XXE_ATTACK = 'xxe_attack',
  SCRIPT_INJECTION = 'script_injection',
  EVENT_HANDLER_INJECTION = 'event_handler_injection',
  PROTOCOL_HANDLER_ATTACK = 'protocol_handler_attack',
  EXTERNAL_ENTITY_ATTACK = 'external_entity_attack',

  // Suspicious but not necessarily malicious - logged but not blocked
  EXTERNAL_RESOURCE_REFERENCE = 'external_resource_reference',

  // Malformed file indicators - likely user error, not malicious
  INVALID_FORMAT = 'invalid_format',
  WRONG_FILE_TYPE = 'wrong_file_type',
  CORRUPTED_FILE = 'corrupted_file',
  FILE_TOO_LARGE = 'file_too_large',
}

export interface ThreatAnalysis {
  classification: ThreatClassification;
  isLikelyAttack: boolean;
  matchedPatterns: string[];
  description: string;
}

/**
 * Attack patterns - these are almost NEVER present in legitimate SVG files
 */
const ATTACK_PATTERNS: Array<{ pattern: RegExp; classification: ThreatClassification; description: string }> = [
  // XXE patterns
  { pattern: /<!ENTITY/i, classification: ThreatClassification.XXE_ATTACK, description: 'ENTITY declaration (XXE)' },
  { pattern: /<!DOCTYPE[^>]*\[/i, classification: ThreatClassification.XXE_ATTACK, description: 'DOCTYPE with internal subset (XXE)' },
  { pattern: /SYSTEM\s+["']/i, classification: ThreatClassification.XXE_ATTACK, description: 'SYSTEM identifier (XXE)' },
  { pattern: /PUBLIC\s+["']/i, classification: ThreatClassification.XXE_ATTACK, description: 'PUBLIC identifier (XXE)' },

  // Script injection
  { pattern: /<script/i, classification: ThreatClassification.SCRIPT_INJECTION, description: 'Script tag' },

  // Protocol handlers
  { pattern: /javascript:/i, classification: ThreatClassification.PROTOCOL_HANDLER_ATTACK, description: 'javascript: protocol' },
  { pattern: /vbscript:/i, classification: ThreatClassification.PROTOCOL_HANDLER_ATTACK, description: 'vbscript: protocol' },
  { pattern: /data:\s*text\/html/i, classification: ThreatClassification.PROTOCOL_HANDLER_ATTACK, description: 'data:text/html URI' },

  // Event handlers
  { pattern: /\son\w+\s*=/i, classification: ThreatClassification.EVENT_HANDLER_INJECTION, description: 'Event handler attribute' },

  // External entity references
  { pattern: /xmlns:xi\s*=.*xinclude/i, classification: ThreatClassification.EXTERNAL_ENTITY_ATTACK, description: 'XInclude namespace' },
  { pattern: /xi:include/i, classification: ThreatClassification.EXTERNAL_ENTITY_ATTACK, description: 'XInclude element' },
];

/**
 * Analyze content and classify the threat level
 * Returns null if content appears safe
 */
export function analyzeThreats(svgContent: string): ThreatAnalysis | null {
  const matchedPatterns: string[] = [];
  let classification: ThreatClassification | null = null;

  for (const { pattern, classification: cls, description } of ATTACK_PATTERNS) {
    if (pattern.test(svgContent)) {
      matchedPatterns.push(description);
      // Use the first (most severe) classification found
      if (!classification) {
        classification = cls;
      }
    }
  }

  if (classification && matchedPatterns.length > 0) {
    return {
      classification,
      isLikelyAttack: true,
      matchedPatterns,
      description: `Detected attack patterns: ${matchedPatterns.join(', ')}`,
    };
  }

  return null;
}

/**
 * Create a threat analysis for malformed (but not malicious) files
 */
export function createMalformedAnalysis(
  classification: ThreatClassification,
  description: string,
): ThreatAnalysis {
  return {
    classification,
    isLikelyAttack: false,
    matchedPatterns: [],
    description,
  };
}

/**
 * Patterns that indicate external resource references.
 * These are suspicious but not necessarily malicious - could be SSRF attempts
 * or legitimate SVGs that reference external assets.
 *
 * Note: resvg does NOT fetch external URLs by default (only local files),
 * but we log these for visibility and potential future blocking.
 */
const EXTERNAL_REFERENCE_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  // HTTP/HTTPS URLs in href attributes
  { pattern: /\bhref\s*=\s*["']https?:\/\//i, description: 'HTTP(S) URL in href' },
  { pattern: /\bxlink:href\s*=\s*["']https?:\/\//i, description: 'HTTP(S) URL in xlink:href' },

  // External URLs in image elements
  { pattern: /<image[^>]*\bhref\s*=\s*["']https?:\/\//i, description: 'External image reference' },

  // CSS url() with external references
  { pattern: /url\s*\(\s*["']?https?:\/\//i, description: 'External URL in CSS url()' },

  // @import with external URLs
  { pattern: /@import\s+["']?https?:\/\//i, description: 'External @import' },
  { pattern: /@import\s+url\s*\(/i, description: '@import url() directive' },

  // Potential SSRF targets (internal network, cloud metadata)
  { pattern: /\bhref\s*=\s*["']https?:\/\/169\.254\./i, description: 'Cloud metadata URL (169.254.x.x)' },
  { pattern: /\bhref\s*=\s*["']https?:\/\/localhost/i, description: 'Localhost reference' },
  { pattern: /\bhref\s*=\s*["']https?:\/\/127\./i, description: 'Loopback reference (127.x.x.x)' },
  { pattern: /\bhref\s*=\s*["']https?:\/\/10\./i, description: 'Private network reference (10.x.x.x)' },
  { pattern: /\bhref\s*=\s*["']https?:\/\/192\.168\./i, description: 'Private network reference (192.168.x.x)' },
  { pattern: /\bhref\s*=\s*["']https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./i, description: 'Private network reference (172.16-31.x.x)' },

  // file:// protocol (local file access)
  { pattern: /\bhref\s*=\s*["']file:\/\//i, description: 'file:// protocol reference' },
];

export interface ExternalReferenceAnalysis {
  hasExternalReferences: boolean;
  references: string[];
  hasSsrfIndicators: boolean;
}

/**
 * Detect external resource references in SVG content.
 * Returns details about what was found for logging purposes.
 * Does NOT block - just provides visibility.
 */
export function detectExternalReferences(svgContent: string): ExternalReferenceAnalysis {
  const references: string[] = [];
  let hasSsrfIndicators = false;

  for (const { pattern, description } of EXTERNAL_REFERENCE_PATTERNS) {
    if (pattern.test(svgContent)) {
      references.push(description);

      // Check if this looks like an SSRF attempt (internal network targets)
      if (
        description.includes('Cloud metadata') ||
        description.includes('Localhost') ||
        description.includes('Loopback') ||
        description.includes('Private network') ||
        description.includes('file://')
      ) {
        hasSsrfIndicators = true;
      }
    }
  }

  return {
    hasExternalReferences: references.length > 0,
    references,
    hasSsrfIndicators,
  };
}

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
