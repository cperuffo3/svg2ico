import type { PngColorDepth, UploadedFile } from '@/features/convert/types';
import { parsePngMetadataFromFile } from '@/features/convert/utils/pngMetadata';
import { validatePngFile, validateSvgFile } from '@/features/upload-error';
import type { FileValidationError } from '@/features/upload-error';
import {
  faCloudArrowUp,
  faRotate,
  faSpinner,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function FileUploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<FileValidationError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      // Clear any previous error when starting a new upload
      setError(null);

      const fileName = file.name.toLowerCase();
      const isSvg = fileName.endsWith('.svg');
      const isPng = fileName.endsWith('.png');

      if (!isSvg && !isPng) {
        setError({
          type: 'unknown',
          message: 'Please upload an SVG or PNG file.',
          details: `Received file with extension: ${fileName.split('.').pop() || 'none'}`,
          fileName: file.name,
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError({
          type: 'unknown',
          message: 'File size must be less than 10MB.',
          details: `File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
          fileName: file.name,
        });
        return;
      }

      setIsValidating(true);

      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        if (isPng) {
          // Validate PNG file
          const validationResult = await validatePngFile(file, dataUrl);
          if (!validationResult.valid && validationResult.error) {
            setIsValidating(false);
            setError(validationResult.error);
            return;
          }

          // For PNG files, we need to read dimensions and metadata before navigating
          const img = new Image();
          const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => reject(new Error('Failed to load PNG image'));
            img.src = dataUrl;
          });

          // Parse PNG metadata for DPI and color depth
          const metadata = await parsePngMetadataFromFile(file);

          const uploadedFile: UploadedFile = {
            file,
            name: file.name,
            size: file.size,
            dataUrl,
            type: 'png',
            dimensions,
            pngMetadata: metadata
              ? {
                  dpi: metadata.dpi,
                  colorDepth: metadata.effectiveBitDepth as PngColorDepth,
                }
              : undefined,
          };
          setIsValidating(false);
          navigate('/convert', { state: { file: uploadedFile } });
        } else {
          // Validate SVG file
          const validationResult = await validateSvgFile(file, dataUrl);
          if (!validationResult.valid && validationResult.error) {
            setIsValidating(false);
            setError(validationResult.error);
            return;
          }

          // SVG files don't need dimension detection on frontend
          const uploadedFile: UploadedFile = {
            file,
            name: file.name,
            size: file.size,
            dataUrl,
            type: 'svg',
          };
          setIsValidating(false);
          navigate('/convert', { state: { file: uploadedFile } });
        }
      } catch (err) {
        setIsValidating(false);
        setError({
          type: 'parse-error',
          message: 'Failed to process the file.',
          details: err instanceof Error ? err.message : 'Unknown error occurred',
          fileName: file.name,
        });
      }
    },
    [navigate],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile],
  );

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
      // Reset the input so the same file can be selected again
      e.target.value = '';
    },
    [processFile],
  );

  // Determine visual state
  const hasError = error !== null;

  // Get the appropriate icon
  const getIcon = () => {
    if (isValidating) return faSpinner;
    if (hasError) return faTriangleExclamation;
    return faCloudArrowUp;
  };

  // Get border/background classes based on state
  const getStateClasses = () => {
    if (hasError) {
      return 'border-destructive/50 bg-destructive/5';
    }
    if (isDragging) {
      return 'border-primary/50 bg-primary/5';
    }
    return 'border-border bg-secondary';
  };

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-lg">
      <div
        className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-12 py-4 transition-colors ${getStateClasses()} ${isValidating ? 'pointer-events-none opacity-75' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full shadow-sm ${hasError ? 'bg-destructive/10' : 'bg-card'}`}
        >
          <FontAwesomeIcon
            icon={getIcon()}
            className={`h-8 w-8 ${hasError ? 'text-destructive' : 'text-muted-foreground'} ${isValidating ? 'animate-spin' : ''}`}
          />
        </div>

        {/* Error state content */}
        {hasError && !isValidating && (
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-lg font-medium text-destructive">{error.message}</span>
            {error.fileName && (
              <span className="font-mono text-sm text-muted-foreground">{error.fileName}</span>
            )}
            {error.details && (
              <span className="max-w-md text-sm text-muted-foreground">{error.details}</span>
            )}
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={clearError}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                <FontAwesomeIcon icon={faRotate} className="h-3.5 w-3.5" />
                Reset
              </button>
              <button
                type="button"
                onClick={handleFileSelect}
                className="cursor-pointer rounded-lg bg-linear-to-br from-gradient-success-from to-gradient-success-to px-4 py-2 text-sm font-medium text-white shadow-md transition-opacity hover:opacity-90"
              >
                Try Another File
              </button>
            </div>
            <span className="pt-1 text-xs text-muted-foreground">
              Or drag & drop another file to retry
            </span>
          </div>
        )}

        {/* Validating state content */}
        {isValidating && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg font-medium text-foreground">Validating file...</span>
            <span className="pt-2 text-xs text-muted-foreground">
              Checking file integrity and security...
            </span>
          </div>
        )}

        {/* Normal state content */}
        {!hasError && !isValidating && (
          <>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-medium text-foreground">
                Drag & drop your SVG or PNG here
              </span>
              <span className="text-sm text-muted-foreground">or</span>
              <button
                type="button"
                onClick={handleFileSelect}
                className="mt-2 cursor-pointer rounded-lg bg-linear-to-br from-gradient-success-from to-gradient-success-to px-6 py-2 text-base font-medium text-white shadow-md transition-opacity hover:opacity-90"
              >
                Browse Files
              </button>
            </div>
            <span className="pt-2 text-xs text-muted-foreground">
              Accepts .svg and .png files up to 10MB
            </span>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,.png"
          onChange={handleInputChange}
          className="hidden"
          disabled={isValidating}
        />
      </div>
    </div>
  );
}
