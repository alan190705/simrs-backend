import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { UsersService } from './users.service';
import {
  ChangePasswordDto,
  CreateUserDto,
  QueryUserDto,
  UpdateUserDto,
} from './dto';

@UseGuards(JwtAuthGuard, ModuleGuard, PermissionGuard)
@RequireModule('user-management')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission({ module: 'user-management', code: 'view' })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermission({ module: 'user-management', code: 'view' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermission({ module: 'user-management', code: 'create' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @RequirePermission({ module: 'user-management', code: 'update' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission({ module: 'user-management', code: 'delete' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/password')
  @RequirePermission({ module: 'user-management', code: 'update' })
  changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(id, dto);
  }

  // ---------- MODULE ACCESS ----------

  @Get(':id/modules')
  @RequirePermission({ module: 'user-management', code: 'view' })
  getUserModules(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getUserModuleAccess(id);
  }

    /**
   * GET /api/v1/users/:id/effective-access
   * Ambil akses EFEKTIF user (role default + override) untuk UI.
   */
  @Get(':id/effective-access')
  @RequirePermission({ module: 'user-management', code: 'view' })
  getUserEffectiveAccess(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getUserEffectiveAccess(id);
  }
  
  @Patch(':id/modules')
  @RequirePermission({ module: 'user-management', code: 'update' })
  setUserModules(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { modules: { moduleCode: string; permissions: string[] }[] },
  ) {
    return this.usersService.setUserModuleAccess(id, body.modules ?? []);
  }
}