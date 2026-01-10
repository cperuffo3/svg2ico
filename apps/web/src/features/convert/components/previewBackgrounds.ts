export type PreviewContext = 'chrome' | 'safari' | 'edge' | 'windows';
export type PreviewTheme = 'light' | 'dark';

// Background colors for different contexts
export const previewBackgrounds: Record<PreviewContext, Record<PreviewTheme, string>> = {
  chrome: {
    light: '#ffffff', // Chrome tab background (light)
    dark: '#35363a', // Chrome tab background (dark)
  },
  safari: {
    light: '#ffffff', // Safari tab background (light)
    dark: '#2c2c2e', // Safari tab background (dark)
  },
  edge: {
    light: '#ffffff', // Edge tab background (light)
    dark: '#1f1f1f', // Edge tab background (dark)
  },
  windows: {
    light: '#f3f3f3', // Windows taskbar (light)
    dark: '#1f1f1f', // Windows taskbar (dark)
  },
};
