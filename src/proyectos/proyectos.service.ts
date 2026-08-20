import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { ProyectoModel } from '../../generated/prisma/models';
import { ACCIONES_AUDITORIA } from '../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { ActualizarProyectoDto } from './dtos/actualizar-proyecto.dto';
import { CrearProyectoDto } from './dtos/crear-proyecto.dto';
import { RespuestaProyectoDto } from './dtos/respuesta-proyecto.dto';
import { PROYECTOS_REPOSITORIO } from './interfaces/proyectos-repositorio.interface';
import type { IProyectosRepositorio } from './interfaces/proyectos-repositorio.interface';

const CODIGO_REFERENCIA_INVALIDA = 'P2003';

@Injectable()
export class ProyectosService {
  constructor(
    @Inject(PROYECTOS_REPOSITORIO)
    private readonly proyectosRepositorio: IProyectosRepositorio,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async listar(): Promise<RespuestaProyectoDto[]> {
    const proyectos = await this.proyectosRepositorio.buscarTodos();
    return proyectos.map((proyecto) => this.mapearRespuesta(proyecto));
  }

  async buscarPorId(id: string): Promise<RespuestaProyectoDto> {
    const proyecto = await this.obtenerProyectoOFallar(id);
    return this.mapearRespuesta(proyecto);
  }

  async crear(
    dto: CrearProyectoDto,
    usuarioActual: UsuarioAutenticado,
  ): Promise<RespuestaProyectoDto> {
    const proyecto = await this.ejecutarOMapearReferenciaInvalida(() =>
      this.proyectosRepositorio.crear(dto),
    );

    await this.auditoriaService.registrar({
      usuarioId: usuarioActual.id,
      usuarioEmail: usuarioActual.email,
      accion: ACCIONES_AUDITORIA.CREAR_PROYECTO,
      descripcion: `Creó el proyecto "${proyecto.nombre}"`,
      entidad: 'Proyecto',
      entidadId: proyecto.id,
    });

    return this.mapearRespuesta(proyecto);
  }

  async actualizar(
    id: string,
    dto: ActualizarProyectoDto,
    usuarioActual: UsuarioAutenticado,
  ): Promise<RespuestaProyectoDto> {
    await this.obtenerProyectoOFallar(id);

    const proyecto = await this.ejecutarOMapearReferenciaInvalida(() =>
      this.proyectosRepositorio.actualizar(id, dto),
    );

    await this.auditoriaService.registrar({
      usuarioId: usuarioActual.id,
      usuarioEmail: usuarioActual.email,
      accion: ACCIONES_AUDITORIA.ACTUALIZAR_PROYECTO,
      descripcion: `Actualizó el proyecto "${proyecto.nombre}"`,
      entidad: 'Proyecto',
      entidadId: proyecto.id,
    });

    return this.mapearRespuesta(proyecto);
  }

  async recalcularCostoSeg(
    id: string,
    usuarioActual: UsuarioAutenticado,
  ): Promise<RespuestaProyectoDto> {
    await this.obtenerProyectoOFallar(id);

    const proyecto = await this.proyectosRepositorio.actualizar(id, {
      costoSegManual: null,
    });

    await this.auditoriaService.registrar({
      usuarioId: usuarioActual.id,
      usuarioEmail: usuarioActual.email,
      accion: ACCIONES_AUDITORIA.RECALCULAR_COSTO_SEG_PROYECTO,
      descripcion: `Volvió a calcular el costo SEG del proyecto "${proyecto.nombre}"`,
      entidad: 'Proyecto',
      entidadId: proyecto.id,
    });

    return this.mapearRespuesta(proyecto);
  }

  async eliminar(id: string, usuarioActual: UsuarioAutenticado): Promise<void> {
    const proyecto = await this.obtenerProyectoOFallar(id);

    const [
      cotizacionesAsociadas,
      propuestasInversionAsociadas,
      tareasAsociadas,
      ordenesCompraAsociadas,
    ] = await Promise.all([
      this.proyectosRepositorio.contarCotizacionesAsociadas(id),
      this.proyectosRepositorio.contarPropuestasInversionAsociadas(id),
      this.proyectosRepositorio.contarTareasAsociadas(id),
      this.proyectosRepositorio.contarOrdenesCompraAsociadas(id),
    ]);

    if (cotizacionesAsociadas > 0) {
      throw new UnprocessableEntityException({
        error: 'PROYECTO_CON_COTIZACIONES_ASOCIADAS',
        mensaje:
          'No se puede eliminar el proyecto porque tiene cotizaciones cargadas',
      });
    }

    if (propuestasInversionAsociadas > 0) {
      throw new UnprocessableEntityException({
        error: 'PROYECTO_CON_PROPUESTAS_INVERSION_ASOCIADAS',
        mensaje:
          'No se puede eliminar el proyecto porque tiene propuestas de inversión cargadas',
      });
    }

    if (tareasAsociadas > 0) {
      throw new UnprocessableEntityException({
        error: 'PROYECTO_CON_TAREAS_ASOCIADAS',
        mensaje:
          'No se puede eliminar el proyecto porque tiene tareas cargadas',
      });
    }

    if (ordenesCompraAsociadas > 0) {
      throw new UnprocessableEntityException({
        error: 'PROYECTO_CON_ORDENES_COMPRA_ASOCIADAS',
        mensaje:
          'No se puede eliminar el proyecto porque tiene órdenes de compra asociadas',
      });
    }

    await this.proyectosRepositorio.eliminar(id);

    await this.auditoriaService.registrar({
      usuarioId: usuarioActual.id,
      usuarioEmail: usuarioActual.email,
      accion: ACCIONES_AUDITORIA.ELIMINAR_PROYECTO,
      descripcion: `Eliminó el proyecto "${proyecto.nombre}"`,
      entidad: 'Proyecto',
      entidadId: proyecto.id,
    });
  }

  private async obtenerProyectoOFallar(id: string): Promise<ProyectoModel> {
    const proyecto = await this.proyectosRepositorio.buscarPorId(id);

    if (!proyecto) {
      throw new NotFoundException({
        error: 'PROYECTO_NO_ENCONTRADO',
        mensaje: 'No existe un proyecto con ese ID',
      });
    }

    return proyecto;
  }

  private async ejecutarOMapearReferenciaInvalida(
    operacion: () => Promise<ProyectoModel>,
  ): Promise<ProyectoModel> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_REFERENCIA_INVALIDA
      ) {
        if (this.esViolacionDeSectorId(error.meta)) {
          throw new NotFoundException({
            error: 'SECTOR_NO_ENCONTRADO',
            mensaje: 'No existe un sector con ese ID',
          });
        }

        throw new NotFoundException({
          error: 'CLIENTE_NO_ENCONTRADO',
          mensaje: 'No existe un cliente con ese ID',
        });
      }

      throw error;
    }
  }

  // Con el driver adapter de `pg`, el nombre de la constraint viola no viene en
  // `meta.field_name` (eso es del engine binario clásico) sino anidado en
  // `meta.driverAdapterError.cause.constraint.index` — confirmado inspeccionando
  // el error real (P2003) contra Postgres.
  private esViolacionDeSectorId(
    meta: Record<string, unknown> | undefined,
  ): boolean {
    const driverAdapterError = meta?.driverAdapterError;
    const cause =
      driverAdapterError && typeof driverAdapterError === 'object'
        ? (driverAdapterError as { cause?: unknown }).cause
        : undefined;
    const constraint =
      cause && typeof cause === 'object'
        ? (cause as { constraint?: unknown }).constraint
        : undefined;
    const indice =
      constraint && typeof constraint === 'object'
        ? (constraint as { index?: unknown }).index
        : undefined;

    return (
      typeof indice === 'string' && indice.toLowerCase().includes('sector')
    );
  }

  private mapearRespuesta(proyecto: ProyectoModel): RespuestaProyectoDto {
    return {
      id: proyecto.id,
      nombre: proyecto.nombre,
      clienteId: proyecto.clienteId,
      sectorId: proyecto.sectorId,
      costoSegManual: proyecto.costoSegManual?.toString() ?? null,
    };
  }
}
