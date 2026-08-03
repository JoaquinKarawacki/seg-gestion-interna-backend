import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { TareaModel } from '../../generated/prisma/models';
import { ACCIONES_AUDITORIA } from '../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { ActualizarTareaDto } from './dtos/actualizar-tarea.dto';
import { CrearTareaDto } from './dtos/crear-tarea.dto';
import { RespuestaTareaDto } from './dtos/respuesta-tarea.dto';
import { TAREAS_REPOSITORIO } from './interfaces/tareas-repositorio.interface';
import type { ITareasRepositorio } from './interfaces/tareas-repositorio.interface';

const CODIGO_REFERENCIA_INVALIDA = 'P2003';

@Injectable()
export class TareasService {
  constructor(
    @Inject(TAREAS_REPOSITORIO)
    private readonly tareasRepositorio: ITareasRepositorio,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async listar(): Promise<RespuestaTareaDto[]> {
    const tareas = await this.tareasRepositorio.buscarTodos();
    return tareas.map((tarea) => this.mapearRespuesta(tarea));
  }

  async listarPorProyecto(proyectoId: string): Promise<RespuestaTareaDto[]> {
    const tareas = await this.tareasRepositorio.buscarPorProyecto(proyectoId);
    return tareas.map((tarea) => this.mapearRespuesta(tarea));
  }

  async buscarPorId(id: string): Promise<RespuestaTareaDto> {
    const tarea = await this.obtenerTareaOFallar(id);
    return this.mapearRespuesta(tarea);
  }

  async crear(
    dto: CrearTareaDto,
    usuarioActual: UsuarioAutenticado,
  ): Promise<RespuestaTareaDto> {
    const tarea = await this.ejecutarOMapearReferenciaInvalida(() =>
      this.tareasRepositorio.crear(dto),
    );

    await this.auditoriaService.registrar({
      usuarioId: usuarioActual.id,
      usuarioEmail: usuarioActual.email,
      accion: ACCIONES_AUDITORIA.CREAR_TAREA,
      descripcion: `Creó la tarea "${tarea.nombre}"`,
      entidad: 'Tarea',
      entidadId: tarea.id,
    });

    return this.mapearRespuesta(tarea);
  }

  async actualizar(
    id: string,
    dto: ActualizarTareaDto,
    usuarioActual: UsuarioAutenticado,
  ): Promise<RespuestaTareaDto> {
    await this.obtenerTareaOFallar(id);
    const tarea = await this.tareasRepositorio.actualizar(id, dto);

    await this.auditoriaService.registrar({
      usuarioId: usuarioActual.id,
      usuarioEmail: usuarioActual.email,
      accion: ACCIONES_AUDITORIA.ACTUALIZAR_TAREA,
      descripcion: `Actualizó la tarea "${tarea.nombre}"`,
      entidad: 'Tarea',
      entidadId: tarea.id,
    });

    return this.mapearRespuesta(tarea);
  }

  async eliminar(id: string, usuarioActual: UsuarioAutenticado): Promise<void> {
    const tarea = await this.obtenerTareaOFallar(id);

    const [cotizacionesAsociadas, ordenesCompraAsociadas] = await Promise.all([
      this.tareasRepositorio.contarCotizacionesAsociadas(id),
      this.tareasRepositorio.contarOrdenesCompraAsociadas(id),
    ]);

    if (cotizacionesAsociadas > 0 || ordenesCompraAsociadas > 0) {
      throw new UnprocessableEntityException({
        error: 'TAREA_CON_REGISTROS_ASOCIADOS',
        mensaje:
          'No se puede eliminar la tarea porque tiene cotizaciones u órdenes de compra asociadas',
      });
    }

    await this.tareasRepositorio.eliminar(id);

    await this.auditoriaService.registrar({
      usuarioId: usuarioActual.id,
      usuarioEmail: usuarioActual.email,
      accion: ACCIONES_AUDITORIA.ELIMINAR_TAREA,
      descripcion: `Eliminó la tarea "${tarea.nombre}"`,
      entidad: 'Tarea',
      entidadId: tarea.id,
    });
  }

  private async obtenerTareaOFallar(id: string): Promise<TareaModel> {
    const tarea = await this.tareasRepositorio.buscarPorId(id);

    if (!tarea) {
      throw new NotFoundException({
        error: 'TAREA_NO_ENCONTRADA',
        mensaje: 'No existe una tarea con ese ID',
      });
    }

    return tarea;
  }

  private async ejecutarOMapearReferenciaInvalida(
    operacion: () => Promise<TareaModel>,
  ): Promise<TareaModel> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_REFERENCIA_INVALIDA
      ) {
        throw new NotFoundException({
          error: 'PROYECTO_NO_ENCONTRADO',
          mensaje: 'No existe un proyecto con ese ID',
        });
      }

      throw error;
    }
  }

  private mapearRespuesta(tarea: TareaModel): RespuestaTareaDto {
    return {
      id: tarea.id,
      nombre: tarea.nombre,
      proyectoId: tarea.proyectoId,
    };
  }
}
