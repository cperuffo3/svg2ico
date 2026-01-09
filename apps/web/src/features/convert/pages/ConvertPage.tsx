import { Button } from '@/components/ui/button';
import { Footer, Header } from '@/features/home/components';
import { faArrowsRotate, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ContextPreviewCard,
  ConversionProgress,
  OutputFormatSelector,
  SvgPreview,
} from '../components';
import type {
  BackgroundRemovalOption,
  ConversionOptions as ConversionOptionsType,
  ConversionState,
  ConversionStep,
  OutputFormat,
  RoundnessValue,
  UploadedFile,
} from '../types';

const defaultSteps: ConversionStep[] = [
  { id: 'validate', label: 'Validating SVG file', status: 'pending' },
  { id: 'render', label: 'Rendering high-quality PNG', status: 'pending' },
  { id: 'generate', label: 'Generating multi-resolution icon', status: 'pending' },
  { id: 'optimize', label: 'Optimizing file size', status: 'pending' },
  { id: 'prepare', label: 'Preparing download', status: 'pending' },
];

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

  const [conversionState, setConversionState] = useState<ConversionState>('idle');
  const [steps, setSteps] = useState<ConversionStep[]>(defaultSteps);
  const [progress, setProgress] = useState(0);

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

  const simulateConversion = useCallback(async () => {
    setConversionState('converting');
    setProgress(0);

    const stepsCopy = [...defaultSteps];

    for (let i = 0; i < stepsCopy.length; i++) {
      // Mark current step as in progress
      stepsCopy[i] = { ...stepsCopy[i], status: 'in_progress' };
      setSteps([...stepsCopy]);
      setProgress((i / stepsCopy.length) * 100);

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Mark step as completed
      stepsCopy[i] = { ...stepsCopy[i], status: 'completed' };
      setSteps([...stepsCopy]);
    }

    setProgress(100);
    setConversionState('completed');
  }, []);

  const handleConvert = useCallback(() => {
    if (conversionState === 'idle') {
      simulateConversion();
    }
  }, [conversionState, simulateConversion]);

  // If no file was uploaded, redirect to home
  if (!uploadedFile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-12">
          <p className="text-muted-foreground">
            No file uploaded. Please upload an SVG file first.
          </p>
          <Button onClick={() => navigate('/')}>Go to Upload</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const isConverting = conversionState === 'converting';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-375 flex-1 gap-6 px-6 py-12">
        {/* Main card */}
        <div className="w-145 shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          {/* Card Header */}
          <div className="flex h-16 items-center justify-center rounded-2xl bg-card-header px-8">
            <h2 className="text-xl font-semibold text-foreground">Convert Your Icon</h2>
          </div>

          <div className="flex flex-col gap-6 p-8">
            {/* SVG Preview */}
            <SvgPreview
              fileName={uploadedFile.name}
              fileSize={formatFileSize(uploadedFile.size)}
              svgDataUrl={uploadedFile.dataUrl}
              scale={options.scale}
              cornerRadius={options.cornerRadius}
              backgroundRemoval={options.backgroundRemoval}
              onScaleChange={handleScaleChange}
              onCornerRadiusChange={handleCornerRadiusChange}
              onBackgroundRemovalChange={handleBackgroundRemovalChange}
              onRemove={handleRemove}
            />

            {/* Output format selector */}
            <OutputFormatSelector
              selectedFormat={options.outputFormat}
              onFormatChange={handleFormatChange}
            />

            {/* Conversion progress */}
            <ConversionProgress
              state={conversionState}
              steps={steps}
              progress={progress}
              estimatedTime={3}
            />

            {/* Convert button */}
            <Button size="lg" className="w-full" onClick={handleConvert} disabled={isConverting}>
              {isConverting ? (
                <>
                  <FontAwesomeIcon icon={faArrowsRotate} className="h-4 w-4 animate-spin" />
                  <span>Converting...</span>
                </>
              ) : conversionState === 'completed' ? (
                <span>Download</span>
              ) : (
                <>
                  <FontAwesomeIcon icon={faArrowsRotate} className="h-4 w-4" />
                  <span>Convert</span>
                </>
              )}
            </Button>

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
        <div className="flex-1">
          <ContextPreviewCard
            svgDataUrl={uploadedFile.dataUrl}
            scale={options.scale}
            cornerRadius={options.cornerRadius}
            backgroundRemoval={options.backgroundRemoval}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
