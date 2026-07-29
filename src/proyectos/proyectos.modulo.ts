import { Module } from '@nestjs/common';
import { PROYECTOS_REPOSITORIO } from './interfaces/proyectos-repositorio.interface';
import { ProyectosController } from './proyectos.controller';
import { ProyectosRepositorio } from './proyectos.repositorio';
import { ProyectosService } from './proyectos.service';

@Module({
  controllers: [ProyectosController],
  providers: [
    ProyectosService,
    { provide: PROYECTOS_REPOSITORIO, useClass: ProyectosRepositorio },
  ],
  exports: [PROYECTOS_REPOSITORIO],
})
export class ProyectosModulo {}
