import { Inject, Injectable } from '@nestjs/common';
import { COTIZACIONES_REPOSITORIO } from '../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import type { ICotizacionesRepositorio } from '../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import { construirExcelCotizaciones } from './construir-excel-cotizaciones';
import { mapearFilaCotizacion } from './fila-cotizacion';

export interface ArchivoExcel {
  buffer: Buffer;
  nombreArchivo: string;
}

@Injectable()
export class ExportacionCotizacionesService {
  constructor(
    @Inject(COTIZACIONES_REPOSITORIO)
    private readonly cotizacionesRepositorio: ICotizacionesRepositorio,
  ) {}

  // Genera el Excel con todas las cotizaciones, con lo comprometido en OP y el
  // saldo. Es de solo lectura: no cambia estados ni dispara eventos.
  async generarExcelCotizaciones(): Promise<ArchivoExcel> {
    const cotizaciones =
      await this.cotizacionesRepositorio.buscarParaExportar();
    const filas = cotizaciones.map(mapearFilaCotizacion);
    const buffer = await construirExcelCotizaciones(filas);
    return { buffer, nombreArchivo: `cotizaciones-${fechaArchivo()}.xlsx` };
  }
}

// Fecha local (es-UY) en formato AAAA-MM-DD para el nombre del archivo.
function fechaArchivo(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}
