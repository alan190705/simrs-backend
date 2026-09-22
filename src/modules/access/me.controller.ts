import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AccessControlService } from './access-control.service';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly accessControl: AccessControlService) {}

  @Get('access')
  async getMyAccess(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.accessControl.getUserAccess(user.userId);
  }

  @Get('access/modules')
  async getMyModules(@Req() req: Request) {
    const user = req.user as { userId: string };
    const codes = await this.accessControl.getUserModuleCodes(user.userId);
    return { modules: codes };
  }
}