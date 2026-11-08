/**
 * Rejects if `promise` doesn't settle within `ms`. Used to bound DB calls on
 * latency-sensitive paths (health check, rate limiting) more tightly than the
 * pool-wide query_timeout, so a hung database degrades them in seconds.
 *
 * Note: the underlying query keeps running until the pool's own timeouts end it.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} did not respond within ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
