import { Module } from '@nestjs/common';
import { AlmacenamientoModulo } from '../almacenamiento/almacenamiento.modulo';
import { ProyectosModulo } from '../proyectos/proyectos.modulo';
import { RubrosModulo } from '../rubros/rubros.modulo';
import { OrdenesCompraAprobacionController } from './aprobacion/ordenes-compra-aprobacion.controller';
import { OrdenesCompraAprobacionService } from './aprobacion/ordenes-compra-aprobacion.service';
import { ORDENES_COMPRA_REPOSITORIO } from './interfaces/ordenes-compra-repositorio.interface';
import { OrdenesCompraController } from './ordenes-compra.controller';
import { OrdenesCompraRepositorio } from './ordenes-compra.repositorio';
import { OrdenesCompraService } from './ordenes-compra.service';

@Module({
  imports: [AlmacenamientoModulo, ProyectosModulo, RubrosModulo],
  controllers: [OrdenesCompraController, OrdenesCompraAprobacionController],
  providers: [
    OrdenesCompraService,
    OrdenesCompraAprobacionService,
    {
      provide: ORDENES_COMPRA_REPOSITORIO,
      useClass: OrdenesCompraRepositorio,
    },
  ],
  exports: [ORDENES_COMPRA_REPOSITORIO, OrdenesCompraAprobacionService],
})
export class OrdenesCompraModulo {}
