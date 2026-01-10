import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggingModule } from './common/logging/index.js';
import { PrismaModule } from './common/prisma/index.js';
import { AdminModule } from './modules/admin/index.js';
import { ConversionModule } from './modules/conversion/index.js';
import { HealthModule } from './modules/health/index.js';
import { MetricsModule } from './modules/metrics/index.js';
import { RateLimitModule } from './modules/rate-limit/index.js';
import { WorkerPoolModule } from './modules/workers/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    LoggingModule,
    PrismaModule,
    RateLimitModule,
    HealthModule,
    MetricsModule,
    WorkerPoolModule,
    ConversionModule,
    AdminModule,
  ],
})
export class AppModule {}
