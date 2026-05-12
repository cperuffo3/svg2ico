const ATTACK_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /<!ENTITY[^>]*>/gi, description: 'ENTITY declaration (XXE)' },
  { pattern: /<!DOCTYPE[^>]*\[[\s\S]*?\]/gi, description: 'DOCTYPE with internal subset (XXE)' },
  { pattern: /SYSTEM\s+["'][^"']*["']/gi, description: 'SYSTEM identifier (XXE)' },
  { pattern: /PUBLIC\s+["'][^"']*["']/gi, description: 'PUBLIC identifier (XXE)' },
  { pattern: /<script[\s\S]*?(?:<\/script>|\/>)/gi, description: 'Script tag' },
  { pattern: /javascript:[^"'\s>]*/gi, description: 'javascript: protocol' },
  { pattern: /vbscript:[^"'\s>]*/gi, description: 'vbscript: protocol' },
  { pattern: /data:\s*text\/html[^"'\s>]*/gi, description: 'data:text/html URI' },
  { pattern: /\son\w+\s*=\s*"[^"]*"/gi, description: 'Event handler attribute' },
  { pattern: /\son\w+\s*=\s*'[^']*'/gi, description: 'Event handler attribute' },
  { pattern: /xmlns:xi\s*=[^>\s]*/gi, description: 'XInclude namespace' },
  { pattern: /<xi:include[^>]*\/?>/gi, description: 'XInclude element' },
];

/**
 * Pretty-print XML/SVG content with basic indentation.
 * Adds line breaks between tags and indents based on tag nesting depth.
 */
export function prettifyXml(input: string): string {
  if (!input.trim()) return input;
  const collapsed = input.replace(/>\s+</g, '><').trim();
  const tokens = collapsed
    .split(/(<[^>]+>)/g)
    .filter((t) => t.length > 0)
    .map((t) => t.trim())
    .filter(Boolean);

  const indentUnit = '  ';
  const lines: string[] = [];
  let depth = 0;

  for (const token of tokens) {
    if (token.startsWith('<?') || token.startsWith('<!--') || token.startsWith('<![CDATA[')) {
      lines.push(indentUnit.repeat(depth) + token);
      continue;
    }
    if (token.startsWith('<!')) {
      // DOCTYPE etc.
      lines.push(indentUnit.repeat(depth) + token);
      continue;
    }
    if (token.startsWith('</')) {
      depth = Math.max(depth - 1, 0);
      lines.push(indentUnit.repeat(depth) + token);
      continue;
    }
    if (token.startsWith('<') && token.endsWith('/>')) {
      lines.push(indentUnit.repeat(depth) + token);
      continue;
    }
    if (token.startsWith('<')) {
      lines.push(indentUnit.repeat(depth) + token);
      depth++;
      continue;
    }
    // Text content
    lines.push(indentUnit.repeat(depth) + token);
  }

  return lines.join('\n');
}

export interface HighlightRange {
  description: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

function offsetToPosition(content: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

/**
 * Re-find attack pattern matches in the given content and return their ranges.
 * Used for highlighting in the Monaco editor after prettifying — the original
 * backend offsets do not survive prettification, so we re-scan client-side.
 */
export function findHighlightRanges(content: string): HighlightRange[] {
  const ranges: HighlightRange[] = [];
  for (const { pattern, description } of ATTACK_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    let safety = 0;
    while ((match = globalPattern.exec(content)) !== null && safety < 100) {
      safety++;
      const start = offsetToPosition(content, match.index);
      const end = offsetToPosition(content, match.index + match[0].length);
      ranges.push({
        description,
        startLine: start.line,
        startColumn: start.column,
        endLine: end.line,
        endColumn: end.column,
      });
      if (match.index === globalPattern.lastIndex) {
        globalPattern.lastIndex++;
      }
    }
  }
  return ranges;
}

/**
 * Find the `<image …>` opening tags that reference the given URLs. Used to
 * highlight `external_resource_invalid` errors after the SVG is prettified
 * (so the backend offsets cannot be reused directly).
 */
export function findImageTagRangesForUrls(content: string, urls: string[]): HighlightRange[] {
  if (urls.length === 0) return [];
  const ranges: HighlightRange[] = [];
  for (const url of urls) {
    let cursor = 0;
    while (cursor < content.length) {
      const urlIdx = content.indexOf(url, cursor);
      if (urlIdx === -1) break;
      cursor = urlIdx + url.length;
      // Walk backwards to find the enclosing `<image`
      const tagOpen = content.lastIndexOf('<image', urlIdx);
      if (tagOpen === -1) continue;
      const tagClose = content.indexOf('>', urlIdx);
      if (tagClose === -1) continue;
      const start = offsetToPosition(content, tagOpen);
      const end = offsetToPosition(content, tagClose + 1);
      ranges.push({
        description: `External image reference: ${url}`,
        startLine: start.line,
        startColumn: start.column,
        endLine: end.line,
        endColumn: end.column,
      });
    }
  }
  return ranges;
}
