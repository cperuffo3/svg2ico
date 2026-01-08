/**
 * Environment configuration.
 * Centralizes access to environment variables with type safety.
 */

export const env = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;
