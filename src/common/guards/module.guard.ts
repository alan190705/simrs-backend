import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AccessControlService } from '../../modules/access/access-control.service';
import { REQUIRE_MODULE_KEY } from '../decorators/require-module.decorator';

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Ambil module codes yang diwajibkan dari decorator
    const requiredModules = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Kalau endpoint tidak pakai @RequireModule, skip
    if (!requiredModules || requiredModules.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as { userId?: string } | undefined;

    if (!user?.userId) {
      throw new ForbiddenException('User tidak terautentikasi');
    }

    // Cek user punya SALAH SATU module yang diwajibkan
    for (const moduleCode of requiredModules) {
      const can = await this.accessControl.canAccessModule(user.userId, moduleCode);
      if (can) return true;
    }

    throw new ForbiddenException(
      `Anda tidak memiliki akses ke modul: ${requiredModules.join(', ')}`,
    );
  }
}