import {
  ETIQUETAS_ESTADO_OP,
  ETIQUETAS_FORMA_PAGO,
  ETIQUETAS_TIPO,
  etiquetaSiNo,
} from '../notificaciones/etiquetas-correo';
import type { OrdenPagoExportable } from '../ordenes-pago/interfaces/ordenes-pago-repositorio.interface';

// Una fila del Excel del listado de órdenes de pago, con los valores ya
// resueltos para mostrar (etiquetas legibles, monto numérico). No depende de
// exceljs: así se puede testear el armado de datos por separado de la
// generación del archivo.
export interface FilaOrdenPago {
  numero: number;
  fecha: Date;
  estado: string;
  proveedor: string;
  concepto: string;
  monto: number;
  moneda: string;
  pagaIva: string;
  formaPago: string;
  tipo: string;
  proyecto: string;
  cliente: string;
  sector: string;
  solicitante: string;
  ordenCompra: string;
}

export function mapearFilaOrdenPago(orden: OrdenPagoExportable): FilaOrdenPago {
  return {
    numero: orden.numero,
    fecha: orden.fecha,
    estado: ETIQUETAS_ESTADO_OP[orden.estado],
    proveedor: orden.proveedor.nombre,
    concepto: orden.concepto,
    monto: orden.monto.toNumber(),
    moneda: orden.moneda,
    pagaIva: etiquetaSiNo(orden.pagaIva),
    formaPago: ETIQUETAS_FORMA_PAGO[orden.formaPago],
    tipo: ETIQUETAS_TIPO[orden.tipo],
    proyecto: orden.proyecto
      ? `${orden.proyecto.codigoInversion} - ${orden.proyecto.nombre}`
      : 'No asignado',
    cliente: orden.proyecto?.cliente?.nombre ?? '—',
    sector: orden.sector.nombre,
    solicitante: orden.solicitante.nombre,
    ordenCompra: orden.ordenCompra ? `#${orden.ordenCompra.numero}` : '—',
  };
}
