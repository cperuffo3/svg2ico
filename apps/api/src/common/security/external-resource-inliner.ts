import { lookup } from 'dns/promises';
import net from 'net';

const MAX_RESOURCES = 8;
const MAX_BYTES_PER_RESOURCE = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

const ALLOWED_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
]);

export interface InlineResultDetail {
  url: string;
  status: 'inlined' | 'rejected' | 'failed';
  reason?: string;
  /** Offset of the matched `<image` opening character in the source SVG. */
  tagStart: number;
  /** Offset just past the matching `>` of the opening `<image …>` tag. */
  tagEnd: number;
}

export interface InlineResult {
  result: string;
  inlined: number;
  failed: number;
  details: InlineResultDetail[];
}

function isPrivateOrLoopbackIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('fe80')) return true;
    return false;
  }
  return false;
}

async function isHostSafe(hostname: string): Promise<boolean> {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost')) return false;
  if (net.isIP(hostname)) return !isPrivateOrLoopbackIp(hostname);
  try {
    const addresses = await lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateOrLoopbackIp(addr.address)) return false;
    }
    return addresses.length > 0;
  } catch {
    return false;
  }
}

type FetchOutcome =
  | { ok: true; contentType: string; buffer: Buffer }
  | { ok: false; status: 'rejected' | 'failed'; reason: string };

async function fetchResource(url: string): Promise<FetchOutcome> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, status: 'failed', reason: 'invalid URL' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, status: 'rejected', reason: `disallowed protocol ${parsed.protocol}` };
  }
  if (!(await isHostSafe(parsed.hostname))) {
    return { ok: false, status: 'rejected', reason: 'blocked host (private/loopback)' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!response.ok) {
      return { ok: false, status: 'failed', reason: `HTTP ${response.status}` };
    }
    const contentType =
      response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return { ok: false, status: 'rejected', reason: `unsupported content-type "${contentType}"` };
    }
    const reader = response.body?.getReader();
    if (!reader) {
      return { ok: false, status: 'failed', reason: 'empty response body' };
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.length;
      if (total > MAX_BYTES_PER_RESOURCE) {
        await reader.cancel();
        return { ok: false, status: 'rejected', reason: 'resource too large' };
      }
      chunks.push(value);
    }
    return { ok: true, contentType, buffer: Buffer.concat(chunks) };
  } catch (err) {
    return {
      ok: false,
      status: 'failed',
      reason: err instanceof Error ? err.message : 'fetch failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Matches a <image ...> opening tag's href attribute. Captures: 1=attr name,
// 2=quote char, 3=URL. The URL must be http(s) to qualify for inlining.
const HREF_RE = /<image\b[^>]*?\b(xlink:href|href)\s*=\s*("|')(https?:\/\/[^"']+)\2/gi;

/**
 * Fetch external `<image href="https://...">` resources and inline them as
 * `data:` URIs so that resvg (which does not fetch external URLs) can render
 * them. Rejects unsafe targets (SSRF guards), oversized payloads, disallowed
 * content types, and non-http(s) schemes. Original href is left intact when
 * a resource cannot be inlined — resvg will render that image blank.
 */
export async function inlineExternalImages(svg: string): Promise<InlineResult> {
  const matches = Array.from(svg.matchAll(HREF_RE));
  if (matches.length === 0) {
    return { result: svg, inlined: 0, failed: 0, details: [] };
  }

  const uniqueUrls = Array.from(new Set(matches.map((m) => m[3]))).slice(0, MAX_RESOURCES);
  const fetched = new Map<string, FetchOutcome>();
  await Promise.all(
    uniqueUrls.map(async (url) => {
      fetched.set(url, await fetchResource(url));
    }),
  );

  const details: InlineResultDetail[] = [];
  let inlined = 0;
  let failed = 0;

  // Rewrite by walking matches in order and splicing only the URL substring,
  // so any other attributes on the <image> tag are preserved verbatim.
  let out = '';
  let cursor = 0;
  for (const match of matches) {
    const url = match[3];
    const matchStart = match.index!;
    const urlStart = matchStart + match[0].indexOf(url);
    const urlEnd = urlStart + url.length;

    // Find the boundaries of the full `<image …>` opening tag, for callers
    // that want to highlight or rewrite the whole tag (e.g. error reporting).
    const tagStart = matchStart;
    const tagCloseRel = svg.indexOf('>', matchStart);
    const tagEnd = tagCloseRel === -1 ? svg.length : tagCloseRel + 1;

    const outcome = fetched.get(url);
    out += svg.slice(cursor, urlStart);

    if (outcome && outcome.ok) {
      const dataUri = `data:${outcome.contentType};base64,${outcome.buffer.toString('base64')}`;
      out += dataUri;
      inlined++;
      details.push({ url, status: 'inlined', tagStart, tagEnd });
    } else {
      // Leave the original URL in place
      out += url;
      if (outcome) {
        failed++;
        details.push({ url, status: outcome.status, reason: outcome.reason, tagStart, tagEnd });
      } else {
        // Beyond MAX_RESOURCES — left untouched
        details.push({
          url,
          status: 'rejected',
          reason: 'too many external resources',
          tagStart,
          tagEnd,
        });
      }
    }

    cursor = urlEnd;
  }
  out += svg.slice(cursor);

  return { result: out, inlined, failed, details };
}
