import { env } from '@/config/env';

const EXTERNAL_HREF_RE = /<image\b[^>]*?\b(?:xlink:)?href\s*=\s*["']https?:\/\//i;

export function svgHasExternalImageRefs(svg: string): boolean {
  return EXTERNAL_HREF_RE.test(svg);
}

/**
 * Browsers do not fetch external resources when rendering an SVG inside an
 * <img src="data:image/svg+xml;..."> — so any `<image href="https://...">`
 * inside the uploaded SVG would show blank in the preview. The backend has
 * an SSRF-safe inlining endpoint; call it and return the inlined SVG so the
 * preview matches what the conversion will produce.
 *
 * Returns the original SVG unchanged if the request fails — the preview is
 * a best-effort UX nicety and the actual conversion still runs its own
 * server-side inlining.
 */
export async function inlineSvgForPreview(svg: string): Promise<string> {
  if (!svgHasExternalImageRefs(svg)) return svg;
  try {
    const response = await fetch(`${env.API_URL}/api/v1/convert/svg-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ svgContent: svg }),
    });
    if (!response.ok) return svg;
    const json = (await response.json()) as { svgContent?: string };
    return typeof json.svgContent === 'string' ? json.svgContent : svg;
  } catch {
    return svg;
  }
}

/**
 * Convert a UTF-8 string to a `data:image/svg+xml;base64,…` URL.
 * Uses TextEncoder + chunked btoa to handle non-ASCII content safely.
 */
export function svgToDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  // Chunk to avoid arg-count limits on String.fromCharCode for large SVGs.
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}
