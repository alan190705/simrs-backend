import { SetMetadata } from '@nestjs/common';

/**
 * Decorator untuk menandai endpoint butuh permission spesifik.
 *
 * Contoh:
 *   @RequirePermission({ module: 'farmasi', code: 'create' })
 *   @Post('obat')
 *   createObat() { ... }
 *
 * User harus punya permission 'create' di module 'farmasi'.
 * SUPER_ADMIN otomatis bypass (lihat PermissionGuard).
 */
export const REQUIRE_PERMISSION_KEY = 'require_permission';

export interface RequiredPermission {
  module: string;
  code: string;
}

export const RequirePermission = (permission: RequiredPermission) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);