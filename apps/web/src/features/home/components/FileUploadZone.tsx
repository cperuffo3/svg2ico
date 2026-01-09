import type { UploadedFile } from '@/features/convert/types';
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
      if (!file.name.toLowerCase().endsWith('.svg')) {
        alert('Please upload an SVG file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const uploadedFile: UploadedFile = {
          file,
          name: file.name,
          size: file.size,
          dataUrl,
        };
        navigate('/convert', { state: { file: uploadedFile } });
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
        className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors ${
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
          <span className="text-lg font-medium text-foreground">Drag & drop your SVG here</span>
          <span className="text-sm text-muted-foreground">or</span>
          <button
            type="button"
            onClick={handleFileSelect}
            className="cursor-pointer pt-1 text-base font-medium text-primary transition-colors hover:text-primary/80"
          >
            Browse Files
          </button>
        </div>
        <span className="pt-2 text-xs text-muted-foreground">Accepts .svg files up to 10MB</span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
