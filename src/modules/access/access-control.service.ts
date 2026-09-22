import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

// ============================================================
// TIPE DATA
// ============================================================

export interface UserModuleAccess {
  moduleCode: string;
  moduleName: string;
  moduleGroup: string | null;
  moduleIcon: string | null;
  moduleOrder: number;
  permissions: string[]; // ['view', 'create', ...]
}

export interface UserAccessSummary {
  userId: string;
  roles: string[];
  isSuperAdmin: boolean;
  modules: UserModuleAccess[];
}

// ============================================================
// SERVICE
// ============================================================

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ambil semua akses user (module + permission) berdasarkan:
   * 1. Role default permissions (RoleModulePermission)
   * 2. Override per-user (UserModuleAccess) — granted=true tambah, granted=false buang
   *
   * SUPER_ADMIN dapat akses ke SEMUA module & permission.
   */
  async getUserAccess(userId: string): Promise<UserAccessSummary> {
    // 1. Ambil role user
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    const roleIds = userRoles.map((ur) => ur.roleId);
    const roleCodes = userRoles.map((ur) => ur.role.code);
    const isSuperAdmin = roleCodes.includes('SUPER_ADMIN');

    // 2. SUPER_ADMIN: bypass — ambil semua module + permission
    if (isSuperAdmin) {
      const allModules = await this.prisma.module.findMany({
        where: { isActive: true },
        include: { permissions: true },
        orderBy: { order: 'asc' },
      });

      return {
        userId,
        roles: roleCodes,
        isSuperAdmin: true,
        modules: allModules.map((m) => ({
          moduleCode: m.code,
          moduleName: m.name,
          moduleGroup: m.group,
          moduleIcon: m.icon,
          moduleOrder: m.order,
          permissions: m.permissions.map((p) => p.code),
        })),
      };
    }

    // 3. Ambil semua permission dari role
    const rolePermissions = await this.prisma.roleModulePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { module: true, permission: true },
    });

    // 4. Ambil override per-user
    const userOverrides = await this.prisma.userModuleAccess.findMany({
      where: { userId },
      include: { module: true, permission: true },
    });

    // 5. Gabung: map[moduleCode][permissionCode] = granted
    type PermissionMap = Map<string, Set<string>>;
    const permissionMap: PermissionMap = new Map();

    // Isi dari role
    for (const rp of rolePermissions) {
      if (!rp.module.isActive) continue;
      if (!permissionMap.has(rp.module.code)) {
        permissionMap.set(rp.module.code, new Set());
      }
      permissionMap.get(rp.module.code)!.add(rp.permission.code);
    }

    // Apply override: grant (tambah) atau deny (buang)
    for (const ov of userOverrides) {
      if (!ov.module.isActive) continue;
      if (!permissionMap.has(ov.module.code)) {
        permissionMap.set(ov.module.code, new Set());
      }
      const set = permissionMap.get(ov.module.code)!;

      if (ov.granted) {
        set.add(ov.permission.code);
      } else {
        set.delete(ov.permission.code);
        // Kalau kosong, hapus module dari map
        if (set.size === 0) {
          permissionMap.delete(ov.module.code);
        }
      }
    }

    // 6. Ambil metadata module
    const moduleCodes = Array.from(permissionMap.keys());
    const modules = await this.prisma.module.findMany({
      where: { code: { in: moduleCodes }, isActive: true },
      orderBy: { order: 'asc' },
    });

    const moduleMap = new Map(modules.map((m) => [m.code, m]));

    const result: UserModuleAccess[] = [];
    for (const [moduleCode, permSet] of permissionMap.entries()) {
      const mod = moduleMap.get(moduleCode);
      if (!mod) continue;

      result.push({
        moduleCode: mod.code,
        moduleName: mod.name,
        moduleGroup: mod.group,
        moduleIcon: mod.icon,
        moduleOrder: mod.order,
        permissions: Array.from(permSet),
      });
    }

    // Urutkan sesuai order module
    result.sort((a, b) => a.moduleOrder - b.moduleOrder);

    return {
      userId,
      roles: roleCodes,
      isSuperAdmin: false,
      modules: result,
    };
  }

  /**
   * Cek apakah user punya akses ke module tertentu.
   */
  async canAccessModule(userId: string, moduleCode: string): Promise<boolean> {
    const access = await this.getUserAccess(userId);
    if (access.isSuperAdmin) return true;
    return access.modules.some((m) => m.moduleCode === moduleCode);
  }

  /**
   * Cek apakah user punya permission tertentu di module tertentu.
   */
  async canAccessPermission(
    userId: string,
    moduleCode: string,
    permissionCode: string,
  ): Promise<boolean> {
    const access = await this.getUserAccess(userId);
    if (access.isSuperAdmin) return true;

    const mod = access.modules.find((m) => m.moduleCode === moduleCode);
    if (!mod) return false;

    return mod.permissions.includes(permissionCode);
  }

  /**
   * Ambil daftar module code yang user punya akses.
   * Helper untuk frontend / sidebar.
   */
  async getUserModuleCodes(userId: string): Promise<string[]> {
    const access = await this.getUserAccess(userId);
    return access.modules.map((m) => m.moduleCode);
  }

  /**
   * Wajib punya akses module — kalau tidak, throw ForbiddenException.
   */
  async requireModuleAccess(userId: string, moduleCode: string): Promise<void> {
    const can = await this.canAccessModule(userId, moduleCode);
    if (!can) {
      throw new ForbiddenException(
        `Anda tidak memiliki akses ke modul "${moduleCode}"`,
      );
    }
  }

  /**
   * Wajib punya permission — kalau tidak, throw ForbiddenException.
   */
  async requirePermission(
    userId: string,
    moduleCode: string,
    permissionCode: string,
  ): Promise<void> {
    const can = await this.canAccessPermission(
      userId,
      moduleCode,
      permissionCode,
    );
    if (!can) {
      throw new ForbiddenException(
        `Anda tidak memiliki permission "${permissionCode}" di modul "${moduleCode}"`,
      );
    }
  }
}