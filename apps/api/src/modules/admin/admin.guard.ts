import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

    if (!password || password !== adminPassword) {
      throw new UnauthorizedException('Invalid admin password');
    }

    return true;
  }
}
