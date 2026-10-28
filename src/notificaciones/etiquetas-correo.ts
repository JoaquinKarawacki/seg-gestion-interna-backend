// Etiquetas y formateadores legibles para los cuerpos de los mails (OC y OP).
// Espejan los textos de la UI (lib/ordenes-*/presentacion.ts del frontend).
import {
  EstadoOC,
  EstadoOP,
  FormaPago,
  TipoCuentaBancaria,
  TipoOC,
} from '../../generated/prisma/enums';

export const ETIQUETAS_TIPO: Record<TipoOC, string> = {
  ARTICULO: 'Artículo',
  SERVICIO: 'Servicio',
};

export const ETIQUETAS_TIPO_CUENTA: Record<TipoCuentaBancaria, string> = {
  CAJA_AHORRO: 'Caja de ahorro',
  CUENTA_CORRIENTE: 'Cuenta corriente',
  EXTERIOR: 'Cuenta exterior',
};

export const ETIQUETAS_FORMA_PAGO: Record<FormaPago, string> = {
  CONTADO_CONTRA_ENTREGA: 'Contado contra entrega',
  TARJETA_CREDITO: 'Tarjeta de crédito',
  DIFERIDO: 'Diferido',
  GIRO_RED_COBRANZA: 'Giro / red de cobranza',
  TRANSFERENCIA_BANCARIA: 'Transferencia bancaria',
};

export const ETIQUETAS_ESTADO_OC: Record<EstadoOC, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  ANULADO: 'Anulado',
};

export const ETIQUETAS_ESTADO_OP: Record<EstadoOP, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  EN_CONSULTA: 'En consulta',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  PAGO_OBSERVADO: 'Pago observado',
  PAGADO: 'Pagado',
  ANULADO: 'Anulado',
};

export function etiquetaSiNo(valor: boolean): string {
  return valor ? 'Sí' : 'No';
}

export function formatearFechaCorreo(fecha: Date): string {
  return new Intl.DateTimeFormat('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(fecha);
}
