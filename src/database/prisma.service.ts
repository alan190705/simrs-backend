import { ForbiddenException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

/**
 * Model yang memiliki kolom branchId. Tambahkan nama model di sini saat tabelnya dibuat
 * (mis. 'Polyclinic', 'Room', 'Registration', 'Visit', 'MedicineStock', 'Billing').
 */
export const BRANCH_SCOPED_MODELS = new Set<string>([]);

const WHERE_OPS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow',
  'count', 'aggregate', 'groupBy', 'update', 'updateMany', 'delete', 'deleteMany',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly cls: ClsService) { super(); }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }

  /** Client yang otomatis memfilter/mengisi branchId untuk model per-cabang. Pakai ini di repository. */
  get scoped() {
    const cls = this.cls;
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!BRANCH_SCOPED_MODELS.has(model)) return query(args);
            const branchId = cls.get('branchId');
            if (!branchId) throw new ForbiddenException('Cabang aktif belum dipilih');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const a = args as any;
            if (WHERE_OPS.has(operation)) a.where = { ...a.where, branchId };
            else if (operation === 'create') a.data = { ...a.data, branchId };
            else if (operation === 'createMany') a.data = (Array.isArray(a.data) ? a.data : [a.data]).map((d: object) => ({ ...d, branchId }));
            else throw new Error(`Operasi ${operation} belum didukung pada model per-cabang ${model}`);
            return query(a);
          },
        },
      },
    });
  }
}
