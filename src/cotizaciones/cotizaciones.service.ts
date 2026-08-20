import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { CotizacionModel } from '../../generated/prisma/models';
import { ALMACENAMIENTO } from '../almacenamiento/puertos/almacenamiento.puerto';
import type {
  ArchivoAlmacenado,
  IAlmacenamiento,
} from '../almacenamiento/puertos/almacenamiento.puerto';
import { ACCIONES_AUDITORIA } from '../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { CrearCotizacionDto } from './dtos/crear-cotizacion.dto';
import { RespuestaCotizacionDto } from './dtos/respuesta-cotizacion.dto';
import { COTIZACIONES_REPOSITORIO } from './interfaces/cotizaciones-repositorio.interface';
import type { ICotizacionesRepositorio } from './interfaces/cotizaciones-repositorio.interface';

const CODIGO_REFERENCIA_INVALIDA = 'P2003';
const CARPETA_ARCHIVOS = 'cotizaciones';

export interface ArchivoDescargado {
  buffer: Buffer;
  nombreArchivo: string;
}

@Injectable()
export class CotizacionesService {
  constructor(
    @Inject(COTIZACIONES_REPOSITORIO)
    private readonly cotizacionesRepositorio: ICotizacionesRepositorio,
    @Inject(ALMACENAMIENTO)
    private readonly almacenamiento: IAlmacenamiento,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async buscarPorId(id: string): Promise<RespuestaCotizacionDto> {
    const cotizacion = await this.obtenerCotizacionOFallar(id);
    return this.mapearRespuesta(cotizacion);
  }

  async listarPorProyecto(
    proyectoId: string,
  ): Promise<RespuestaCotizacionDto[]> {
    const cotizaciones =
      await this.cotizacionesRepositorio.buscarPorProyecto(proyectoId);
    return cotizaciones.map((cotizacion) => this.mapearRespuesta(cotizacion));
  }

  async listarPorTarea(tareaId: string): Promise<RespuestaCotizacionDto[]> {
    const cotizaciones =
      await this.cotizacionesRepositorio.buscarPorTarea(tareaId);
    return cotizaciones.map((cotizacion) => this.mapearRespuesta(cotizacion));
  }

  async buscarActivaPorTarea(tareaId: string): Promise<RespuestaCotizacionDto> {
    const cotizacion =
      await this.cotizacionesRepositorio.buscarActivaPorTarea(tareaId);

    if (!cotizacion) {
      throw new NotFoundException({
        error: 'COTIZACION_ACTIVA_NO_ENCONTRADA',
        mensaje: 'La tarea no tiene una cotización activa',
      });
    }

    return this.mapearRespuesta(cotizacion);
  }

  async crear(
    dto: CrearCotizacionDto,
    usuarioActual: UsuarioAutenticado,
    archivo?: Express.Multer.File,
  ): Promise<RespuestaCotizacionDto> {
    const archivoGuardado = archivo
      ? await this.almacenamiento.guardar(
          archivo.buffer,
          archivo.originalname,
          CARPETA_ARCHIVOS,
        )
      : null;

    try {
      const cotizacion = await this.ejecutarOMapearReferenciaInvalida(() =>
        this.cotizacionesRepositorio.crearNuevaVersion({
          proyectoId: dto.proyectoId,
          tareaId: dto.tareaId,
          proveedorId: dto.proveedorId,
          montoTotal: new Prisma.Decimal(dto.montoTotal),
          moneda: dto.moneda,
          archivoPdfRuta: archivoGuardado?.referencia ?? null,
        }),
      );

      await this.auditoriaService.registrar({
        usuarioId: usuarioActual.id,
        usuarioEmail: usuarioActual.email,
        accion: ACCIONES_AUDITORIA.CREAR_COTIZACION,
        descripcion: `Creó una cotización de ${cotizacion.montoTotal.toString()} ${cotizacion.moneda} para el proyecto ${cotizacion.proyectoId}`,
        entidad: 'Cotizacion',
        entidadId: cotizacion.id,
      });

      return this.mapearRespuesta(cotizacion);
    } catch (error) {
      await this.revertirArchivoGuardado(archivoGuardado);
      throw error;
    }
  }

  async descargarArchivo(id: string): Promise<ArchivoDescargado> {
    const cotizacion = await this.obtenerCotizacionOFallar(id);

    if (!cotizacion.archivoPdfRuta) {
      throw new NotFoundException({
        error: 'COTIZACION_SIN_ARCHIVO',
        mensaje: 'Esta cotización no tiene un archivo PDF adjunto',
      });
    }

    const buffer = await this.almacenamiento.leer(cotizacion.archivoPdfRuta);
    return { buffer, nombreArchivo: `cotizacion-${cotizacion.id}.pdf` };
  }

  private async obtenerCotizacionOFallar(id: string): Promise<CotizacionModel> {
    const cotizacion = await this.cotizacionesRepositorio.buscarPorId(id);

    if (!cotizacion) {
      throw new NotFoundException({
        error: 'COTIZACION_NO_ENCONTRADA',
        mensaje: 'No existe una cotización con ese ID',
      });
    }

    return cotizacion;
  }

  private async revertirArchivoGuardado(
    archivoGuardado: ArchivoAlmacenado | null,
  ): Promise<void> {
    if (archivoGuardado) {
      await this.almacenamiento.eliminar(archivoGuardado.referencia);
    }
  }

  private async ejecutarOMapearReferenciaInvalida(
    operacion: () => Promise<CotizacionModel>,
  ): Promise<CotizacionModel> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_REFERENCIA_INVALIDA
      ) {
        throw new NotFoundException({
          error: 'PROYECTO_O_PROVEEDOR_NO_ENCONTRADO',
          mensaje: 'El proyecto o el proveedor indicado no existen',
        });
      }

      throw error;
    }
  }

  private mapearRespuesta(cotizacion: CotizacionModel): RespuestaCotizacionDto {
    return {
      id: cotizacion.id,
      proyectoId: cotizacion.proyectoId,
      tareaId: cotizacion.tareaId,
      proveedorId: cotizacion.proveedorId,
      montoTotal: cotizacion.montoTotal.toString(),
      moneda: cotizacion.moneda,
      estado: cotizacion.estado,
      archivoPdfRuta: cotizacion.archivoPdfRuta,
    };
  }
}
