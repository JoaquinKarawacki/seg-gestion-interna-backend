import { Module } from '@nestjs/common';
import { AlmacenamientoModulo } from '../almacenamiento/almacenamiento.modulo';
import { TareasModulo } from '../tareas/tareas.modulo';
import { CotizacionesController } from './cotizaciones.controller';
import { CotizacionesRepositorio } from './cotizaciones.repositorio';
import { CotizacionesService } from './cotizaciones.service';
import { COTIZACIONES_REPOSITORIO } from './interfaces/cotizaciones-repositorio.interface';

@Module({
  imports: [AlmacenamientoModulo, TareasModulo],
  controllers: [CotizacionesController],
  providers: [
    CotizacionesService,
    { provide: COTIZACIONES_REPOSITORIO, useClass: CotizacionesRepositorio },
  ],
  exports: [COTIZACIONES_REPOSITORIO],
})
export class CotizacionesModulo {}
