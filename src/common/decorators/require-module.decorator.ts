import { SetMetadata } from '@nestjs/common';

/**
 * Decorator untuk menandai endpoint butuh akses module tertentu.
 *
 * Contoh:
 *   @RequireModule('farmasi')
 *   @Get('obat')
 *   listObat() { ... }
 *
 * User harus punya akses ke module 'farmasi' agar bisa akses endpoint ini.
 * SUPER_ADMIN otomatis bypass (lihat ModuleGuard).
 */
export const REQUIRE_MODULE_KEY = 'require_module';

export const RequireModule = (...moduleCodes: string[]) =>
  SetMetadata(REQUIRE_MODULE_KEY, moduleCodes);