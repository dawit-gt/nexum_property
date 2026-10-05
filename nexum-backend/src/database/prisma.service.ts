import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Thin wrapper around PrismaClient so it participates in Nest's lifecycle
 * and can be injected anywhere via PrismaModule.
 *
 * Prisma 7 requires an explicit driver adapter at runtime — a bare
 * `new PrismaClient()` is no longer valid. This is separate from
 * prisma.config.ts, which only covers the CLI (generate/migrate).
 *
 * ssl.rejectUnauthorized: false is set explicitly rather than relying on
 * ?sslmode=require in the connection string — Supabase's pooler presents
 * a certificate chain Node's default trust store doesn't fully recognize,
 * and 'require' now maps to strict full-chain verification (which fails
 * with "self-signed certificate in certificate chain"). The connection is
 * still encrypted over TLS either way; this just skips CA-chain
 * verification, which is the standard approach for Supabase's pooler.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.get<string>('DATABASE_URL'),
      ssl: { rejectUnauthorized: false },
    });

    super({
      adapter,
      log:
        config.get<string>('NODE_ENV') === 'development'
          ? ['warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to the database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Lightweight liveness check used by the /health endpoint and by
   * free uptime monitors to keep Render/Supabase from sleeping.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
