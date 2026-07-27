import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RolUsuario } from '../../../generated/prisma/enums';
import { ROLES_METADATA_CLAVE } from '../decoradores/roles.decorador';
import { UsuarioAutenticado } from '../interfaces/usuario-autenticado.interface';

@Injectable()
export class RolesGuardia implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_METADATA_CLAVE,
      [contexto.getHandler(), contexto.getClass()],
    );

    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const solicitud = contexto
      .switchToHttp()
      .getRequest<Request & { user: UsuarioAutenticado }>();

    if (!rolesRequeridos.includes(solicitud.user.rol)) {
      throw new ForbiddenException({
        error: 'SIN_PERMISO',
        mensaje: 'No tenés permiso para realizar esta acción',
      });
    }

    return true;
  }
}
