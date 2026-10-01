import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { RubroModel } from '../../generated/prisma/models';
import { ACCIONES_AUDITORIA } from '../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { ActualizarRubroDto } from './dtos/actualizar-rubro.dto';
import { CrearRubroDto } from './dtos/crear-rubro.dto';
import { RespuestaRubroDto } from './dtos/respuesta-rubro.dto';
import { RUBROS_REPOSITORIO } from './interfaces/rubros-repositorio.interface';
import type { IRubrosRepositorio } from './interfaces/rubros-repositorio.interface';

const CODIGO_RESTRICCION_UNICA = 'P2002';

@Injectable()
export class RubrosService {
  constructor(
    @Inject(RUBROS_REPOSITORIO)
    private readonly rubrosRepositorio: IRubrosRepositorio,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async listar(): Promise<RespuestaRubroDto[]> {
    const rubros = await this.rubrosRepositorio.buscarTodos();
    return rubros.map((rubro) => this.mapearRespuesta(rubro));
  }

  async buscarPorId(id: string): Promise<RespuestaRubroDto> {
    const rubro = await this.obtenerRubroOFallar(id);
    return this.mapearRespuesta(rubro);
  }

  async crear(
    dto: CrearRubroDto,
    usuarioActual: UsuarioAutenticado,
  ): Promise<RespuestaRubroDto> {
    const rubro = await this.ejecutarOMapearConflicto(() =>
      this.rubrosRepositorio.crear({ nombre: dto.nombre.trim() }),
    );

    await this.auditoriaService.registrar({
      usuarioId: usuarioActual.id,
      usuarioEmail: usuarioActual.email,
      accion: ACCIONES_AUDITORIA.CREAR_RUBRO,
      descripcion: `Creó el rubro "${rubro.nombre}"`,
      entidad: 'Rubro',
      entidadId: rubro.id,
    });

    return this.mapearRespuesta(rubro);
  }

  async actualizar(
    id: string,
    dto: ActualizarRubroDto,
    usuarioActual: UsuarioAutenticado,
  ): Promise<RespuestaRubroDto> {
    await this.obtenerRubroOFallar(id);

    const rubro = await this.ejecutarOMapearConflicto(() =>
      this.rubrosRepositorio.actualizar(id, {
        nombre: dto.nombre?.trim(),
        activo: dto.activo,
      }),
    );

    await this.auditoriaService.registrar({
      usuarioId: usuarioActual.id,
      usuarioEmail: usuarioActual.email,
      accion: ACCIONES_AUDITORIA.ACTUALIZAR_RUBRO,
      descripcion: `Actualizó el rubro "${rubro.nombre}"`,
      entidad: 'Rubro',
      entidadId: rubro.id,
    });

    return this.mapearRespuesta(rubro);
  }

  async eliminar(id: string, usuarioActual: UsuarioAutenticado): Promise<void> {
    const rubro = await this.obtenerRubroOFallar(id);

    const solicitudesAsociadas =
      await this.rubrosRepositorio.contarSolicitudesAsociadas(id);

    if (solicitudesAsociadas > 0) {
      throw new UnprocessableEntityException({
        error: 'RUBRO_CON_ORDENES_ASOCIADAS',
        mensaje:
          'No se puede eliminar el rubro porque tiene órdenes de compra asociadas',
      });
    }

    await this.rubrosRepositorio.eliminar(id);

    await this.auditoriaService.registrar({
      usuarioId: usuarioActual.id,
      usuarioEmail: usuarioActual.email,
      accion: ACCIONES_AUDITORIA.ELIMINAR_RUBRO,
      descripcion: `Eliminó el rubro "${rubro.nombre}"`,
      entidad: 'Rubro',
      entidadId: rubro.id,
    });
  }

  private async obtenerRubroOFallar(id: string): Promise<RubroModel> {
    const rubro = await this.rubrosRepositorio.buscarPorId(id);

    if (!rubro) {
      throw new NotFoundException({
        error: 'RUBRO_NO_ENCONTRADO',
        mensaje: 'No existe un rubro con ese ID',
      });
    }

    return rubro;
  }

  private async ejecutarOMapearConflicto(
    operacion: () => Promise<RubroModel>,
  ): Promise<RubroModel> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_RESTRICCION_UNICA
      ) {
        throw new ConflictException({
          error: 'RUBRO_YA_EXISTE',
          mensaje: 'Ya existe un rubro con ese nombre',
        });
      }

      throw error;
    }
  }

  private mapearRespuesta(rubro: RubroModel): RespuestaRubroDto {
    return {
      id: rubro.id,
      nombre: rubro.nombre,
      activo: rubro.activo,
    };
  }
}
