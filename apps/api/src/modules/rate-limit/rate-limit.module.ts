import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule, PrismaService } from '../../common/index.js';
import { PrismaThrottlerStorage } from './prisma-throttler.storage.js';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRootAsync({
      imports: [PrismaModule],
      useFactory: (prisma: PrismaService) => ({
        throttlers: [
          {
            name: 'conversion',
            ttl: 60 * 60 * 1000, // 1 hour in milliseconds
            limit: 60, // 60 conversions per hour
          },
        ],
        storage: new PrismaThrottlerStorage(prisma),
      }),
      inject: [PrismaService],
    }),
  ],
  providers: [PrismaThrottlerStorage],
  exports: [ThrottlerModule, PrismaThrottlerStorage],
})
export class RateLimitModule {}
