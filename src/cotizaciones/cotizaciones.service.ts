import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { CotizacionModel } from '../../generated/prisma/models';
import { ALMACENAMIENTO } from '../almacenamiento/puertos/almacenamiento.puerto';
import type {
  ArchivoAlmacenado,
  IAlmacenamiento,
} from '../almacenamiento/puertos/almacenamiento.puerto';
import { CrearCotizacionDto } from './dtos/crear-cotizacion.dto';
import { RespuestaCotizacionDto } from './dtos/respuesta-cotizacion.dto';
import { COTIZACIONES_REPOSITORIO } from './interfaces/cotizaciones-repositorio.interface';
import type { ICotizacionesRepositorio } from './interfaces/cotizaciones-repositorio.interface';

const CODIGO_REFERENCIA_INVALIDA = 'P2003';
const CARPETA_ARCHIVOS = 'cotizaciones';

@Injectable()
export class CotizacionesService {
  constructor(
    @Inject(COTIZACIONES_REPOSITORIO)
    private readonly cotizacionesRepositorio: ICotizacionesRepositorio,
    @Inject(ALMACENAMIENTO)
    private readonly almacenamiento: IAlmacenamiento,
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

  async buscarActivaPorProyecto(
    proyectoId: string,
  ): Promise<RespuestaCotizacionDto> {
    const cotizacion =
      await this.cotizacionesRepositorio.buscarActivaPorProyecto(proyectoId);

    if (!cotizacion) {
      throw new NotFoundException({
        error: 'COTIZACION_ACTIVA_NO_ENCONTRADA',
        mensaje: 'El proyecto no tiene ninguna cotización activa',
      });
    }

    return this.mapearRespuesta(cotizacion);
  }

  async crear(
    dto: CrearCotizacionDto,
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
          proveedorId: dto.proveedorId,
          montoTotal: new Prisma.Decimal(dto.montoTotal),
          moneda: dto.moneda,
          archivoPdfRuta: archivoGuardado?.referencia ?? null,
        }),
      );

      return this.mapearRespuesta(cotizacion);
    } catch (error) {
      await this.revertirArchivoGuardado(archivoGuardado);
      throw error;
    }
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
      proveedorId: cotizacion.proveedorId,
      montoTotal: cotizacion.montoTotal.toString(),
      moneda: cotizacion.moneda,
      estado: cotizacion.estado,
      archivoPdfRuta: cotizacion.archivoPdfRuta,
    };
  }
}
