import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import type { UsuarioModel } from '../../generated/prisma/models';
import { ActualizarUsuarioDto } from './dtos/actualizar-usuario.dto';
import { CambiarContrasenaDto } from './dtos/cambiar-contrasena.dto';
import { CrearUsuarioDto } from './dtos/crear-usuario.dto';
import { RespuestaUsuarioDto } from './dtos/respuesta-usuario.dto';
import { USUARIOS_REPOSITORIO } from './interfaces/usuarios-repositorio.interface';
import type { IUsuariosRepositorio } from './interfaces/usuarios-repositorio.interface';

const RONDAS_HASH = 10;
const CODIGO_RESTRICCION_UNICA = 'P2002';

@Injectable()
export class UsuariosService {
  constructor(
    @Inject(USUARIOS_REPOSITORIO)
    private readonly usuariosRepositorio: IUsuariosRepositorio,
  ) {}

  async listar(): Promise<RespuestaUsuarioDto[]> {
    const usuarios = await this.usuariosRepositorio.buscarTodos();
    return usuarios.map((usuario) => this.mapearRespuesta(usuario));
  }

  async buscarPorId(id: string): Promise<RespuestaUsuarioDto> {
    const usuario = await this.obtenerUsuarioOFallar(id);
    return this.mapearRespuesta(usuario);
  }

  async crear(dto: CrearUsuarioDto): Promise<RespuestaUsuarioDto> {
    const contrasenaHash = await bcrypt.hash(dto.contrasena, RONDAS_HASH);

    const usuario = await this.ejecutarOMapearConflicto(() =>
      this.usuariosRepositorio.crear({
        nombre: dto.nombre,
        email: dto.email,
        contrasenaHash,
        rol: dto.rol,
        sectorId: dto.sectorId ?? null,
      }),
    );

    return this.mapearRespuesta(usuario);
  }

  async actualizar(
    id: string,
    dto: ActualizarUsuarioDto,
  ): Promise<RespuestaUsuarioDto> {
    await this.obtenerUsuarioOFallar(id);

    const usuario = await this.ejecutarOMapearConflicto(() =>
      this.usuariosRepositorio.actualizar(id, dto),
    );

    return this.mapearRespuesta(usuario);
  }

  async eliminar(id: string): Promise<void> {
    await this.obtenerUsuarioOFallar(id);
    await this.usuariosRepositorio.eliminar(id);
  }

  async cambiarContrasena(
    usuarioId: string,
    dto: CambiarContrasenaDto,
  ): Promise<void> {
    const usuario = await this.obtenerUsuarioOFallar(usuarioId);
    const contrasenaActualValida = await bcrypt.compare(
      dto.contrasenaActual,
      usuario.contrasenaHash,
    );

    if (!contrasenaActualValida) {
      throw new UnauthorizedException({
        error: 'CONTRASENA_ACTUAL_INCORRECTA',
        mensaje: 'La contraseña actual ingresada no es correcta',
      });
    }

    const contrasenaHash = await bcrypt.hash(dto.contrasenaNueva, RONDAS_HASH);
    await this.usuariosRepositorio.actualizar(usuarioId, { contrasenaHash });
  }

  private async obtenerUsuarioOFallar(id: string): Promise<UsuarioModel> {
    const usuario = await this.usuariosRepositorio.buscarPorId(id);

    if (!usuario) {
      throw new NotFoundException({
        error: 'USUARIO_NO_ENCONTRADO',
        mensaje: 'No existe un usuario con ese ID',
      });
    }

    return usuario;
  }

  private async ejecutarOMapearConflicto(
    operacion: () => Promise<UsuarioModel>,
  ): Promise<UsuarioModel> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_RESTRICCION_UNICA
      ) {
        throw new ConflictException({
          error: 'EMAIL_YA_REGISTRADO',
          mensaje: 'Ya existe un usuario con ese email',
        });
      }

      throw error;
    }
  }

  private mapearRespuesta(usuario: UsuarioModel): RespuestaUsuarioDto {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
      sectorId: usuario.sectorId,
    };
  }
}
