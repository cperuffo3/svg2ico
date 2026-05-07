import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const COOKIE_NAME = 'svg2ico_cid';
const COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLIENT_ID_KEY = '__svg2icoClientId';

type WithClientId = { [CLIENT_ID_KEY]?: string };

export function getClientId(req: Request): string | undefined {
  return (req as Request & WithClientId)[CLIENT_ID_KEY];
}

@Injectable()
export class ClientIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existing = readCookie(req.headers.cookie, COOKIE_NAME);

    let clientId: string;
    if (existing && UUID_REGEX.test(existing)) {
      clientId = existing;
    } else {
      clientId = randomUUID();
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie(COOKIE_NAME, clientId, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE_MS,
        path: '/',
      });
    }

    (req as Request & WithClientId)[CLIENT_ID_KEY] = clientId;
    next();
  }
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}
