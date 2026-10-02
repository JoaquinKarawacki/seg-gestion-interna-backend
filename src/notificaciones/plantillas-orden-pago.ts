import { EstadoOP } from '../../generated/prisma/enums';
import type { EventoOrdenPagoEstadoCambiado } from '../ordenes-pago/eventos/orden-pago-estado-cambiado.evento';

export type TipoDestinatario = 'SOLICITANTE' | 'ENCARGADO_SECTOR' | 'ROL_PAGOS';

export interface PlantillaNotificacion {
  destinatarios: TipoDestinatario[];
  asunto: string;
  cuerpo: string;
}

export function obtenerPlantilla(
  evento: EventoOrdenPagoEstadoCambiado,
): PlantillaNotificacion | null {
  const numeroOC = evento.numero;
  const motivoHtml = evento.motivo ? ` Motivo: ${evento.motivo}.` : '';

  switch (evento.estadoNuevo) {
    case EstadoOP.PENDIENTE:
      return {
        destinatarios: ['ENCARGADO_SECTOR'],
        asunto: `OC #${numeroOC}: pendiente de tu aprobación`,
        cuerpo: `<p>La orden de compra #${numeroOC} está pendiente de tu aprobación.</p>`,
      };
    case EstadoOP.EN_CONSULTA:
      return {
        destinatarios: ['SOLICITANTE'],
        asunto: `OC #${numeroOC}: tenés una consulta pendiente`,
        cuerpo: `<p>El encargado dejó una consulta sobre la orden de compra #${numeroOC}.</p>`,
      };
    case EstadoOP.APROBADO:
      return evento.estadoAnterior === EstadoOP.PAGO_OBSERVADO
        ? {
            destinatarios: ['SOLICITANTE', 'ENCARGADO_SECTOR'],
            asunto: `OC #${numeroOC}: observación de pago resuelta`,
            cuerpo: `<p>Se resolvió la observación de pago de la orden de compra #${numeroOC}.${motivoHtml}</p>`,
          }
        : {
            destinatarios: ['ROL_PAGOS'],
            asunto: `OC #${numeroOC}: aprobada, lista para pago`,
            cuerpo: `<p>La orden de compra #${numeroOC} fue aprobada y está lista para pago.</p>`,
          };
    case EstadoOP.RECHAZADO:
      return {
        destinatarios: ['SOLICITANTE'],
        asunto: `OC #${numeroOC}: rechazada`,
        cuerpo: `<p>La orden de compra #${numeroOC} fue rechazada.${motivoHtml}</p>`,
      };
    case EstadoOP.PAGO_OBSERVADO:
      return {
        destinatarios: ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        asunto: `OC #${numeroOC}: pago observado`,
        cuerpo: `<p>Se observó el pago de la orden de compra #${numeroOC}.${motivoHtml}</p>`,
      };
    case EstadoOP.PAGADO:
      return {
        destinatarios: ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        asunto: `OC #${numeroOC}: pago confirmado`,
        cuerpo: `<p>Se confirmó el pago de la orden de compra #${numeroOC}.</p>`,
      };
    case EstadoOP.ANULADO:
      return {
        destinatarios: ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        asunto: `OC #${numeroOC}: anulada`,
        cuerpo: `<p>La orden de compra #${numeroOC} fue anulada.${motivoHtml}</p>`,
      };
    default:
      return null;
  }
}
