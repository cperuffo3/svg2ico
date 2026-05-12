import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientIdMiddleware } from './common/client-id/index.js';
import { LoggingModule } from './common/logging/index.js';
import { PrismaModule } from './common/prisma/index.js';
import { AdminModule } from './modules/admin/index.js';
import { ConversionModule } from './modules/conversion/index.js';
import { ErrorSubmissionsModule } from './modules/error-submissions/index.js';
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
    ErrorSubmissionsModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ClientIdMiddleware).forRoutes('*path');
  }
}
