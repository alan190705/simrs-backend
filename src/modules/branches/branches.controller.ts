import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}