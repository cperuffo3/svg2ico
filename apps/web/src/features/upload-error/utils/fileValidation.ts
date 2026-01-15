import type { FileValidationError } from '../pages/UploadErrorPage';

/**
 * Attack patterns - these are almost NEVER present in legitimate SVG files.
 * Mirrors the backend security checks for early client-side rejection.
 */
const SVG_ATTACK_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  // XXE patterns
  { pattern: /<!ENTITY/i, description: 'ENTITY declaration (potential XXE attack)' },
  { pattern: /<!DOCTYPE[^>]*\[/i, description: 'DOCTYPE with internal subset (potential XXE attack)' },
  { pattern: /SYSTEM\s+["']/i, description: 'SYSTEM identifier (potential XXE attack)' },
  { pattern: /PUBLIC\s+["']/i, description: 'PUBLIC identifier (potential XXE attack)' },

  // Script injection
  { pattern: /<script/i, description: 'Script tag detected' },

  // Protocol handlers
  { pattern: /javascript:/i, description: 'JavaScript protocol handler' },
  { pattern: /vbscript:/i, description: 'VBScript protocol handler' },
  { pattern: /data:\s*text\/html/i, description: 'Embedded HTML data URI' },

  // Event handlers
  { pattern: /\son\w+\s*=/i, description: 'Event handler attribute (onclick, onload, etc.)' },

  // External entity references
  { pattern: /xmlns:xi\s*=.*xinclude/i, description: 'XInclude namespace' },
  { pattern: /xi:include/i, description: 'XInclude element' },
];

/**
 * PNG file signature (magic bytes)
 */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface ValidationResult {
  valid: boolean;
  error?: FileValidationError;
}

/**
 * Check SVG content for security threats
 */
function checkSvgSecurityThreats(svgContent: string): string | null {
  for (const { pattern, description } of SVG_ATTACK_PATTERNS) {
    if (pattern.test(svgContent)) {
      return description;
    }
  }
  return null;
}

/**
 * Validate that the content is a valid SVG structure
 */
function validateSvgStructure(svgContent: string): string | null {
  // Must contain an <svg tag
  if (!/<svg[\s>]/i.test(svgContent)) {
    return 'No <svg> element found. The file does not appear to be a valid SVG.';
  }

  // Try to parse as XML
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      const errorText = parserError.textContent || 'Unknown parse error';
      // Extract the most relevant part of the error
      const errorMatch = errorText.match(/error[^:]*:\s*(.+?)(?:\n|$)/i);
      return errorMatch ? errorMatch[1].trim() : 'XML parsing error: The SVG contains invalid markup.';
    }

    // Verify we got an SVG element
    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      return 'No <svg> element found after parsing. The file structure is invalid.';
    }

    return null;
  } catch {
    return 'Failed to parse SVG content. The file may be corrupted or contain invalid characters.';
  }
}

/**
 * Test if an SVG can be rendered as an image
 * This catches issues that pass XML parsing but fail to render
 */
export function testSvgRenderable(dataUrl: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      resolve({
        valid: false,
        error: {
          type: 'parse-error',
          message: 'The SVG took too long to load and may be too complex or malformed.',
        },
      });
    }, 5000);

    img.onload = () => {
      clearTimeout(timeout);
      // Check if the image has valid dimensions
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        resolve({
          valid: false,
          error: {
            type: 'invalid-svg',
            message: 'The SVG rendered with zero dimensions. It may be missing viewBox or width/height attributes.',
          },
        });
      } else {
        resolve({ valid: true });
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve({
        valid: false,
        error: {
          type: 'invalid-svg',
          message:
            'The browser could not render this SVG. It may contain unsupported features or be malformed.',
        },
      });
    };

    img.src = dataUrl;
  });
}

/**
 * Validate SVG file content
 * Performs security checks, structure validation, and render testing
 */
export async function validateSvgFile(
  file: File,
  dataUrl: string,
): Promise<ValidationResult> {
  // Read file content for text-based validation
  const content = await file.text();

  // Check 1: Security threats
  const securityThreat = checkSvgSecurityThreats(content);
  if (securityThreat) {
    return {
      valid: false,
      error: {
        type: 'security-risk',
        message: 'This SVG file contains potentially unsafe content and cannot be processed.',
        details: securityThreat,
        fileName: file.name,
      },
    };
  }

  // Check 2: SVG structure
  const structureError = validateSvgStructure(content);
  if (structureError) {
    return {
      valid: false,
      error: {
        type: 'invalid-svg',
        message: structureError,
        fileName: file.name,
      },
    };
  }

  // Check 3: Render test
  const renderResult = await testSvgRenderable(dataUrl);
  if (!renderResult.valid && renderResult.error) {
    return {
      valid: false,
      error: {
        ...renderResult.error,
        fileName: file.name,
      },
    };
  }

  return { valid: true };
}

/**
 * Validate PNG file by checking magic bytes
 */
export async function validatePngSignature(file: File): Promise<ValidationResult> {
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const isValidPng = PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);

    if (!isValidPng) {
      return {
        valid: false,
        error: {
          type: 'invalid-png',
          message:
            'This file does not have a valid PNG signature. It may be corrupted or not actually a PNG file.',
          fileName: file.name,
        },
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: {
        type: 'parse-error',
        message: 'Failed to read the file. It may be corrupted or inaccessible.',
        fileName: file.name,
      },
    };
  }
}

/**
 * Test if a PNG can be rendered as an image
 */
export function testPngRenderable(dataUrl: string, fileName: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      resolve({
        valid: false,
        error: {
          type: 'parse-error',
          message: 'The PNG took too long to load. The file may be corrupted or too large.',
          fileName,
        },
      });
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        resolve({
          valid: false,
          error: {
            type: 'invalid-png',
            message: 'The PNG has invalid dimensions (0x0). The file may be corrupted.',
            fileName,
          },
        });
      } else {
        resolve({ valid: true });
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve({
        valid: false,
        error: {
          type: 'invalid-png',
          message:
            'The browser could not decode this PNG. The file may be corrupted or use an unsupported format.',
          fileName,
        },
      });
    };

    img.src = dataUrl;
  });
}

/**
 * Validate PNG file
 * Checks signature and render capability
 */
export async function validatePngFile(
  file: File,
  dataUrl: string,
): Promise<ValidationResult> {
  // Check 1: PNG signature
  const signatureResult = await validatePngSignature(file);
  if (!signatureResult.valid) {
    return signatureResult;
  }

  // Check 2: Render test
  const renderResult = await testPngRenderable(dataUrl, file.name);
  if (!renderResult.valid) {
    return renderResult;
  }

  return { valid: true };
}

/**
 * Unified file validation
 */
export async function validateFile(
  file: File,
  dataUrl: string,
  fileType: 'svg' | 'png',
): Promise<ValidationResult> {
  if (fileType === 'svg') {
    return validateSvgFile(file, dataUrl);
  } else {
    return validatePngFile(file, dataUrl);
  }
}
