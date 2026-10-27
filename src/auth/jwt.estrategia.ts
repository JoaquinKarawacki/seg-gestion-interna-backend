import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { PayloadJwt } from './interfaces/payload-jwt.interface';
import { RolUsuario } from '../../generated/prisma/enums';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: PayloadJwt & { rol?: RolUsuario }): UsuarioAutenticado {
    // Shim de despliegue: un token viejo trae `rol` (singular) en vez de
    // `roles`. Se deriva para no romper sesiones abiertas hasta que expiren.
    const roles = payload.roles ?? (payload.rol ? [payload.rol] : []);
    return {
      id: payload.sub,
      email: payload.email,
      roles,
      sectorId: payload.sectorId,
      sectoresEncargado: payload.sectoresEncargado ?? [],
    };
  }
}
