import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggingModule } from './common/logging/index.js';
import { PrismaModule } from './common/prisma/index.js';
import { HealthModule } from './modules/health/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    LoggingModule,
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
