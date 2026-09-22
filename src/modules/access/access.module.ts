import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { MeController } from './me.controller';

@Global()
@Module({
  controllers: [ModulesController, MeController],
  providers: [AccessControlService, ModulesService],
  exports: [AccessControlService, ModulesService],
})
export class AccessModule {}