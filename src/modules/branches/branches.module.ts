import { Global, Module } from '@nestjs/common';
import { BranchContext } from './branch-context.service';

@Global()
@Module({ providers: [BranchContext], exports: [BranchContext] })
export class BranchesModule {}
