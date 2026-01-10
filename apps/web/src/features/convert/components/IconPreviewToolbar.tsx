import { cn } from '@/lib/utils';
import { faChrome, faEdge, faSafari, faWindows } from '@fortawesome/free-brands-svg-icons';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { PreviewContext, PreviewTheme } from './previewBackgrounds';

export interface IconPreviewToolbarProps {
  selectedContext: PreviewContext;
  selectedTheme: PreviewTheme;
  onContextChange: (context: PreviewContext) => void;
  onThemeChange: (theme: PreviewTheme) => void;
}

const previewContexts: { id: PreviewContext; label: string; icon: typeof faChrome }[] = [
  { id: 'chrome', label: 'Chrome', icon: faChrome },
  { id: 'safari', label: 'Safari', icon: faSafari },
  { id: 'edge', label: 'Edge', icon: faEdge },
  { id: 'windows', label: 'Windows', icon: faWindows },
];

export function IconPreviewToolbar({
  selectedContext,
  selectedTheme,
  onContextChange,
  onThemeChange,
}: IconPreviewToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      {/* Context selector */}
      <div className="flex gap-1">
        {previewContexts.map((context) => (
          <button
            key={context.id}
            type="button"
            onClick={() => onContextChange(context.id)}
            className={cn(
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors',
              selectedContext === context.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
            title={context.label}
          >
            <FontAwesomeIcon icon={context.icon} className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Theme toggle */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onThemeChange('light')}
          className={cn(
            'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors',
            selectedTheme === 'light'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
          title="Light mode"
        >
          <FontAwesomeIcon icon={faSun} className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onThemeChange('dark')}
          className={cn(
            'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors',
            selectedTheme === 'dark'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
          title="Dark mode"
        >
          <FontAwesomeIcon icon={faMoon} className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
