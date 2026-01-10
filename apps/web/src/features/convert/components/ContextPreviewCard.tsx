import { Skeleton } from '@/components/ui/skeleton';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { useTheme } from '@/hooks/useTheme';
import { useEffect, useMemo, useState } from 'react';
import type { BackgroundRemovalOption, RoundnessValue } from '../types';
import { processBackgroundRemoval } from '../utils/removeBackground';

interface IconPlacement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PreviewConfig {
  name: string;
  label: string;
  path: string;
  placements: IconPlacement[];
  placeholderPatterns: string[];
  theme: 'light' | 'dark';
}

interface ContextPreviewCardProps {
  svgDataUrl: string;
  scale: number;
  cornerRadius: RoundnessValue;
  backgroundRemoval: BackgroundRemovalOption;
  compact?: boolean;
}

// Preview configurations
const previewConfigs: PreviewConfig[] = [
  // Light mode configs
  {
    name: 'chrome_light',
    label: 'Chrome',
    path: '/previews/chrome_light.svg',
    theme: 'light',
    placements: [
      { id: 'tab1', x: 12, y: 16, width: 16, height: 16 },
      { id: 'tab2', x: 252, y: 16, width: 16, height: 16 },
      { id: 'bookmarks', x: 81, y: 84, width: 16, height: 16 },
    ],
    placeholderPatterns: [
      '<rect x="12" y="16" width="16" height="16" fill="black"/>',
      '<rect x="252" y="16" width="16" height="16" fill="black"/>',
      '<rect x="81" y="84" width="16" height="16" fill="black"/>',
    ],
  },
  {
    name: 'windows_light',
    label: 'Windows',
    path: '/previews/windows_light.svg',
    theme: 'light',
    placements: [
      { id: 'taskbar1', x: 417, y: 12.5, width: 24, height: 24 },
      { id: 'taskbar2', x: 461, y: 12.5, width: 24, height: 24 },
    ],
    placeholderPatterns: [
      '<rect width="24" height="24" transform="translate(417 12.5)" fill="black"/>',
      '<rect width="24" height="24" transform="translate(461 12.5)" fill="black"/>',
    ],
  },
  {
    name: 'macos_light',
    label: 'macOS Dock',
    path: '/previews/macos_light.svg',
    theme: 'light',
    placements: [{ id: 'dock', x: 1682.04, y: 168.5, width: 255, height: 255 }],
    placeholderPatterns: [
      '<rect width="255" height="255" transform="translate(1682.04 168.5)" fill="black"/>',
    ],
  },
  // Dark mode configs
  {
    name: 'chrome_dark',
    label: 'Chrome',
    path: '/previews/chrome_dark.svg',
    theme: 'dark',
    placements: [
      { id: 'tab1', x: 12, y: 16, width: 16, height: 16 },
      { id: 'tab2', x: 252, y: 16, width: 16, height: 16 },
      { id: 'bookmarks', x: 81, y: 84, width: 16, height: 16 },
    ],
    placeholderPatterns: [
      '<rect x="12" y="16" width="16" height="16" fill="black"/>',
      '<rect x="252" y="16" width="16" height="16" fill="black"/>',
      '<rect x="81" y="84" width="16" height="16" fill="black"/>',
    ],
  },
  {
    name: 'windows_dark',
    label: 'Windows',
    path: '/previews/windows_dark.svg',
    theme: 'dark',
    placements: [
      { id: 'taskbar1', x: 415, y: 12.5, width: 24, height: 24 },
      { id: 'taskbar2', x: 459, y: 12.5, width: 24, height: 24 },
    ],
    placeholderPatterns: [
      '<rect width="24" height="24" transform="translate(415 12.5)" fill="black"/>',
      '<rect width="24" height="24" transform="translate(459 12.5)" fill="black"/>',
    ],
  },
  {
    name: 'macos_dark',
    label: 'macOS Dock',
    path: '/previews/macos_dark.svg',
    theme: 'dark',
    placements: [{ id: 'dock', x: 1682.04, y: 168.5, width: 255, height: 255 }],
    placeholderPatterns: [
      '<rect width="255" height="255" transform="translate(1682.04 168.5)" fill="black"/>',
    ],
  },
];

// Remove black placeholder rects from the original SVG
function removeBlackPlaceholders(svgContent: string, patterns: string[]): string {
  let result = svgContent;
  for (const pattern of patterns) {
    result = result.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  }
  return result;
}

// Aspect ratios for skeleton placeholders (width/height from actual SVG files)
const previewAspectRatios: Record<string, string> = {
  chrome: 'aspect-[512/111]',
  windows: 'aspect-[512/49]',
  macos: 'aspect-[2349/580]',
};

export function ContextPreviewCard({
  svgDataUrl,
  scale,
  cornerRadius,
  backgroundRemoval,
  compact = false,
}: ContextPreviewCardProps) {
  const { theme } = useTheme();
  const [loadedSvgs, setLoadedSvgs] = useState<Record<string, string>>({});
  const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  // Load all preview SVGs on mount
  useEffect(() => {
    for (const config of previewConfigs) {
      fetch(config.path)
        .then((res) => res.text())
        .then((svg) => {
          setLoadedSvgs((prev) => ({
            ...prev,
            [config.name]: removeBlackPlaceholders(svg, config.placeholderPatterns),
          }));
        })
        .catch(console.error);
    }
  }, []);

  // Get SVG dimensions to calculate aspect ratio
  const getSvgDimensions = (
    svgString: string,
  ): { width: number; height: number; aspectRatio: number } => {
    // Try viewBox first
    const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/i);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
      if (parts.length >= 4) {
        const width = parts[2];
        const height = parts[3];
        const largest = Math.max(width, height);
        return {
          width: width / largest,
          height: height / largest,
          aspectRatio: width / height,
        };
      }
    }

    // Fall back to width/height attributes
    const widthMatch = svgString.match(/\bwidth=["']([^"']+)["']/i);
    const heightMatch = svgString.match(/\bheight=["']([^"']+)["']/i);
    const width = widthMatch ? parseFloat(widthMatch[1]) : 100;
    const height = heightMatch ? parseFloat(heightMatch[1]) : 100;
    const largest = Math.max(width, height);

    return {
      width: width / largest,
      height: height / largest,
      aspectRatio: width / height,
    };
  };

  // Check if input is PNG
  const isPng = svgDataUrl?.startsWith('data:image/png');

  // Process SVG with background removal (or pass through PNG)
  const processedIconData = useMemo(() => {
    if (!svgDataUrl) return null;

    try {
      // Handle PNG files - pass through directly with default dimensions
      if (isPng) {
        // For PNG, we assume square aspect ratio (1:1) since we can't easily parse PNG dimensions
        // The actual rendering will handle aspect ratio via object-fit
        return {
          svg: null,
          pngDataUrl: svgDataUrl,
          dimensions: { width: 1, height: 1, aspectRatio: 1 },
        };
      }

      let svgString: string;

      // Decode the data URL to get the SVG string
      const base64Match = svgDataUrl.match(/^data:image\/svg\+xml;base64,(.+)$/);
      if (base64Match) {
        svgString = atob(base64Match[1]);
      } else {
        // Handle URL-encoded SVG
        const urlMatch = svgDataUrl.match(/^data:image\/svg\+xml,(.+)$/);
        if (urlMatch) {
          svgString = decodeURIComponent(urlMatch[1]);
        } else {
          return null;
        }
      }

      // Get dimensions before any processing
      const dimensions = getSvgDimensions(svgString);

      // Apply background removal if needed
      if (backgroundRemoval.mode !== 'none') {
        const result = processBackgroundRemoval(
          svgString,
          backgroundRemoval.mode,
          backgroundRemoval.color,
        );
        svgString = result.svg;
      }

      return { svg: svgString, pngDataUrl: null, dimensions };
    } catch (error) {
      console.error('Error processing SVG:', error);
      return null;
    }
  }, [svgDataUrl, backgroundRemoval.mode, backgroundRemoval.color, isPng]);

  // Generate composite SVGs for each preview
  const compositeSvgs = useMemo(() => {
    if (!processedIconData) return {};

    const { svg: processedIconSvg, pngDataUrl, dimensions } = processedIconData;

    // Create a data URL from the processed SVG for use in the composite
    // For PNG, use the PNG data URL directly
    let processedImageDataUrl: string;
    if (pngDataUrl) {
      processedImageDataUrl = pngDataUrl;
    } else if (processedIconSvg) {
      try {
        processedImageDataUrl = `data:image/svg+xml;base64,${btoa(processedIconSvg)}`;
      } catch {
        // If btoa fails (non-ASCII chars), use encodeURIComponent
        processedImageDataUrl = `data:image/svg+xml,${encodeURIComponent(processedIconSvg)}`;
      }
    } else {
      return {};
    }

    const result: Record<string, string> = {};
    const borderRadiusPercent = cornerRadius / 100;

    for (const config of previewConfigs) {
      const baseSvg = loadedSvgs[config.name];
      if (!baseSvg) continue;

      // Build icon elements for each placement
      const iconElements = config.placements
        .map((placement) => {
          // Scale based on the largest dimension of the SVG
          // This ensures rectangular SVGs are scaled properly within the square placement
          const effectiveSize = placement.width * (scale / 100);

          // Calculate actual icon dimensions maintaining aspect ratio
          // dimensions.width and dimensions.height are normalized (largest = 1)
          const iconWidth = effectiveSize * dimensions.width;
          const iconHeight = effectiveSize * dimensions.height;

          // Center the icon within the square placement area
          const offsetX = (placement.width - iconWidth) / 2;
          const offsetY = (placement.height - iconHeight) / 2;

          const borderRadius = borderRadiusPercent * placement.width;

          // Create a unique clip path ID for each placement
          const clipId = `icon-clip-${config.name}-${placement.id}`;

          return `
          <defs>
            <clipPath id="${clipId}">
              <rect x="${placement.x}" y="${placement.y}" width="${placement.width}" height="${placement.height}" rx="${borderRadius}" ry="${borderRadius}" />
            </clipPath>
          </defs>
          <g clip-path="url(#${clipId})">
            <foreignObject x="${placement.x + offsetX}" y="${placement.y + offsetY}" width="${iconWidth}" height="${iconHeight}">
              <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                <img src="${processedImageDataUrl}" style="width:100%;height:100%;object-fit:contain;" />
              </div>
            </foreignObject>
          </g>
        `;
        })
        .join('');

      // Insert icon elements before the closing </svg> tag
      const modifiedSvg = baseSvg.replace('</svg>', `${iconElements}</svg>`);

      try {
        result[config.name] = `data:image/svg+xml;base64,${btoa(modifiedSvg)}`;
      } catch {
        // If btoa fails (non-ASCII chars), use encodeURIComponent
        result[config.name] = `data:image/svg+xml,${encodeURIComponent(modifiedSvg)}`;
      }
    }

    return result;
  }, [loadedSvgs, processedIconData, scale, cornerRadius]);

  // Filter configs based on current theme
  const currentTheme = isDarkMode ? 'dark' : 'light';
  const filteredConfigs = previewConfigs.filter((config) => config.theme === currentTheme);

  // Get the base name for aspect ratio lookup (e.g., 'chrome_light' -> 'chrome')
  const getBaseName = (name: string) => name.split('_')[0];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      {/* Card Header */}
      <div
        className={`flex items-center justify-between rounded-2xl bg-card-header px-6 ${compact ? 'h-12' : 'h-16'}`}
      >
        <h2 className={`font-semibold text-foreground ${compact ? 'text-base' : 'text-xl'}`}>
          Live Preview
        </h2>
        <ToggleSwitch
          value={isDarkMode}
          onChange={setIsDarkMode}
          labelFalse="Light"
          labelTrue="Dark"
        />
      </div>

      <div className={`flex flex-col overflow-y-auto ${compact ? 'gap-4 p-4' : 'gap-4 px-6 py-4'}`}>
        {filteredConfigs.map((config) => {
          const svgSrc = compositeSvgs[config.name];
          const isLoaded = svgSrc ? loadedImages[svgSrc] : false;
          const aspectClass = previewAspectRatios[getBaseName(config.name)];

          return (
            <div key={config.name} className={`flex flex-col ${compact ? 'gap-1' : 'gap-2'}`}>
              <div className="relative overflow-hidden rounded-lg border border-border">
                {/* Skeleton with fade-out transition */}
                <Skeleton
                  className={`w-full ${aspectClass} transition-opacity duration-300 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
                />
                {/* Image with fade-in transition, positioned over skeleton */}
                {svgSrc && (
                  <img
                    key={svgSrc}
                    src={svgSrc}
                    alt={`${config.label} preview`}
                    className={`absolute inset-0 h-auto w-full transition-opacity duration-300 ${loadedImages[svgSrc] ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setLoadedImages((prev) => ({ ...prev, [svgSrc]: true }))}
                  />
                )}
              </div>
              <p className="text-center text-xs text-muted-foreground">{config.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
