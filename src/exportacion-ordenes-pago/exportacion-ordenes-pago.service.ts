import { Inject, Injectable } from '@nestjs/common';
import { ORDENES_PAGO_REPOSITORIO } from '../ordenes-pago/interfaces/ordenes-pago-repositorio.interface';
import type { IOrdenesPagoRepositorio } from '../ordenes-pago/interfaces/ordenes-pago-repositorio.interface';
import { construirExcelOrdenesPago } from './construir-excel-ordenes-pago';
import { mapearFilaOrdenPago } from './fila-orden-pago';

export interface ArchivoExcel {
  buffer: Buffer;
  nombreArchivo: string;
}

@Injectable()
export class ExportacionOrdenesPagoService {
  constructor(
    @Inject(ORDENES_PAGO_REPOSITORIO)
    private readonly ordenesPagoRepositorio: IOrdenesPagoRepositorio,
  ) {}

  // Genera el Excel con todas las OP vigentes (sin borradores ni anuladas). Es de
  // solo lectura: no cambia estados ni dispara eventos.
  async generarExcelOrdenesPago(): Promise<ArchivoExcel> {
    const ordenes = await this.ordenesPagoRepositorio.buscarParaExportar();
    const filas = ordenes.map(mapearFilaOrdenPago);
    const buffer = await construirExcelOrdenesPago(filas);
    return { buffer, nombreArchivo: `ordenes-pago-${fechaArchivo()}.xlsx` };
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
