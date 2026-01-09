import { Button } from '@/components/ui/button';
import { Footer, Header } from '@/features/home/components';
import { useDebouncedValue } from '@/hooks';
import {
  faArrowsRotate,
  faCircleInfo,
  faShieldHalved,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ContextPreviewCard,
  ConversionProgress,
  OutputFormatSelector,
  SvgPreview,
} from '../components';
import {
  getSizeAvailabilityInfo,
  type BackgroundRemovalOption,
  type ConversionOptions as ConversionOptionsType,
  type ConversionState,
  type ConversionStep,
  type OutputFormat,
  type PngBackgroundRemovalProgress,
  type RoundnessValue,
  type UploadedFile,
} from '../types';
import { removePngBackground } from '../utils/pngBackgroundRemoval';

const SMALL_HEIGHT_THRESHOLD = 1100;

function useIsSmallHeight() {
  const [isSmallHeight, setIsSmallHeight] = useState(
    () => typeof window !== 'undefined' && window.innerHeight < SMALL_HEIGHT_THRESHOLD,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsSmallHeight(window.innerHeight < SMALL_HEIGHT_THRESHOLD);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isSmallHeight;
}

function getConversionSteps(format: OutputFormat, fileType: 'svg' | 'png'): ConversionStep[] {
  const formatLabels: Record<OutputFormat, string> = {
    ico: 'ICO (16-256px)',
    icns: 'ICNS (16-1024px)',
    favicon: 'Favicon ICO',
    all: 'ICO + ICNS bundle',
  };

  const fileTypeLabel = fileType === 'svg' ? 'SVG' : 'PNG';

  return [
    { id: 'validate', label: `Validating ${fileTypeLabel} file`, status: 'pending' },
    { id: 'render', label: `Rendering ${formatLabels[format]}`, status: 'pending' },
    { id: 'generate', label: 'Generating multi-resolution icon', status: 'pending' },
    { id: 'optimize', label: 'Optimizing file size', status: 'pending' },
    { id: 'prepare', label: 'Preparing download', status: 'pending' },
  ];
}

const defaultSteps: ConversionStep[] = getConversionSteps('ico', 'svg');

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ConvertPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const uploadedFile = location.state?.file as UploadedFile | undefined;

  const [options, setOptions] = useState<ConversionOptionsType>({
    scale: 100,
    backgroundRemoval: { mode: 'none' },
    cornerRadius: 0,
    outputFormat: 'icns',
  });

  // Debounce scale and cornerRadius for the expensive ContextPreviewCard renders
  const debouncedScale = useDebouncedValue(options.scale, 150);
  const debouncedCornerRadius = useDebouncedValue(options.cornerRadius, 150);

  const [conversionState, setConversionState] = useState<ConversionState>('idle');
  const [steps, setSteps] = useState<ConversionStep[]>(defaultSteps);
  const [progress, setProgress] = useState(0);

  // PNG background removal state
  const [pngBackgroundRemovalProgress, setPngBackgroundRemovalProgress] =
    useState<PngBackgroundRemovalProgress>({ state: 'idle' });
  const [processedPngDataUrl, setProcessedPngDataUrl] = useState<string | null>(null);
  const pngRemovalAbortRef = useRef<boolean>(false);

  const handleRemove = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleScaleChange = useCallback((scale: number) => {
    setOptions((prev) => ({ ...prev, scale }));
  }, []);

  const handleFormatChange = useCallback((outputFormat: OutputFormat) => {
    setOptions((prev) => ({ ...prev, outputFormat }));
  }, []);

  const handleBackgroundRemovalChange = useCallback(
    (backgroundRemoval: BackgroundRemovalOption) => {
      setOptions((prev) => ({ ...prev, backgroundRemoval }));
    },
    [],
  );

  const handleCornerRadiusChange = useCallback((cornerRadius: RoundnessValue) => {
    setOptions((prev) => ({ ...prev, cornerRadius }));
  }, []);

  // Handle PNG background removal using AI
  const handlePngBackgroundRemoval = useCallback(async () => {
    if (!uploadedFile || uploadedFile.type !== 'png') return;

    // If already completed, don't re-run
    if (pngBackgroundRemovalProgress.state === 'completed') return;

    pngRemovalAbortRef.current = false;

    try {
      const resultDataUrl = await removePngBackground(
        uploadedFile.dataUrl,
        (progress) => {
          if (pngRemovalAbortRef.current) return;
          setPngBackgroundRemovalProgress(progress);
        },
      );

      if (pngRemovalAbortRef.current) return;

      setProcessedPngDataUrl(resultDataUrl);
      setPngBackgroundRemovalProgress({ state: 'completed', progress: 100 });
    } catch (error) {
      if (pngRemovalAbortRef.current) return;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPngBackgroundRemovalProgress({ state: 'error', error: errorMessage });
    }
  }, [uploadedFile, pngBackgroundRemovalProgress.state]);

  const convertFile = useCallback(async () => {
    if (!uploadedFile) return;

    setConversionState('converting');
    setProgress(0);

    // Get format-specific steps
    const formatSteps = getConversionSteps(options.outputFormat, uploadedFile.type);
    const stepsCopy = [...formatSteps];
    setSteps(stepsCopy);

    const updateStep = (index: number, status: ConversionStep['status']) => {
      stepsCopy[index] = { ...stepsCopy[index], status };
      setSteps([...stepsCopy]);
      setProgress(((index + (status === 'completed' ? 1 : 0.5)) / stepsCopy.length) * 100);
    };

    try {
      // Step 1: Validate
      updateStep(0, 'in_progress');
      await new Promise((resolve) => setTimeout(resolve, 200));
      updateStep(0, 'completed');

      // Step 2: Render - Prepare form data and send to API
      updateStep(1, 'in_progress');

      const formData = new FormData();

      // If PNG background removal was completed, send the processed file instead
      let fileToSend: File | Blob = uploadedFile.file;
      if (processedPngDataUrl && uploadedFile.type === 'png') {
        // Convert processed data URL back to blob
        const response = await fetch(processedPngDataUrl);
        const blob = await response.blob();
        fileToSend = new File([blob], uploadedFile.name, { type: 'image/png' });
      }
      formData.append('file', fileToSend);

      // Map frontend format to backend format
      const formatMap: Record<OutputFormat, 'ico' | 'icns' | 'both' | 'favicon'> = {
        ico: 'ico',
        icns: 'icns',
        all: 'both',
        favicon: 'favicon',
      };
      const apiFormat = formatMap[options.outputFormat];

      formData.append('format', apiFormat);
      formData.append('scale', options.scale.toString());
      formData.append('cornerRadius', options.cornerRadius.toString());
      formData.append('backgroundRemovalMode', options.backgroundRemoval.mode);
      if (options.backgroundRemoval.mode === 'color' && options.backgroundRemoval.color) {
        formData.append('backgroundRemovalColor', options.backgroundRemoval.color);
      }

      // For PNG files, send source dimensions so backend can filter output sizes
      if (uploadedFile.dimensions) {
        formData.append('sourceWidth', uploadedFile.dimensions.width.toString());
        formData.append('sourceHeight', uploadedFile.dimensions.height.toString());
      }

      const response = await fetch('/api/v1/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Conversion failed: ${errorText}`);
      }

      updateStep(1, 'completed');

      // Step 3: Generate
      updateStep(2, 'in_progress');
      await new Promise((resolve) => setTimeout(resolve, 100));
      updateStep(2, 'completed');

      // Step 4: Optimize
      updateStep(3, 'in_progress');
      await new Promise((resolve) => setTimeout(resolve, 100));
      updateStep(3, 'completed');

      // Step 5: Prepare download
      updateStep(4, 'in_progress');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      const extensionMap: Record<OutputFormat, string> = {
        ico: 'icon.ico',
        icns: 'icon.icns',
        favicon: 'favicon.ico',
        all: 'icons.zip',
      };
      let filename = extensionMap[options.outputFormat];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      URL.revokeObjectURL(url);

      updateStep(4, 'completed');
      setProgress(100);
      setConversionState('completed');
    } catch (error) {
      console.error('Conversion error:', error);
      setConversionState('error');

      // Mark current step as error
      const currentStepIndex = stepsCopy.findIndex((s) => s.status === 'in_progress');
      if (currentStepIndex !== -1) {
        stepsCopy[currentStepIndex] = { ...stepsCopy[currentStepIndex], status: 'error' };
        setSteps([...stepsCopy]);
      }
    }
  }, [uploadedFile, options, processedPngDataUrl]);

  const handleConvert = useCallback(() => {
    if (conversionState === 'idle') {
      convertFile();
    }
  }, [conversionState, convertFile]);

  const handleConvertAgain = useCallback(() => {
    // Reset conversion state but keep all parameters
    setConversionState('idle');
    setSteps([...defaultSteps]);
    setProgress(0);
  }, []);

  // Detect small height screens for responsive layout
  const isSmallHeight = useIsSmallHeight();

  // If no file was uploaded, redirect to home
  if (!uploadedFile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-12">
          <p className="text-muted-foreground">
            No file uploaded. Please upload an SVG or PNG file first.
          </p>
          <Button onClick={() => navigate('/')}>Go to Upload</Button>
        </main>
        <Footer />
      </div>
    );
  }

  // Get size availability info for PNG files
  const isPng = uploadedFile.type === 'png';
  const sizeInfo = getSizeAvailabilityInfo(uploadedFile.dimensions, options.outputFormat);
  const sourceSize = uploadedFile.dimensions
    ? Math.min(uploadedFile.dimensions.width, uploadedFile.dimensions.height)
    : null;

  const isConverting = conversionState === 'converting';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-365 flex-1 gap-6 px-6 py-12">
        {/* Main card - wider on small height screens to reduce preview card height */}
        <div
          className={`h-fit shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-lg ${isSmallHeight ? 'w-160' : 'w-145'}`}
        >
          {/* Card Header */}
          <div className="flex h-16 items-center justify-center rounded-2xl bg-card-header px-8">
            <h2 className="text-xl font-semibold text-foreground">Convert Your Icon</h2>
          </div>

          <div className="flex flex-col gap-6 p-8">
            {/* SVG Preview */}
            <SvgPreview
              fileName={uploadedFile.name}
              fileSize={formatFileSize(uploadedFile.size)}
              svgDataUrl={processedPngDataUrl ?? uploadedFile.dataUrl}
              scale={options.scale}
              cornerRadius={options.cornerRadius}
              backgroundRemoval={options.backgroundRemoval}
              onScaleChange={handleScaleChange}
              onCornerRadiusChange={handleCornerRadiusChange}
              onBackgroundRemovalChange={handleBackgroundRemovalChange}
              onRemove={handleRemove}
              isPng={isPng}
              pngBackgroundRemovalProgress={pngBackgroundRemovalProgress}
              onPngBackgroundRemoval={handlePngBackgroundRemoval}
            />

            {/* PNG size limitation info - shown for PNG files */}
            {isPng && sourceSize !== null && conversionState === 'idle' && (
              <div
                className={`flex items-start gap-3 rounded-lg p-4 ${
                  sizeInfo.isLimited
                    ? 'border border-amber-500/30 bg-amber-500/10'
                    : sourceSize < 1024
                      ? 'border border-blue-500/30 bg-blue-500/10'
                      : 'border border-green-500/30 bg-green-500/10'
                }`}
              >
                <FontAwesomeIcon
                  icon={sizeInfo.isLimited ? faTriangleExclamation : faCircleInfo}
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    sizeInfo.isLimited
                      ? 'text-amber-500'
                      : sourceSize < 1024
                        ? 'text-blue-500'
                        : 'text-green-500'
                  }`}
                />
                <div className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-foreground">
                    Source: {uploadedFile.dimensions?.width}x{uploadedFile.dimensions?.height}px PNG
                  </span>
                  {sizeInfo.isLimited ? (
                    <>
                      <span className="text-muted-foreground">
                        Output will include {sizeInfo.availableSizes.length} of{' '}
                        {sizeInfo.allSizes.length} sizes ({sizeInfo.availableSizes.join(', ')}px).
                        Larger sizes excluded to avoid upscaling.
                      </span>
                      {sourceSize < 1024 && (
                        <span className="text-amber-600 dark:text-amber-400">
                          For best results, use a 1024x1024px PNG or an SVG file.
                        </span>
                      )}
                    </>
                  ) : sourceSize < 1024 ? (
                    <span className="text-muted-foreground">
                      For best results with ICNS, consider using a 1024x1024px source.
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      All output sizes available. Great source resolution!
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Output format selector - shown only when idle */}
            {conversionState === 'idle' && (
              <OutputFormatSelector
                selectedFormat={options.outputFormat}
                onFormatChange={handleFormatChange}
              />
            )}

            {/* Conversion progress - shown when converting or completed */}
            {conversionState !== 'idle' && (
              <ConversionProgress
                state={conversionState}
                steps={steps}
                progress={progress}
                estimatedTime={3}
              />
            )}

            {/* Convert button */}
            {conversionState === 'idle' && (
              <Button size="lg" className="w-full" onClick={handleConvert}>
                <FontAwesomeIcon icon={faArrowsRotate} className="h-4 w-4" />
                <span>Convert</span>
              </Button>
            )}

            {/* Converting state - no button, progress shows status */}
            {isConverting && (
              <Button size="lg" className="w-full" disabled>
                <FontAwesomeIcon icon={faArrowsRotate} className="h-4 w-4 animate-spin" />
                <span>Converting...</span>
              </Button>
            )}

            {/* Convert Again button - shown after completion or error */}
            {(conversionState === 'completed' || conversionState === 'error') && (
              <Button size="lg" className="w-full" onClick={handleConvertAgain}>
                <FontAwesomeIcon icon={faArrowsRotate} className="h-4 w-4" />
                <span>{conversionState === 'error' ? 'Try Again' : 'Convert Again'}</span>
              </Button>
            )}

            {/* Security note */}
            <div className="flex items-center justify-center gap-1">
              <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3 text-muted-foreground" />
              <span className="text-center text-xs text-muted-foreground">
                Processing happens on our secure server. No files are stored after conversion.
              </span>
            </div>
          </div>
        </div>

        {/* Context Preview card */}
        <div className="flex-1 self-start">
          <ContextPreviewCard
            svgDataUrl={processedPngDataUrl ?? uploadedFile.dataUrl}
            scale={debouncedScale}
            cornerRadius={debouncedCornerRadius}
            backgroundRemoval={options.backgroundRemoval}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
