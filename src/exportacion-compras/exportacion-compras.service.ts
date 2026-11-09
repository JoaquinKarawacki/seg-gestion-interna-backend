import { Inject, Injectable } from '@nestjs/common';
import { ORDENES_COMPRA_REPOSITORIO } from '../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from '../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import { construirExcelCompras } from './construir-excel-compras';
import { mapearFilaCompra } from './fila-compra';

export interface ArchivoExcel {
  buffer: Buffer;
  nombreArchivo: string;
}

@Injectable()
export class ExportacionComprasService {
  constructor(
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
  ) {}

  // Genera el Excel con todas las OC vigentes (sin borradores ni anuladas). Es de
  // solo lectura: no cambia estados ni dispara eventos.
  async generarExcelOrdenesCompra(): Promise<ArchivoExcel> {
    const ordenes = await this.ordenesCompraRepositorio.buscarParaExportar();
    const filas = ordenes.map(mapearFilaCompra);
    const buffer = await construirExcelCompras(filas);
    return { buffer, nombreArchivo: `ordenes-compra-${fechaArchivo()}.xlsx` };
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
