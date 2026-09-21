import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { jwtConstants } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private getRefreshTtlMs(): number {
    const ttl = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (match) {
      const val = parseInt(match[1], 10);
      const unit = match[2];
      if (unit === 's') return val * 1000;
      if (unit === 'm') return val * 60 * 1000;
      if (unit === 'h') return val * 3600 * 1000;
      if (unit === 'd') return val * 86400 * 1000;
    }
    return jwtConstants.refreshExpiresInMs;
  }

  // Login bisa pakai username ATAU email, sesuai schema (email nullable & unik)
  async validateUser(identifier: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
        deletedAt: null,
      },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Username/email atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Username/email atau password salah');
    }

    return user;
  }

  // Ubah daftar UserRole jadi array {code, branchId} yang enak dikonsumsi frontend/token
  private buildRolesPayload(user: {
    roles: { branchId: string | null; role: { code: string } }[];
  }) {
    return user.roles.map((ur) => ({
      code: ur.role.code,
      branchId: ur.branchId,
    }));
  }

  private async issueRefreshToken(
    userId: string,
    userAgent?: string,
    ip?: string,
  ) {
    // Token mentah dikirim ke client, yang disimpan di DB cuma hash-nya (mirip cara simpan password)
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + this.getRefreshTtlMs());

    const created = await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt, userAgent, ip },
    });

    return { rawToken, expiresAt, id: created.id };
  }

  async login(
    identifier: string,
    password: string,
    userAgent?: string,
    ip?: string,
  ) {
    const user = await this.validateUser(identifier, password);
    const roles = this.buildRolesPayload(user);

    const access_token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      roles,
    });

    const { rawToken: refresh_token, expiresAt } = await this.issueRefreshToken(
      user.id,
      userAgent,
      ip,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      access_token,
      refresh_token,
      refresh_token_expires_at: expiresAt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles,
      },
    };
  }

  // Tukar refresh token lama dengan pasangan token baru (rotasi), token lama langsung direvoke
  async refresh(rawToken: string, userAgent?: string, ip?: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt < new Date() ||
      !existing.user.isActive
    ) {
      throw new UnauthorizedException(
        'Refresh token tidak valid, silakan login ulang',
      );
    }

    const roles = this.buildRolesPayload(existing.user);

    const access_token = this.jwtService.sign({
      sub: existing.user.id,
      username: existing.user.username,
      roles,
    });

    const {
      rawToken: refresh_token,
      expiresAt,
      id: newTokenId,
    } = await this.issueRefreshToken(existing.user.id, userAgent, ip);

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedById: newTokenId },
    });

    return {
      access_token,
      refresh_token,
      refresh_token_expires_at: expiresAt,
    };
  }

  async logout(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { loggedOut: true };
  }
}