import { Prisma } from '../../generated/prisma/client';
import type { CotizacionExportable } from '../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import {
  ETIQUETAS_CATEGORIA,
  ETIQUETAS_ESTADO_OC,
  etiquetaSiNo,
} from '../notificaciones/etiquetas-correo';

// Una fila del Excel del listado de cotizaciones, con los valores ya resueltos
// para mostrar. No depende de exceljs: así se puede testear el armado de datos
// por separado de la generación del archivo.
export interface FilaCotizacion {
  fecha: Date;
  ordenCompra: string;
  estadoOrdenCompra: string;
  categoria: string;
  proyecto: string;
  cliente: string;
  proveedor: string;
  sector: string;
  montoTotal: number;
  moneda: string;
  ivaIncluido: string;
  comprometido: number;
  saldo: number;
}

export function mapearFilaCotizacion(
  cotizacion: CotizacionExportable,
): FilaCotizacion {
  // Comprometido = suma de las OP no anuladas de la cotización (el repositorio
  // ya trae solo esas). Se suma en Decimal para no arrastrar error de float.
  const comprometido = cotizacion.ordenesPago.reduce(
    (total, orden) => total.add(orden.monto),
    new Prisma.Decimal(0),
  );
  const saldo = cotizacion.montoTotal.sub(comprometido);
  const ordenCompra = cotizacion.ordenCompra;

  return {
    fecha: cotizacion.creadoEn,
    ordenCompra: ordenCompra ? `#${ordenCompra.numero}` : '—',
    estadoOrdenCompra: ordenCompra
      ? ETIQUETAS_ESTADO_OC[ordenCompra.estado]
      : '—',
    categoria: ordenCompra ? ETIQUETAS_CATEGORIA[ordenCompra.categoria] : '—',
    proyecto: cotizacion.proyecto
      ? `${cotizacion.proyecto.codigoInversion} - ${cotizacion.proyecto.nombre}`
      : 'No asignado',
    cliente: cotizacion.proyecto?.cliente?.nombre ?? '—',
    proveedor: cotizacion.proveedor.nombre,
    sector: ordenCompra?.sector.nombre ?? '—',
    montoTotal: cotizacion.montoTotal.toNumber(),
    moneda: cotizacion.moneda,
    ivaIncluido: etiquetaSiNo(cotizacion.ivaIncluido),
    comprometido: comprometido.toNumber(),
    saldo: saldo.toNumber(),
  };
}
