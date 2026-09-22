import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AccessControlService } from '../../modules/access/access-control.service';
import {
  REQUIRE_PERMISSION_KEY,
  type RequiredPermission,
} from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as { userId?: string } | undefined;

    if (!user?.userId) {
      throw new ForbiddenException('User tidak terautentikasi');
    }

    const can = await this.accessControl.canAccessPermission(
      user.userId,
      required.module,
      required.code,
    );

    if (!can) {
      throw new ForbiddenException(
        `Anda tidak memiliki permission "${required.code}" di modul "${required.module}"`,
      );
    }

    return true;
  }
}