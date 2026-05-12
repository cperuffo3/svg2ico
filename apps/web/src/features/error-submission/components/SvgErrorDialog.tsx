import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { faCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMemo, useState } from 'react';
import { submitErrorSubmission } from '../api/submitError';
import type { SvgErrorDialogData } from '../types';
import {
  findHighlightRanges,
  findImageTagRangesForUrls,
  prettifyXml,
  type HighlightRange,
} from '../utils/prettifyXml';
import { MonacoSvgViewer } from './MonacoSvgViewer';

interface SvgErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SvgErrorDialogData | null;
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  invalid_format: 'Invalid SVG format',
  security_pre_sanitize: 'Unsafe SVG content detected',
  security_post_sanitize: 'SVG could not be safely processed',
  sanitization_failed: 'SVG sanitization failed',
  external_resource_invalid: 'External image reference is not an image',
};

interface SvgErrorDialogBodyProps {
  data: SvgErrorDialogData;
  onClose: () => void;
}

function SvgErrorDialogBody({ data, onClose }: SvgErrorDialogBodyProps) {
  const [formatted, setFormatted] = useState(true);
  const [userNotes, setUserNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const displayContent = useMemo(
    () => (formatted ? prettifyXml(data.svgContent) : data.svgContent),
    [data.svgContent, formatted],
  );

  const highlights: HighlightRange[] = useMemo(() => {
    if (data.errorType === 'external_resource_invalid') {
      // matchedPatterns from the backend are formatted as "URL — reason";
      // extract the URL prefix to locate each problematic <image> tag.
      const urls = (data.matchedPatterns ?? [])
        .map((s) => s.split(' — ')[0]?.trim())
        .filter((s): s is string => !!s);
      return findImageTagRangesForUrls(displayContent, urls);
    }
    return findHighlightRanges(displayContent);
  }, [displayContent, data.errorType, data.matchedPatterns]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitErrorSubmission({
        svgContent: data.svgContent,
        originalFilename: data.originalFilename,
        errorMessage: data.message,
        errorType: data.errorType,
        classification: data.classification,
        matchedPatterns: data.matchedPatterns,
        patternLocations: data.patternLocations,
        userNotes: userNotes.trim() || undefined,
      });
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const title = ERROR_TYPE_LABELS[data.errorType] ?? 'SVG processing error';
  const patternList = data.matchedPatterns ?? highlights.map((h) => h.description);
  const uniquePatterns = Array.from(new Set(patternList));

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} className="h-5 w-5 text-amber-500" />
          {title}
        </DialogTitle>
        <DialogDescription>{data.message}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-mono text-xs px-2 py-1 rounded bg-muted">
            {data.originalFilename}
          </span>
          <span className="text-muted-foreground text-xs">
            {(data.fileSizeBytes / 1024).toFixed(1)} KB
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={formatted ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormatted((v) => !v)}
            >
              {formatted ? 'Formatted' : 'Raw'}
            </Button>
          </div>
        </div>

        {uniquePatterns.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <div className="font-medium mb-1 text-amber-700 dark:text-amber-400">
              Problematic content found:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-300">
              {uniquePatterns.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <MonacoSvgViewer value={displayContent} highlights={highlights} />

        {data.canSubmit && !submitSuccess && (
          <div className="rounded-md border border-border bg-card p-3 space-y-2">
            <div className="text-sm font-medium">Help us improve svg2ico</div>
            <p className="text-xs text-muted-foreground">
              Submit this SVG so an admin can review what failed. We will store the file contents
              and the error message. Submission is optional and no account is required.
            </p>
            <Textarea
              placeholder="Optional: describe what you were trying to do or where this SVG came from."
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value.slice(0, 2000))}
              rows={3}
              className="text-sm"
            />
            {submitError && <p className="text-xs text-destructive">{submitError}</p>}
          </div>
        )}

        {submitSuccess && (
          <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
            <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
            Thanks — your file was submitted for review.
          </div>
        )}
      </div>

      <DialogFooter>
        {data.canSubmit && !submitSuccess && (
          <>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              No thanks
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit file for review'}
            </Button>
          </>
        )}
        {(submitSuccess || !data.canSubmit) && <Button onClick={onClose}>Close</Button>}
      </DialogFooter>
    </>
  );
}

export function SvgErrorDialog({ open, onOpenChange, data }: SvgErrorDialogProps) {
  // Re-mount the body when the data identity changes so internal state (notes,
  // submission status, etc.) is reset cleanly without a useEffect.
  const dataKey = data
    ? `${data.originalFilename}|${data.errorType}|${data.fileSizeBytes}`
    : 'empty';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        {data && (
          <SvgErrorDialogBody key={dataKey} data={data} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
