import { Module } from '@nestjs/common';
import { SECTORES_REPOSITORIO } from './interfaces/sectores-repositorio.interface';
import { SectoresController } from './sectores.controller';
import { SectoresRepositorio } from './sectores.repositorio';
import { SectoresService } from './sectores.service';

@Module({
  controllers: [SectoresController],
  providers: [
    SectoresService,
    { provide: SECTORES_REPOSITORIO, useClass: SectoresRepositorio },
  ],
  exports: [SECTORES_REPOSITORIO],
})
export class SectoresModulo {}
