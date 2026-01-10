import type { PngColorDepth, UploadedFile } from '@/features/convert/types';
import { parsePngMetadataFromFile } from '@/features/convert/utils/pngMetadata';
import { faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function FileUploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const processFile = useCallback(
    (file: File) => {
      const fileName = file.name.toLowerCase();
      const isSvg = fileName.endsWith('.svg');
      const isPng = fileName.endsWith('.png');

      if (!isSvg && !isPng) {
        alert('Please upload an SVG or PNG file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;

        if (isPng) {
          // For PNG files, we need to read dimensions and metadata before navigating
          const img = new Image();
          img.onload = async () => {
            // Parse PNG metadata for DPI and color depth
            const metadata = await parsePngMetadataFromFile(file);

            const uploadedFile: UploadedFile = {
              file,
              name: file.name,
              size: file.size,
              dataUrl,
              type: 'png',
              dimensions: {
                width: img.naturalWidth,
                height: img.naturalHeight,
              },
              pngMetadata: metadata
                ? {
                    dpi: metadata.dpi,
                    colorDepth: metadata.effectiveBitDepth as PngColorDepth,
                  }
                : undefined,
            };
            navigate('/convert', { state: { file: uploadedFile } });
          };
          img.onerror = () => {
            alert('Failed to read PNG file. Please try a different file.');
          };
          img.src = dataUrl;
        } else {
          // SVG files don't need dimension detection on frontend
          const uploadedFile: UploadedFile = {
            file,
            name: file.name,
            size: file.size,
            dataUrl,
            type: 'svg',
          };
          navigate('/convert', { state: { file: uploadedFile } });
        }
      };
      reader.readAsDataURL(file);
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
    },
    [processFile],
  );

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-lg">
      <div
        className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-12 py-4 transition-colors ${
          isDragging ? 'border-primary/50 bg-primary/5' : 'border-border bg-secondary'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card shadow-sm">
          <FontAwesomeIcon icon={faCloudArrowUp} className="h-8 w-8 text-muted-foreground" />
        </div>
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
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,.png"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
