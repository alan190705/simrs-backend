import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

/** Cabang aktif untuk request berjalan. Diisi dari klaim JWT oleh guard auth (Tahap 2). */
@Injectable()
export class BranchContext {
  constructor(private readonly cls: ClsService) {}

  get branchId(): string | undefined { return this.cls.get('branchId'); }
  set(branchId: string) { this.cls.set('branchId', branchId); }
  require(): string {
    const id = this.branchId;
    if (!id) throw new ForbiddenException('Cabang aktif belum dipilih');
    return id;
  }
}
