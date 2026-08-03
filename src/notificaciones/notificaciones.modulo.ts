import { Module } from '@nestjs/common';
import { UsuariosModulo } from '../usuarios/usuarios.modulo';
import { CorreoService } from './correo.service';
import { OrdenCompraEstadoCambiadoOyente } from './oyentes/orden-compra-estado-cambiado.oyente';

@Module({
  imports: [UsuariosModulo],
  providers: [CorreoService, OrdenCompraEstadoCambiadoOyente],
})
export class NotificacionesModulo {}
