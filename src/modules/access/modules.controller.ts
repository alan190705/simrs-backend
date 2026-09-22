import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ModulesService } from './modules.service';

/**
 * Endpoint modul — TIDAK pakai ModuleGuard karena user perlu bisa
 * lihat daftar modul (untuk sidebar). Cukup JwtAuthGuard.
 * */
@UseGuards(JwtAuthGuard)
@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  findAll() {
    return this.modulesService.findAll();
  }

  @Get('groups')
  findGroups() {
    return this.modulesService.findGroups();
  }

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.modulesService.findByCode(code);
  }

  @Get(':code/permissions')
  findPermissions(@Param('code') code: string) {
    return this.modulesService.findPermissions(code);
  }
}