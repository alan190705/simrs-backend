import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import {
  ChangePasswordDto,
  CreateUserDto,
  QueryUserDto,
  UpdateUserDto,
} from './dto';
import { ApiResult } from '../../common/dto/api-result';

const SALT_ROUNDS = 12;

const USER_SELECT = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  roles: {
    select: {
      id: true,
      roleId: true,
      branchId: true,
      role: { select: { code: true, name: true } },
      branch: { select: { code: true, name: true } },
    },
  },
  branches: {
    select: {
      branchId: true,
      isDefault: true,
      branch: { select: { code: true, name: true } },
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUserDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (typeof query.isActive === 'boolean') where.isActive = query.isActive;
    if (query.roleId) where.roles = { some: { roleId: query.roleId } };
    if (query.branchId) where.branches = { some: { branchId: query.branchId } };

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: USER_SELECT,
      }),
    ]);

    return new ApiResult(items, 'Berhasil', { page, limit, total });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  async create(dto: CreateUserDto) {
    // Cek duplikasi username/email
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
      },
      select: { username: true, email: true },
    });

    if (existing) {
      if (existing.username === dto.username) {
        throw new ConflictException('Username sudah digunakan');
      }
      if (dto.email && existing.email === dto.email) {
        throw new ConflictException('Email sudah digunakan');
      }
    }

    // Validasi role, branch, module
    await this.validateRoles(dto.roles ?? []);
    await this.validateBranches(dto.branches ?? []);
    await this.validateModules(dto.modules ?? []);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email ?? null,
          fullName: dto.fullName,
          passwordHash,
          isActive: dto.isActive ?? true,
          roles: dto.roles?.length
            ? {
                create: dto.roles.map((r) => ({
                  roleId: r.roleId,
                  branchId: r.branchId ?? null,
                })),
              }
            : undefined,
          branches: dto.branches?.length
            ? {
                create: dto.branches.map((b) => ({
                  branchId: b.branchId,
                  isDefault: b.isDefault ?? false,
                })),
              }
            : undefined,
        },
      });

      // Assign module access (override per user)
      if (dto.modules?.length) {
        await this.assignModules(tx, user.id, dto.modules);
      }

      return tx.user.findUnique({
        where: { id: user.id },
        select: USER_SELECT,
      });
    });

    return created;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    // Cek duplikasi username/email kalau diubah
    if (dto.username || dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(dto.username ? [{ username: dto.username }] : []),
            ...(dto.email ? [{ email: dto.email }] : []),
          ],
        },
        select: { username: true, email: true },
      });

      if (existing) {
        if (dto.username && existing.username === dto.username) {
          throw new ConflictException('Username sudah digunakan');
        }
        if (dto.email && existing.email === dto.email) {
          throw new ConflictException('Email sudah digunakan');
        }
      }
    }

    await this.validateRoles(dto.roles ?? []);
    await this.validateBranches(dto.branches ?? []);
    await this.validateModules(dto.modules ?? []);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update field dasar
      await tx.user.update({
        where: { id },
        data: {
          ...(dto.username !== undefined && { username: dto.username }),
          ...(dto.email !== undefined && { email: dto.email ?? null }),
          ...(dto.fullName !== undefined && { fullName: dto.fullName }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });

      // Ganti roles
      if (dto.roles) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        if (dto.roles.length) {
          await tx.userRole.createMany({
            data: dto.roles.map((r) => ({
              userId: id,
              roleId: r.roleId,
              branchId: r.branchId ?? null,
            })),
          });
        }
      }

      // Ganti branches
      if (dto.branches) {
        await tx.userBranch.deleteMany({ where: { userId: id } });
        if (dto.branches.length) {
          await tx.userBranch.createMany({
            data: dto.branches.map((b) => ({
              userId: id,
              branchId: b.branchId,
              isDefault: b.isDefault ?? false,
            })),
          });
        }
      }

      // Ganti module access (override)
      if (dto.modules) {
        await tx.userModuleAccess.deleteMany({ where: { userId: id } });
        if (dto.modules.length) {
          await this.assignModules(tx, id, dto.modules);
        }
      }

      return tx.user.findUnique({ where: { id }, select: USER_SELECT });
    });

    return updated;
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    const suffix = `_deleted_${Date.now()}`;

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        username: `${user.username}${suffix}`,
        email: user.email ? `${user.email}${suffix}` : null,
      },
    });

    return { id };
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { id };
  }

  // ---------- MODULE ACCESS ----------

    /**
   * Ambil akses EFEKTIF user = role default + override per-user.
   * Ini yang dipakai frontend untuk tampilkan checkbox di tab Module Access.
   */
  async getUserEffectiveAccess(userId: string) {
    await this.findOne(userId);

    // 1. Ambil role user
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    const roleIds = userRoles.map((ur) => ur.roleId);
    const roleCodes = userRoles.map((ur) => ur.role.code);
    const isSuperAdmin = roleCodes.includes('SUPER_ADMIN');

    // 2. Ambil SEMUA module + permission (untuk render checkbox lengkap)
    const allModules = await this.prisma.module.findMany({
      where: { isActive: true },
      include: {
        permissions: {
          select: { id: true, code: true, name: true },
          orderBy: { code: 'asc' },
        },
      },
      orderBy: [{ group: 'asc' }, { order: 'asc' }],
    });

    // 3. Ambil permission default dari role
    const rolePermissions = await this.prisma.roleModulePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { module: true, permission: true },
    });

    // 4. Ambil override per-user
    const userOverrides = await this.prisma.userModuleAccess.findMany({
      where: { userId },
      include: { module: true, permission: true },
    });

    // 5. Bangun struktur hasil:
    // Map<moduleCode, { permissionCode: { default: bool, override: 'grant' | 'deny' | null, effective: bool } }>
    type PermState = {
      permissionId: string;
      code: string;
      name: string;
      fromRole: boolean;
      override: 'grant' | 'deny' | null;
      effective: boolean;
    };

    type ModuleState = {
      moduleId: string;
      moduleCode: string;
      moduleName: string;
      moduleGroup: string | null;
      moduleIcon: string | null;
      moduleOrder: number;
      permissions: PermState[];
      hasAccess: boolean; // true kalau minimal 1 permission effective
      overridden: boolean; // true kalau ada override di modul ini
    };

    const moduleStateMap = new Map<string, ModuleState>();

    for (const mod of allModules) {
      const permStates: PermState[] = mod.permissions.map((p) => {
        const fromRole = rolePermissions.some(
          (rp) => rp.moduleId === mod.id && rp.permissionId === p.id,
        );
        const override = userOverrides.find(
          (ov) => ov.moduleId === mod.id && ov.permissionId === p.id,
        );

        const overrideType = override
          ? override.granted
            ? 'grant'
            : 'deny'
          : null;

        // Effective logic:
        // - Kalau SUPER_ADMIN → semua true
        // - Kalau override 'grant' → true
        // - Kalau override 'deny' → false
        // - Kalau tidak ada override → dari role
        let effective: boolean;
        if (isSuperAdmin) {
          effective = true;
        } else if (overrideType === 'grant') {
          effective = true;
        } else if (overrideType === 'deny') {
          effective = false;
        } else {
          effective = fromRole;
        }

        return {
          permissionId: p.id,
          code: p.code,
          name: p.name,
          fromRole,
          override: overrideType,
          effective,
        };
      });

      const hasAccess = permStates.some((p) => p.effective);
      const overridden = permStates.some((p) => p.override !== null);

      moduleStateMap.set(mod.code, {
        moduleId: mod.id,
        moduleCode: mod.code,
        moduleName: mod.name,
        moduleGroup: mod.group,
        moduleIcon: mod.icon,
        moduleOrder: mod.order,
        permissions: permStates,
        hasAccess,
        overridden,
      });
    }

    return {
      userId,
      roles: roleCodes,
      isSuperAdmin,
      modules: Array.from(moduleStateMap.values()),
    };
  }
  
  /**
   * Ambil daftar module access user (override).
   * Ini TERPISAH dari role default — dipakai untuk halaman detail user.
   */
  async getUserModuleAccess(userId: string) {
    await this.findOne(userId);

    const items = await this.prisma.userModuleAccess.findMany({
      where: { userId },
      include: {
        module: { select: { code: true, name: true, group: true } },
        permission: { select: { code: true, name: true } },
      },
    });

    // Group by module
    const map = new Map<
      string,
      { moduleCode: string; moduleName: string; moduleGroup: string | null; permissions: string[]; granted: boolean }
    >();

    for (const item of items) {
      if (!map.has(item.module.code)) {
        map.set(item.module.code, {
          moduleCode: item.module.code,
          moduleName: item.module.name,
          moduleGroup: item.module.group,
          permissions: [],
          granted: item.granted,
        });
      }
      const entry = map.get(item.module.code)!;
      if (item.granted) entry.permissions.push(item.permission.code);
    }

    return Array.from(map.values());
  }

  /**
   * Set module access user (replace all).
   */
  async setUserModuleAccess(
    userId: string,
    modules: { moduleCode: string; permissions: string[] }[],
  ) {
    await this.findOne(userId);
    await this.validateModules(modules);

    await this.prisma.$transaction(async (tx) => {
      await tx.userModuleAccess.deleteMany({ where: { userId } });
      if (modules.length) {
        await this.assignModules(tx, userId, modules);
      }
    });

    return this.getUserModuleAccess(userId);
  }

  // ---------- HELPERS ----------

  private async assignModules(
    tx: any,
    userId: string,
    modules: { moduleCode: string; permissions: string[] }[],
  ) {
    for (const mod of modules) {
      const moduleRow = await tx.module.findUnique({
        where: { code: mod.moduleCode },
      });
      if (!moduleRow) continue;

      for (const permCode of mod.permissions) {
        const permRow = await tx.permission.findFirst({
          where: { moduleId: moduleRow.id, code: permCode },
        });
        if (!permRow) continue;

        await tx.userModuleAccess.create({
          data: {
            userId,
            moduleId: moduleRow.id,
            permissionId: permRow.id,
            granted: true,
          },
        });
      }
    }
  }

  private async validateRoles(roles: { roleId: string }[]) {
    if (!roles.length) return;
    const ids = [...new Set(roles.map((r) => r.roleId))];
    const found = await this.prisma.role.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Ada roleId yang tidak valid');
    }
  }

  private async validateBranches(branches: { branchId: string }[]) {
    if (!branches.length) return;
    const ids = [...new Set(branches.map((b) => b.branchId))];
    const found = await this.prisma.branch.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Ada branchId yang tidak valid');
    }
  }

  private async validateModules(
    modules: { moduleCode: string; permissions: string[] }[],
  ) {
    if (!modules.length) return;

    const moduleCodes = [...new Set(modules.map((m) => m.moduleCode))];
    const found = await this.prisma.module.findMany({
      where: { code: { in: moduleCodes } },
      select: { id: true, code: true },
    });

    if (found.length !== moduleCodes.length) {
      throw new BadRequestException('Ada moduleCode yang tidak valid');
    }

    // Validasi permission per module
    for (const mod of modules) {
      const moduleRow = found.find((m) => m.code === mod.moduleCode);
      if (!moduleRow) continue;

      const permCodes = [...new Set(mod.permissions)];
      const foundPerms = await this.prisma.permission.findMany({
        where: {
          moduleId: moduleRow.id,
          code: { in: permCodes },
        },
        select: { code: true },
      });

      if (foundPerms.length !== permCodes.length) {
        throw new BadRequestException(
          `Ada permission yang tidak valid di module "${mod.moduleCode}"`,
        );
      }
    }
  }
}