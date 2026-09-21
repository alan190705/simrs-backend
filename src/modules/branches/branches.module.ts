import { Global, Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchContext } from './branch-context.service';

@Global()
@Module({
  controllers: [BranchesController],
  providers: [BranchContext],
  exports: [BranchContext],
})
export class BranchesModule {}