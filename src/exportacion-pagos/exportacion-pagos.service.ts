import { Inject, Injectable } from '@nestjs/common';
import { ORDENES_PAGO_REPOSITORIO } from '../ordenes-pago/interfaces/ordenes-pago-repositorio.interface';
import type { IOrdenesPagoRepositorio } from '../ordenes-pago/interfaces/ordenes-pago-repositorio.interface';
import { construirExcelPagos } from './construir-excel-pagos';
import { mapearFilaPago } from './fila-pago';

export interface ArchivoExcel {
  buffer: Buffer;
  nombreArchivo: string;
}

@Injectable()
export class ExportacionPagosService {
  constructor(
    @Inject(ORDENES_PAGO_REPOSITORIO)
    private readonly ordenesPagoRepositorio: IOrdenesPagoRepositorio,
  ) {}

  // Genera el Excel con las OPs aprobadas listas para pagar. Es de solo lectura:
  // no cambia estados ni dispara eventos.
  async generarExcelPagosAprobados(): Promise<ArchivoExcel> {
    const ordenes = await this.ordenesPagoRepositorio.buscarAprobadasParaPago();
    const filas = ordenes.map(mapearFilaPago);
    const buffer = await construirExcelPagos(filas);
    return { buffer, nombreArchivo: `pagos-${fechaArchivo()}.xlsx` };
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
