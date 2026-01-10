import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const password = request.headers['x-admin-password'] as string;
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminPassword) {
      throw new UnauthorizedException('Admin password not configured');
    }

    if (!password) {
      throw new UnauthorizedException('Invalid admin password');
    }

    // Use constant-time comparison to prevent timing attacks
    // This ensures the comparison takes the same time regardless of where
    // the password differs, preventing attackers from guessing character by character
    if (!this.secureCompare(password, adminPassword)) {
      throw new UnauthorizedException('Invalid admin password');
    }

    return true;
  }

  /**
   * Perform constant-time string comparison to prevent timing attacks.
   * Uses Node.js crypto.timingSafeEqual which is designed to resist timing attacks.
   */
  private secureCompare(a: string, b: string): boolean {
    // Convert strings to buffers
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');

    // If lengths differ, we still need to do a comparison to maintain constant time
    // We compare against a buffer of the correct length to avoid early return
    if (bufA.length !== bufB.length) {
      // Compare bufA against itself to maintain timing, then return false
      // This prevents length-based timing attacks
      timingSafeEqual(bufA, bufA);
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  }
}
