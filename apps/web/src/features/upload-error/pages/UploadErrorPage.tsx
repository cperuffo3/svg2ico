import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { env } from '@/config/env';
import {
  faFileCircleXmark,
  faHouse,
  faRotate,
  faShieldHalved,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLocation, useNavigate } from 'react-router-dom';

export type FileErrorType = 'invalid-svg' | 'invalid-png' | 'security-risk' | 'parse-error' | 'unknown';

export interface FileValidationError {
  type: FileErrorType;
  message: string;
  details?: string;
  fileName?: string;
}

interface UploadErrorState {
  error: FileValidationError;
}

const ERROR_ICONS: Record<FileErrorType, typeof faTriangleExclamation> = {
  'invalid-svg': faFileCircleXmark,
  'invalid-png': faFileCircleXmark,
  'security-risk': faShieldHalved,
  'parse-error': faTriangleExclamation,
  unknown: faTriangleExclamation,
};

const ERROR_TITLES: Record<FileErrorType, string> = {
  'invalid-svg': 'Invalid SVG File',
  'invalid-png': 'Invalid PNG File',
  'security-risk': 'Security Issue Detected',
  'parse-error': 'File Could Not Be Parsed',
  unknown: 'File Error',
};

const ERROR_DESCRIPTIONS: Record<FileErrorType, string> = {
  'invalid-svg':
    'The file you uploaded is not a valid SVG. SVG files must contain proper XML markup with an <svg> element.',
  'invalid-png':
    'The file you uploaded is not a valid PNG image. Please ensure the file is a properly formatted PNG.',
  'security-risk':
    'The file contains potentially unsafe content that cannot be processed. This may include external references, scripts, or other security concerns.',
  'parse-error':
    'We were unable to read the contents of this file. It may be corrupted or in an unsupported format.',
  unknown: 'An unexpected error occurred while processing your file.',
};

export function UploadErrorPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as UploadErrorState | null;

  // If no error state, redirect to home
  if (!state?.error) {
    navigate('/', { replace: true });
    return null;
  }

  const { error } = state;
  const icon = ERROR_ICONS[error.type] || ERROR_ICONS.unknown;
  const title = ERROR_TITLES[error.type] || ERROR_TITLES.unknown;
  const description = error.message || ERROR_DESCRIPTIONS[error.type] || ERROR_DESCRIPTIONS.unknown;

  const handleTryAgain = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center transition-all duration-300 overflow-hidden">
        <CardHeader>
          <div className="mx-auto mb-4">
            <FontAwesomeIcon icon={icon} className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          {error.fileName && (
            <p className="mt-1 font-mono text-sm text-muted-foreground truncate" title={error.fileName}>
              {error.fileName}
            </p>
          )}
          <CardDescription className="text-base mt-2">{description}</CardDescription>

          {error.details && (
            <div className="mt-4 rounded-lg bg-muted p-3 text-left">
              <p className="text-sm font-medium text-muted-foreground mb-1">Details:</p>
              <p className="text-sm text-foreground">{error.details}</p>
            </div>
          )}

          {env.IS_DEV && error.type !== 'unknown' && (
            <details className="mt-4 w-full min-w-0 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Technical details
              </summary>
              <pre className="mt-2 max-h-48 max-w-full overflow-auto rounded bg-muted p-2 text-xs">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}
        </CardHeader>

        <CardFooter className="justify-center gap-3">
          <Button onClick={handleTryAgain} className="gap-2">
            <FontAwesomeIcon icon={faRotate} className="h-4 w-4" />
            Try Another File
          </Button>
          <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
            <FontAwesomeIcon icon={faHouse} className="h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
