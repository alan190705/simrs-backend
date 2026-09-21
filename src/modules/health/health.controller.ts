import { Controller, Get, ServiceUnavailableException, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../database/prisma.service';

@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: proses hidup. */
  @Get()
  live() { return { status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() }; }

  /** Readiness: proses hidup dan database dapat dijangkau. */
  @Get('ready')
  async ready() {
    try { await this.prisma.$queryRaw`SELECT 1`; }
    catch { throw new ServiceUnavailableException('Database tidak dapat dihubungi'); }
    return { status: 'ok', database: 'up', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() };
  }
}
