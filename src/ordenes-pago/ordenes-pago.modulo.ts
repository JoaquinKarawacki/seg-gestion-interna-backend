import { Module } from '@nestjs/common';
import { AlmacenamientoModulo } from '../almacenamiento/almacenamiento.modulo';
import { CotizacionesModulo } from '../cotizaciones/cotizaciones.modulo';
import { ProyectosModulo } from '../proyectos/proyectos.modulo';
import { OrdenesCompraModulo } from '../ordenes-compra/ordenes-compra.modulo';
import { UsuariosModulo } from '../usuarios/usuarios.modulo';
import { OrdenesPagoAprobacionController } from './aprobacion/ordenes-pago-aprobacion.controller';
import { OrdenesPagoAprobacionService } from './aprobacion/ordenes-pago-aprobacion.service';
import { ORDENES_PAGO_REPOSITORIO } from './interfaces/ordenes-pago-repositorio.interface';
import { OrdenesPagoController } from './ordenes-pago.controller';
import { OrdenesPagoRepositorio } from './ordenes-pago.repositorio';
import { OrdenesPagoService } from './ordenes-pago.service';
import { OrdenCompraAprobadaOyente } from './oyentes/orden-compra-aprobada.oyente';
import { CadenaValidacionOP } from './validaciones/cadena-validacion-op';
import { ValidarMontoNoExcedeCotizacionEslabon } from './validaciones/validar-monto-no-excede-cotizacion.eslabon';
import { ValidarProveedorCoincideCotizacionEslabon } from './validaciones/validar-proveedor-coincide-cotizacion.eslabon';

@Module({
  imports: [
    AlmacenamientoModulo,
    CotizacionesModulo,
    ProyectosModulo,
    OrdenesCompraModulo,
    UsuariosModulo,
  ],
  controllers: [OrdenesPagoController, OrdenesPagoAprobacionController],
  providers: [
    OrdenesPagoService,
    OrdenesPagoAprobacionService,
    OrdenCompraAprobadaOyente,
    {
      provide: ORDENES_PAGO_REPOSITORIO,
      useClass: OrdenesPagoRepositorio,
    },
    ValidarProveedorCoincideCotizacionEslabon,
    ValidarMontoNoExcedeCotizacionEslabon,
    CadenaValidacionOP,
  ],
  exports: [ORDENES_PAGO_REPOSITORIO, OrdenesPagoAprobacionService],
})
export class OrdenesPagoModulo {}
