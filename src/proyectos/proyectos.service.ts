import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { ProyectoModel } from '../../generated/prisma/models';
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
  ) {}

  async listar(): Promise<RespuestaProyectoDto[]> {
    const proyectos = await this.proyectosRepositorio.buscarTodos();
    return proyectos.map((proyecto) => this.mapearRespuesta(proyecto));
  }

  async buscarPorId(id: string): Promise<RespuestaProyectoDto> {
    const proyecto = await this.obtenerProyectoOFallar(id);
    return this.mapearRespuesta(proyecto);
  }

  async crear(dto: CrearProyectoDto): Promise<RespuestaProyectoDto> {
    const proyecto = await this.ejecutarOMapearReferenciaInvalida(() =>
      this.proyectosRepositorio.crear(dto),
    );

    return this.mapearRespuesta(proyecto);
  }

  async actualizar(
    id: string,
    dto: ActualizarProyectoDto,
  ): Promise<RespuestaProyectoDto> {
    await this.obtenerProyectoOFallar(id);

    const proyecto = await this.ejecutarOMapearReferenciaInvalida(() =>
      this.proyectosRepositorio.actualizar(id, dto),
    );

    return this.mapearRespuesta(proyecto);
  }

  async eliminar(id: string): Promise<void> {
    await this.obtenerProyectoOFallar(id);

    const [cotizacionesAsociadas, tareasAsociadas, ordenesCompraAsociadas] =
      await Promise.all([
        this.proyectosRepositorio.contarCotizacionesAsociadas(id),
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
        throw new NotFoundException({
          error: 'CLIENTE_NO_ENCONTRADO',
          mensaje: 'No existe un cliente con ese ID',
        });
      }

      throw error;
    }
  }

  private mapearRespuesta(proyecto: ProyectoModel): RespuestaProyectoDto {
    return {
      id: proyecto.id,
      nombre: proyecto.nombre,
      clienteId: proyecto.clienteId,
    };
  }
}
