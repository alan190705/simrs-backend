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

    const where: any = {
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    if (query.roleId) {
      where.roles = { some: { roleId: query.roleId } };
    }

    if (query.branchId) {
      where.branches = { some: { branchId: query.branchId } };
    }

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

    // Validasi role & branch yang dikirim memang ada
    await this.validateRoles(dto.roles ?? []);
    await this.validateBranches(dto.branches ?? []);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const created = await this.prisma.user.create({
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
      select: USER_SELECT,
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

      // Ganti roles (kalau dikirim)
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

      // Ganti branches (kalau dikirim)
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

      return tx.user.findUnique({ where: { id }, select: USER_SELECT });
    });

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { id };
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    await this.findOne(id);

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { id };
  }

  // ---------- helpers ----------

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
}