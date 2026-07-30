import { Module } from '@nestjs/common';
import { TAREAS_REPOSITORIO } from './interfaces/tareas-repositorio.interface';
import { TareasController } from './tareas.controller';
import { TareasRepositorio } from './tareas.repositorio';
import { TareasService } from './tareas.service';

@Module({
  controllers: [TareasController],
  providers: [
    TareasService,
    { provide: TAREAS_REPOSITORIO, useClass: TareasRepositorio },
  ],
  exports: [TAREAS_REPOSITORIO],
})
export class TareasModulo {}
