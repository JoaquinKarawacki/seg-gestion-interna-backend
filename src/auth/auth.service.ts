import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { UsuarioModel } from '../../generated/prisma/models';
import { USUARIOS_REPOSITORIO } from '../usuarios/interfaces/usuarios-repositorio.interface';
import type { IUsuariosRepositorio } from '../usuarios/interfaces/usuarios-repositorio.interface';
import { LoginDto } from './dtos/login.dto';
import type {
  RespuestaAuthDto,
  UsuarioAutenticadoDto,
} from './dtos/respuesta-auth.dto';
import type { PayloadJwt } from './interfaces/payload-jwt.interface';

const MENSAJE_CREDENCIALES_INVALIDAS = 'Email o contraseña incorrectos';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USUARIOS_REPOSITORIO)
    private readonly usuariosRepositorio: IUsuariosRepositorio,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<RespuestaAuthDto> {
    const usuario = await this.validarCredenciales(dto.email, dto.contrasena);

    return {
      token: this.generarToken(usuario),
      usuario: this.mapearUsuarioAutenticado(usuario),
    };
  }

  async obtenerPerfil(usuarioId: string): Promise<UsuarioAutenticadoDto> {
    const usuario = await this.usuariosRepositorio.buscarPorId(usuarioId);

    if (!usuario) {
      throw new UnauthorizedException({
        error: 'USUARIO_NO_ENCONTRADO',
        mensaje: 'El usuario del token ya no existe',
      });
    }

    return this.mapearUsuarioAutenticado(usuario);
  }

  private async validarCredenciales(
    email: string,
    contrasena: string,
  ): Promise<UsuarioModel> {
    const usuario = await this.usuariosRepositorio.buscarPorEmail(email);
    const credencialesInvalidas = new UnauthorizedException({
      error: 'CREDENCIALES_INVALIDAS',
      mensaje: MENSAJE_CREDENCIALES_INVALIDAS,
    });

    if (!usuario || !usuario.activo) {
      throw credencialesInvalidas;
    }

    const contrasenaValida = await bcrypt.compare(
      contrasena,
      usuario.contrasenaHash,
    );

    if (!contrasenaValida) {
      throw credencialesInvalidas;
    }

    return usuario;
  }

  private generarToken(usuario: UsuarioModel): string {
    const payload: PayloadJwt = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    return this.jwtService.sign(payload);
  }

  private mapearUsuarioAutenticado(
    usuario: UsuarioModel,
  ): UsuarioAutenticadoDto {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };
  }
}
