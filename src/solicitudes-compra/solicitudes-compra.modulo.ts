import { Module } from '@nestjs/common';
import { AlmacenamientoModulo } from '../almacenamiento/almacenamiento.modulo';
import { ProyectosModulo } from '../proyectos/proyectos.modulo';
import { RubrosModulo } from '../rubros/rubros.modulo';
import { SolicitudesCompraAprobacionController } from './aprobacion/solicitudes-compra-aprobacion.controller';
import { SolicitudesCompraAprobacionService } from './aprobacion/solicitudes-compra-aprobacion.service';
import { SOLICITUDES_COMPRA_REPOSITORIO } from './interfaces/solicitudes-compra-repositorio.interface';
import { SolicitudesCompraController } from './solicitudes-compra.controller';
import { SolicitudesCompraRepositorio } from './solicitudes-compra.repositorio';
import { SolicitudesCompraService } from './solicitudes-compra.service';

@Module({
  imports: [AlmacenamientoModulo, ProyectosModulo, RubrosModulo],
  controllers: [
    SolicitudesCompraController,
    SolicitudesCompraAprobacionController,
  ],
  providers: [
    SolicitudesCompraService,
    SolicitudesCompraAprobacionService,
    {
      provide: SOLICITUDES_COMPRA_REPOSITORIO,
      useClass: SolicitudesCompraRepositorio,
    },
  ],
  exports: [SOLICITUDES_COMPRA_REPOSITORIO, SolicitudesCompraAprobacionService],
})
export class SolicitudesCompraModulo {}
