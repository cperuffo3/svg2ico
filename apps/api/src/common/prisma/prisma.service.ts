import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../../prisma/generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    this.logger.debug({ message: 'Connecting to database' });
    await this.$connect();
    this.logger.log({ message: 'Database connected' });
  }

  async onModuleDestroy() {
    this.logger.debug({ message: 'Disconnecting from database' });
    await this.$disconnect();
    await this.pool.end();
    this.logger.log({ message: 'Database disconnected' });
  }
}
