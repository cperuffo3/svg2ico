import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

// All traffic enters through Cloudflare (proxied DNS), which sets
// `CF-Connecting-IP` to the real client IP. We prefer that over the
// X-Forwarded-For chain, which depends on the trust-proxy hop count being
// exactly right. Fallback to req.ip for non-CF paths (local dev, health
// probes from Railway) so the guard still degrades safely.
@Injectable()
export class CfThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Request): Promise<string> {
    const cfIp = req.headers['cf-connecting-ip'];
    const tracker = (typeof cfIp === 'string' && cfIp) || req.ip || 'unknown';
    return Promise.resolve(tracker);
  }
}
