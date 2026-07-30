import { Module } from '@nestjs/common';
import { AlmacenamientoModulo } from '../almacenamiento/almacenamiento.modulo';
import { CotizacionesModulo } from '../cotizaciones/cotizaciones.modulo';
import { ProyectosModulo } from '../proyectos/proyectos.modulo';
import { OrdenesCompraAprobacionController } from './aprobacion/ordenes-compra-aprobacion.controller';
import { OrdenesCompraAprobacionService } from './aprobacion/ordenes-compra-aprobacion.service';
import { ORDENES_COMPRA_REPOSITORIO } from './interfaces/ordenes-compra-repositorio.interface';
import { OrdenesCompraController } from './ordenes-compra.controller';
import { OrdenesCompraRepositorio } from './ordenes-compra.repositorio';
import { OrdenesCompraService } from './ordenes-compra.service';
import { CadenaValidacionOC } from './validaciones/cadena-validacion-oc';
import { ValidarMontoNoExcedeCotizacionEslabon } from './validaciones/validar-monto-no-excede-cotizacion.eslabon';
import { ValidarProveedorCoincideCotizacionEslabon } from './validaciones/validar-proveedor-coincide-cotizacion.eslabon';

@Module({
  imports: [AlmacenamientoModulo, CotizacionesModulo, ProyectosModulo],
  controllers: [OrdenesCompraController, OrdenesCompraAprobacionController],
  providers: [
    OrdenesCompraService,
    OrdenesCompraAprobacionService,
    {
      provide: ORDENES_COMPRA_REPOSITORIO,
      useClass: OrdenesCompraRepositorio,
    },
    ValidarProveedorCoincideCotizacionEslabon,
    ValidarMontoNoExcedeCotizacionEslabon,
    CadenaValidacionOC,
  ],
  exports: [ORDENES_COMPRA_REPOSITORIO],
})
export class OrdenesCompraModulo {}
