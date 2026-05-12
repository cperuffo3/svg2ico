import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MonacoSvgViewer } from '@/features/error-submission';
import { findHighlightRanges, prettifyXml } from '@/features/error-submission/utils/prettifyXml';
import {
  inlineSvgForPreview,
  svgHasExternalImageRefs,
} from '@/features/home/utils/inlineSvgPreview';
import { useEffect, useMemo, useState } from 'react';
import {
  useDeleteErrorSubmission,
  useErrorSubmissionDetail,
  useErrorSubmissions,
  useUpdateErrorSubmission,
} from '../hooks';
import type { ErrorSubmissionDetail, ErrorSubmissionSummary } from '../types';
import { StatCard } from './StatCard';

interface SubmissionsDashboardProps {
  password: string;
  onAuthError: () => void;
}

type FilterKey = 'all' | 'unreviewed' | 'reviewed';

const ERROR_TYPE_LABELS: Record<string, string> = {
  invalid_format: 'Invalid format',
  security_pre_sanitize: 'Pre-sanitize security',
  security_post_sanitize: 'Post-sanitize security',
  sanitization_failed: 'Sanitization failed',
  external_resource_invalid: 'External resource not an image',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

interface SubmissionDetailPanelProps {
  password: string;
  detail: ErrorSubmissionDetail;
  onDeleted: () => void;
}

function SubmissionDetailPanel({ password, detail, onDeleted }: SubmissionDetailPanelProps) {
  const updateMutation = useUpdateErrorSubmission(password);
  const deleteMutation = useDeleteErrorSubmission(password);
  const [reviewerNotes, setReviewerNotes] = useState(detail.reviewerNotes ?? '');

  // External `<image href="https://...">` references would be blocked by the
  // admin page's CSP (img-src 'self' data: blob:), so they wouldn't render in
  // the inline preview either. Inline them via the same SSRF-safe endpoint
  // used by /convert so the preview matches what the conversion will produce.
  const [previewSvg, setPreviewSvg] = useState(detail.svgContent);
  useEffect(() => {
    let cancelled = false;
    setPreviewSvg(detail.svgContent);
    if (svgHasExternalImageRefs(detail.svgContent)) {
      inlineSvgForPreview(detail.svgContent).then((inlined) => {
        if (!cancelled) setPreviewSvg(inlined);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [detail.svgContent]);

  const formatted = useMemo(() => prettifyXml(detail.svgContent), [detail.svgContent]);
  const highlights = useMemo(() => findHighlightRanges(formatted), [formatted]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono text-sm">{detail.originalFilename}</div>
          <div className="text-xs text-muted-foreground">
            {ERROR_TYPE_LABELS[detail.errorType] ?? detail.errorType}
            {detail.classification ? ` · ${detail.classification}` : ''} ·{' '}
            {formatBytes(detail.fileSizeBytes)} · {new Date(detail.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={detail.reviewed ? 'outline' : 'default'}
            size="sm"
            onClick={() =>
              updateMutation.mutate({
                id: detail.id,
                reviewed: !detail.reviewed,
              })
            }
            disabled={updateMutation.isPending}
          >
            {detail.reviewed ? 'Mark unreviewed' : 'Mark reviewed'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (window.confirm('Delete this submission?')) {
                deleteMutation.mutate(detail.id, {
                  onSuccess: onDeleted,
                });
              }
            }}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
        {detail.errorMessage}
      </div>

      {detail.matchedPatterns && detail.matchedPatterns.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
          <div className="font-medium mb-1">Detected patterns</div>
          <ul className="list-disc list-inside space-y-0.5">
            {detail.matchedPatterns.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">Preview</div>
        <div className="flex items-center justify-center rounded-md border bg-muted/30 p-4 min-h-32">
          <div
            className="max-w-full max-h-64 [&>svg]:max-h-64 [&>svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: previewSvg }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Preview is rendered from the raw submitted SVG. Treat this content as untrusted.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">Source</div>
        <MonacoSvgViewer value={formatted} highlights={highlights} height={400} />
      </div>

      {detail.userNotes && (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <div className="text-xs font-medium text-muted-foreground mb-1">User notes</div>
          {detail.userNotes}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground">Reviewer notes</label>
        <Textarea
          rows={3}
          value={reviewerNotes}
          onChange={(e) => setReviewerNotes(e.target.value.slice(0, 2000))}
          placeholder="Notes only visible to admins"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() =>
              updateMutation.mutate({
                id: detail.id,
                reviewerNotes: reviewerNotes || null,
              })
            }
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save notes'}
          </Button>
        </div>
      </div>
    </>
  );
}

export function SubmissionsDashboard({ password, onAuthError }: SubmissionsDashboardProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useErrorSubmissions(password, filter);
  const detail = useErrorSubmissionDetail(password, selectedId);

  if (list.error?.message === 'UNAUTHORIZED' || detail.error?.message === 'UNAUTHORIZED') {
    onAuthError();
    return null;
  }

  const items: ErrorSubmissionSummary[] = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const unreviewed = list.data?.unreviewed ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Submissions" value={total.toLocaleString()} subtitle="All time" />
        <StatCard
          title="Unreviewed"
          value={unreviewed.toLocaleString()}
          subtitle="Awaiting review"
          className="border-amber-500/20 bg-amber-500/5"
        />
        <StatCard
          title="Reviewed"
          value={Math.max(total - unreviewed, 0).toLocaleString()}
          subtitle="Closed out"
        />
      </div>

      <div className="flex gap-2">
        {(['all', 'unreviewed', 'reviewed'] as FilterKey[]).map((key) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setFilter(key);
              setSelectedId(null);
            }}
          >
            {key === 'all' ? 'All' : key === 'unreviewed' ? 'Unreviewed' : 'Reviewed'}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b text-sm font-medium">Submissions ({items.length})</div>
          {list.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No submissions yet.</div>
          ) : (
            <ul className="max-h-150 overflow-y-auto divide-y">
              {items.map((item) => {
                const isActive = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full cursor-pointer text-left px-3 py-2 text-sm hover:bg-muted/50 ${
                        isActive ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-xs">{item.originalFilename}</span>
                        {!item.reviewed && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            New
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {ERROR_TYPE_LABELS[item.errorType] ?? item.errorType} ·{' '}
                        {formatBytes(item.fileSizeBytes)} · {formatTimeAgo(item.createdAt)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-card border rounded-lg p-4 space-y-4">
          {!selectedId && (
            <div className="text-sm text-muted-foreground">
              Select a submission to view details.
            </div>
          )}
          {selectedId && detail.isLoading && (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
          {detail.data && (
            <SubmissionDetailPanel
              key={detail.data.id}
              password={password}
              detail={detail.data}
              onDeleted={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
