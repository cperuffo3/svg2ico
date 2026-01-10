import { preload, removeBackground, type Config } from '@imgly/background-removal';
import type { PngBackgroundRemovalProgress } from '../types';

type ProgressCallback = (progress: PngBackgroundRemovalProgress) => void;

const config: Config = {
  debug: false,
  device: 'gpu', // Use WebGPU if available, falls back to CPU
  model: 'isnet_fp16', // Good balance between size and quality (80MB)
  proxyToWorker: true, // Enable worker for multi-threading (requires COOP/COEP headers)
  output: {
    format: 'image/png',
    quality: 1,
  },
};

let isPreloaded = false;

/**
 * Preload the background removal model assets.
 * This can be called early to warm up the model before the user needs it.
 */
export async function preloadBackgroundRemovalModel(onProgress?: ProgressCallback): Promise<void> {
  if (isPreloaded) return;

  const preloadConfig: Config = {
    ...config,
    progress: (_key: string, current: number, total: number) => {
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      onProgress?.({
        state: 'loading-model',
        progress: percent,
      });
    },
  };

  try {
    await preload(preloadConfig);
    isPreloaded = true;
  } catch (error) {
    console.error('Failed to preload background removal model:', error);
    // Don't throw - the model will be loaded on demand
  }
}

/**
 * Remove background from a PNG image using AI-powered segmentation.
 * This runs entirely in the browser using WebGPU/WASM.
 *
 * @param dataUrl - The PNG image as a data URL
 * @param onProgress - Callback for progress updates
 * @returns The processed image as a data URL with transparent background
 */
export async function removePngBackground(
  dataUrl: string,
  onProgress?: ProgressCallback,
): Promise<string> {
  onProgress?.({ state: 'loading-model', progress: 0 });

  const removeConfig: Config = {
    ...config,
    progress: (key: string, current: number, total: number) => {
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;

      // Determine state based on progress key
      if (key.includes('model') || key.includes('wasm')) {
        onProgress?.({ state: 'loading-model', progress: percent });
      } else {
        onProgress?.({ state: 'processing', progress: percent });
      }
    },
  };

  try {
    onProgress?.({ state: 'processing', progress: 0 });

    // Convert data URL to blob for processing
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Run background removal
    const resultBlob = await removeBackground(blob, removeConfig);

    // Convert result back to data URL
    const resultDataUrl = await blobToDataUrl(resultBlob);

    onProgress?.({ state: 'completed', progress: 100 });
    isPreloaded = true; // Model is now loaded

    return resultDataUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Background removal failed:', error);
    onProgress?.({ state: 'error', error: errorMessage });
    throw new Error(`Background removal failed: ${errorMessage}`);
  }
}

/**
 * Convert a Blob to a data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Check if background removal is supported in the current browser.
 * Requires WebAssembly and preferably WebGPU for good performance.
 */
export function isBackgroundRemovalSupported(): boolean {
  // Check for WebAssembly support (required)
  if (typeof WebAssembly === 'undefined') {
    return false;
  }

  return true;
}

/**
 * Check if WebGPU is available for faster processing
 */
export async function isWebGPUAvailable(): Promise<boolean> {
  if (!('gpu' in navigator)) {
    return false;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = await (navigator as any).gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}
