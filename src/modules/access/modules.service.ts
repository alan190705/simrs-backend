import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List semua modul aktif, urut by group + order.
   */
  async findAll() {
    return this.prisma.module.findMany({
      where: { isActive: true },
      include: {
        permissions: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: [{ group: 'asc' }, { order: 'asc' }],
    });
  }

  /**
   * Detail modul + semua permission.
   */
  async findByCode(code: string) {
    const mod = await this.prisma.module.findUnique({
      where: { code },
      include: {
        permissions: {
          select: { id: true, code: true, name: true, description: true },
          orderBy: { code: 'asc' },
        },
      },
    });

    if (!mod) throw new NotFoundException(`Modul "${code}" tidak ditemukan`);
    return mod;
  }

  /**
   * Permission saja dari sebuah modul.
   */
  async findPermissions(code: string) {
    const mod = await this.prisma.module.findUnique({
      where: { code },
      select: { id: true, code: true, name: true },
    });

    if (!mod) throw new NotFoundException(`Modul "${code}" tidak ditemukan`);

    return this.prisma.permission.findMany({
      where: { moduleId: mod.id },
      select: { id: true, code: true, name: true, description: true },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * List grup (untuk sidebar frontend).
   */
  async findGroups() {
    const modules = await this.prisma.module.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { group: true, code: true, name: true, icon: true, order: true },
    });

    // Group by 'group'
    const groups: Record<string, typeof modules> = {};
    for (const m of modules) {
      const key = m.group ?? 'Lainnya';
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }

    return Object.entries(groups).map(([label, items]) => ({
      label,
      items,
    }));
  }
}