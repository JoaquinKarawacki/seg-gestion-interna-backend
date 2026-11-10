import {
  ETIQUETAS_CATEGORIA,
  ETIQUETAS_ESTADO_OC,
} from '../notificaciones/etiquetas-correo';
import type { OrdenCompraExportable } from '../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';

// Una fila del Excel de órdenes de compra, con los valores ya resueltos para
// mostrar (etiquetas legibles, monto numérico). No depende de exceljs: así se
// puede testear el armado de datos por separado de la generación del archivo.
export interface FilaCompra {
  numero: number;
  categoria: string;
  proyecto: string;
  proveedor: string;
  sector: string;
  monto: number;
  moneda: string;
  estado: string;
}

export function mapearFilaCompra(orden: OrdenCompraExportable): FilaCompra {
  return {
    numero: orden.numero,
    categoria: ETIQUETAS_CATEGORIA[orden.categoria],
    proyecto: orden.proyecto
      ? `${orden.proyecto.codigoInversion} - ${orden.proyecto.nombre}`
      : 'No asignado',
    proveedor: orden.proveedor.nombre,
    sector: orden.sector.nombre,
    monto: orden.monto.toNumber(),
    moneda: orden.moneda,
    estado: ETIQUETAS_ESTADO_OC[orden.estado],
  };
}
