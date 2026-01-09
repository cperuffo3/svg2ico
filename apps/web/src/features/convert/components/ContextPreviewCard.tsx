import { ToggleSwitch } from '@/components/ui/toggle-switch';
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
    placements: [{ id: 'dock', x: 911, y: 149, width: 255, height: 255 }],
    placeholderPatterns: [
      '<rect width="255" height="255" transform="translate(911 149)" fill="black"/>',
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
    placements: [{ id: 'dock', x: 911, y: 149, width: 255, height: 255 }],
    placeholderPatterns: [
      '<rect width="255" height="255" transform="translate(911 149)" fill="black"/>',
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

export function ContextPreviewCard({
  svgDataUrl,
  scale,
  cornerRadius,
  backgroundRemoval,
}: ContextPreviewCardProps) {
  const [loadedSvgs, setLoadedSvgs] = useState<Record<string, string>>({});
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Process SVG with background removal
  const processedIconSvg = useMemo(() => {
    if (!svgDataUrl) return null;

    try {
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

      // Apply background removal if needed
      if (backgroundRemoval.mode !== 'none') {
        const result = processBackgroundRemoval(
          svgString,
          backgroundRemoval.mode,
          backgroundRemoval.color,
        );
        svgString = result.svg;
      }

      return svgString;
    } catch (error) {
      console.error('Error processing SVG:', error);
      return null;
    }
  }, [svgDataUrl, backgroundRemoval.mode, backgroundRemoval.color]);

  // Generate composite SVGs for each preview
  const compositeSvgs = useMemo(() => {
    if (!processedIconSvg) return {};

    const result: Record<string, string> = {};
    const borderRadiusPercent = cornerRadius / 100;

    for (const config of previewConfigs) {
      const baseSvg = loadedSvgs[config.name];
      if (!baseSvg) continue;

      // Build icon elements for each placement
      const iconElements = config.placements
        .map((placement) => {
          const effectiveSize = placement.width * (scale / 100);
          const offset = (placement.width - effectiveSize) / 2;
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
            <foreignObject x="${placement.x + offset}" y="${placement.y + offset}" width="${effectiveSize}" height="${effectiveSize}">
              <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                <img src="${svgDataUrl}" style="width:100%;height:100%;object-fit:contain;" />
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
  }, [loadedSvgs, processedIconSvg, svgDataUrl, scale, cornerRadius]);

  // Filter configs based on current theme
  const currentTheme = isDarkMode ? 'dark' : 'light';
  const filteredConfigs = previewConfigs.filter((config) => config.theme === currentTheme);

  const hasAnyPreview = Object.keys(compositeSvgs).length > 0;

  if (!hasAnyPreview) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        {/* Card Header */}
        <div className="flex h-16 items-center justify-center rounded-2xl bg-card-header px-6">
          <h2 className="text-xl font-semibold text-foreground">Live Preview</h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
          Loading previews...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      {/* Card Header */}
      <div className="flex h-16 items-center justify-between rounded-2xl bg-card-header px-6">
        <h2 className="text-xl font-semibold text-foreground">Live Preview</h2>
        <ToggleSwitch
          value={isDarkMode}
          onChange={setIsDarkMode}
          labelFalse="Light"
          labelTrue="Dark"
        />
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto p-6">
        {filteredConfigs.map((config) => {
          const svgSrc = compositeSvgs[config.name];
          if (!svgSrc) return null;

          return (
            <div key={config.name} className="flex flex-col gap-2">
              <div className="overflow-hidden rounded-lg border border-border">
                <img
                  src={svgSrc}
                  alt={`${config.label} preview`}
                  className="h-auto w-full"
                  style={{ display: 'block' }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">{config.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
