import { Module } from '@nestjs/common';
import { OrdenesCompraModulo } from '../ordenes-compra/ordenes-compra.modulo';
import { OrdenesPagoModulo } from '../ordenes-pago/ordenes-pago.modulo';
import { UsuariosModulo } from '../usuarios/usuarios.modulo';
import { CorreoService } from './correo.service';
import { OrdenPagoEstadoCambiadoOyente } from './oyentes/orden-pago-estado-cambiado.oyente';
import { OrdenCompraEstadoCambiadoOyente } from './oyentes/orden-compra-estado-cambiado.oyente';

@Module({
  imports: [UsuariosModulo, OrdenesCompraModulo, OrdenesPagoModulo],
  providers: [
    CorreoService,
    OrdenPagoEstadoCambiadoOyente,
    OrdenCompraEstadoCambiadoOyente,
  ],
})
export class NotificacionesModulo {}
