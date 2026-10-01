import { Module } from '@nestjs/common';
import { RUBROS_REPOSITORIO } from './interfaces/rubros-repositorio.interface';
import { RubrosController } from './rubros.controller';
import { RubrosRepositorio } from './rubros.repositorio';
import { RubrosService } from './rubros.service';

@Module({
  controllers: [RubrosController],
  providers: [
    RubrosService,
    { provide: RUBROS_REPOSITORIO, useClass: RubrosRepositorio },
  ],
  exports: [RUBROS_REPOSITORIO],
})
export class RubrosModulo {}
