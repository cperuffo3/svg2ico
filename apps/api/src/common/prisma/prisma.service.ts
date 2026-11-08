import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../../prisma/generated/prisma/client.js';

// Module-level so it can be used in the constructor before super().
const poolLogger = new Logger('PrismaPool');

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      // Without these, pg waits forever. When Postgres restarted uncleanly the
      // pooled sockets went dead without a FIN/RST, and every query hung
      // indefinitely, taking down every DB-backed route (incl. rate limiting,
      // so all conversions) until the API was manually restarted.
      //
      // - connectionTimeoutMillis: give up acquiring/opening a connection.
      // - query_timeout: client-side cap on a query. A timed-out query errors,
      //   and pool.query() then destroys that client instead of reusing it, so
      //   dead sockets get evicted and the pool self-heals once Postgres is back.
      // - statement_timeout: server-side cap so runaway queries are cancelled.
      // - keepAlive: lets the OS detect half-open sockets on idle connections.
      connectionTimeoutMillis: 5_000,
      query_timeout: 30_000,
      statement_timeout: 25_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    });
    // An idle client erroring (e.g. Postgres restarted) emits 'error' on the
    // pool; unhandled, that would crash the process. The pool already discards
    // the broken client, so just log it.
    pool.on('error', (error) => {
      poolLogger.error(`Idle database client error: ${error.message}`);
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
