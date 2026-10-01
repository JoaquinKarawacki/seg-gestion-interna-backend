import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CotizacionModel } from '../../generated/prisma/models';
import { ALMACENAMIENTO } from '../almacenamiento/puertos/almacenamiento.puerto';
import type { IAlmacenamiento } from '../almacenamiento/puertos/almacenamiento.puerto';
import { RespuestaCotizacionBusquedaDto } from './dtos/respuesta-cotizacion-busqueda.dto';
import { RespuestaCotizacionDto } from './dtos/respuesta-cotizacion.dto';
import { COTIZACIONES_REPOSITORIO } from './interfaces/cotizaciones-repositorio.interface';
import type {
  CotizacionConRelaciones,
  ICotizacionesRepositorio,
} from './interfaces/cotizaciones-repositorio.interface';

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

  // Listado global enriquecido para buscar/reutilizar cotizaciones anteriores.
  async listarParaBusqueda(): Promise<RespuestaCotizacionBusquedaDto[]> {
    const cotizaciones =
      await this.cotizacionesRepositorio.buscarTodasParaBusqueda();
    return cotizaciones.map((cotizacion) => this.mapearBusqueda(cotizacion));
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

  private mapearRespuesta(cotizacion: CotizacionModel): RespuestaCotizacionDto {
    return {
      id: cotizacion.id,
      proyectoId: cotizacion.proyectoId,
      tareaId: cotizacion.tareaId,
      proveedorId: cotizacion.proveedorId,
      montoTotal: cotizacion.montoTotal.toString(),
      moneda: cotizacion.moneda,
      ivaIncluido: cotizacion.ivaIncluido,
      estado: cotizacion.estado,
      archivoPdfRuta: cotizacion.archivoPdfRuta,
    };
  }

  private mapearBusqueda(
    cotizacion: CotizacionConRelaciones,
  ): RespuestaCotizacionBusquedaDto {
    return {
      id: cotizacion.id,
      proyectoId: cotizacion.proyectoId,
      proyectoNombre: cotizacion.proyecto.nombre,
      proveedorId: cotizacion.proveedorId,
      proveedorNombre: cotizacion.proveedor.nombre,
      tareaId: cotizacion.tareaId,
      rubroNombre: cotizacion.tarea.nombre,
      montoTotal: cotizacion.montoTotal.toString(),
      moneda: cotizacion.moneda,
      ivaIncluido: cotizacion.ivaIncluido,
      estado: cotizacion.estado,
      archivoPdfRuta: cotizacion.archivoPdfRuta,
      creadoEn: cotizacion.creadoEn,
    };
  }
}
