import { EstadoOP } from '../../generated/prisma/enums';
import {
  ETIQUETAS_FORMA_PAGO,
  ETIQUETAS_TIPO,
  ETIQUETAS_TIPO_CUENTA,
} from '../notificaciones/etiquetas-correo';
import type { OrdenPagoParaPago } from '../ordenes-pago/interfaces/ordenes-pago-repositorio.interface';

// Una fila del Excel de pagos, ya con los valores listos para mostrar (etiquetas
// legibles, montos numéricos, textos resueltos). No depende de exceljs: así se
// puede testear el armado de datos por separado de la generación del archivo.
export interface FilaPago {
  numero: number;
  fecha: Date;
  proveedor: string;
  rut: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  // Marca si al proveedor le faltan banco o número de cuenta, para que el Excel
  // los resalte en vez de mostrar celdas en blanco.
  faltanDatosBancarios: boolean;
  monto: number;
  moneda: string;
  formaPago: string;
  tipo: string;
  concepto: string;
  proyecto: string;
  cliente: string;
  sector: string;
  solicitante: string;
  aprobadoPor: string;
  ordenCompra: string;
}

// "Aprobado por" = quién hizo la aprobación del encargado sobre ESTA OP: la
// transición PENDIENTE -> APROBADO en su historial (la más reciente, por si se
// reprocesó). No se confunde con PAGO_OBSERVADO -> APROBADO, que es la
// resolución de una observación de pago, no la aprobación original.
function aprobadorEncargado(orden: OrdenPagoParaPago): string {
  const aprobacion = orden.historialEstados
    .filter(
      (historial) =>
        historial.estadoAnterior === EstadoOP.PENDIENTE &&
        historial.estadoNuevo === EstadoOP.APROBADO,
    )
    .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime())[0];
  return aprobacion ? aprobacion.usuario.nombre : '—';
}

export function mapearFilaPago(orden: OrdenPagoParaPago): FilaPago {
  const banco = orden.proveedor.banco?.trim() ?? '';
  const numeroCuenta = orden.proveedor.numeroCuenta?.trim() ?? '';

  return {
    numero: orden.numero,
    fecha: orden.fecha,
    proveedor: orden.proveedor.nombre,
    rut: orden.proveedor.rut,
    banco,
    tipoCuenta: ETIQUETAS_TIPO_CUENTA[orden.proveedor.tipoCuenta],
    numeroCuenta,
    faltanDatosBancarios: banco === '' || numeroCuenta === '',
    monto: orden.monto.toNumber(),
    moneda: orden.moneda,
    formaPago: ETIQUETAS_FORMA_PAGO[orden.formaPago],
    tipo: ETIQUETAS_TIPO[orden.tipo],
    concepto: orden.concepto,
    proyecto: orden.proyecto
      ? `#${orden.proyecto.numero} - ${orden.proyecto.nombre}`
      : '—',
    cliente: orden.proyecto?.cliente?.nombre ?? '—',
    sector: orden.sector.nombre,
    solicitante: orden.solicitante.nombre,
    aprobadoPor: aprobadorEncargado(orden),
    ordenCompra: orden.ordenCompra ? `#${orden.ordenCompra.numero}` : '—',
  };
}
