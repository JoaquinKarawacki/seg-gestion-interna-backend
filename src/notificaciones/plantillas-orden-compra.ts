import { EstadoOC } from '../../generated/prisma/enums';
import type { EventoOrdenCompraEstadoCambiado } from '../ordenes-compra/eventos/orden-compra-estado-cambiado.evento';

export type TipoDestinatario = 'SOLICITANTE' | 'ENCARGADO_SECTOR' | 'ROL_PAGOS';

export interface PlantillaNotificacion {
  destinatarios: TipoDestinatario[];
  asunto: string;
  cuerpo: string;
}

export function obtenerPlantilla(
  evento: EventoOrdenCompraEstadoCambiado,
): PlantillaNotificacion | null {
  const numeroOC = evento.numero;
  const motivoHtml = evento.motivo ? ` Motivo: ${evento.motivo}.` : '';

  switch (evento.estadoNuevo) {
    case EstadoOC.PENDIENTE:
      return {
        destinatarios: ['ENCARGADO_SECTOR'],
        asunto: `OC #${numeroOC}: pendiente de tu aprobación`,
        cuerpo: `<p>La orden de compra #${numeroOC} está pendiente de tu aprobación.</p>`,
      };
    case EstadoOC.EN_CONSULTA:
      return {
        destinatarios: ['SOLICITANTE'],
        asunto: `OC #${numeroOC}: tenés una consulta pendiente`,
        cuerpo: `<p>El encargado dejó una consulta sobre la orden de compra #${numeroOC}.</p>`,
      };
    case EstadoOC.APROBADO:
      return evento.estadoAnterior === EstadoOC.PAGO_OBSERVADO
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
    case EstadoOC.RECHAZADO:
      return {
        destinatarios: ['SOLICITANTE'],
        asunto: `OC #${numeroOC}: rechazada`,
        cuerpo: `<p>La orden de compra #${numeroOC} fue rechazada.${motivoHtml}</p>`,
      };
    case EstadoOC.PAGO_OBSERVADO:
      return {
        destinatarios: ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        asunto: `OC #${numeroOC}: pago observado`,
        cuerpo: `<p>Se observó el pago de la orden de compra #${numeroOC}.${motivoHtml}</p>`,
      };
    case EstadoOC.PAGADO:
      return {
        destinatarios: ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        asunto: `OC #${numeroOC}: pago confirmado`,
        cuerpo: `<p>Se confirmó el pago de la orden de compra #${numeroOC}.</p>`,
      };
    case EstadoOC.ANULADO:
      return {
        destinatarios: ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        asunto: `OC #${numeroOC}: anulada`,
        cuerpo: `<p>La orden de compra #${numeroOC} fue anulada.${motivoHtml}</p>`,
      };
    default:
      return null;
  }
}
