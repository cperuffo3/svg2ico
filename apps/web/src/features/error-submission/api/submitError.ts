import { env } from '@/config/env';
import type { PatternMatchLocation, SvgErrorType } from '../types';

export interface SubmitErrorPayload {
  svgContent: string;
  originalFilename: string;
  errorMessage: string;
  errorType: SvgErrorType;
  classification?: string;
  matchedPatterns?: string[];
  patternLocations?: PatternMatchLocation[];
  userNotes?: string;
}

export async function submitErrorSubmission(payload: SubmitErrorPayload): Promise<{ id: string }> {
  const response = await fetch(`${env.API_URL}/api/v1/convert/error-submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    let message = `Submission failed (HTTP ${response.status})`;
    try {
      const json = JSON.parse(text);
      if (json.message) message = json.message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  return response.json();
}
