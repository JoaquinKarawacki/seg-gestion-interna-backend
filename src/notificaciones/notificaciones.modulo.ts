import { Module } from '@nestjs/common';
import { UsuariosModulo } from '../usuarios/usuarios.modulo';
import { CorreoService } from './correo.service';
import { OrdenPagoEstadoCambiadoOyente } from './oyentes/orden-pago-estado-cambiado.oyente';
import { OrdenCompraEstadoCambiadoOyente } from './oyentes/orden-compra-estado-cambiado.oyente';

@Module({
  imports: [UsuariosModulo],
  providers: [
    CorreoService,
    OrdenPagoEstadoCambiadoOyente,
    OrdenCompraEstadoCambiadoOyente,
  ],
})
export class NotificacionesModulo {}
