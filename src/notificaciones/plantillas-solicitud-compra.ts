import { EstadoSolicitudCompra } from '../../generated/prisma/enums';
import type { EventoSolicitudCompraEstadoCambiado } from '../solicitudes-compra/eventos/solicitud-compra-estado-cambiado.evento';

export type TipoDestinatarioSolicitud = 'SOLICITANTE' | 'ENCARGADO_SECTOR';

export interface PlantillaNotificacionSolicitud {
  destinatarios: TipoDestinatarioSolicitud[];
  asunto: string;
  cuerpo: string;
}

// Una plantilla por transición: un solo mail por acción, sin atomizar.
export function obtenerPlantillaSolicitud(
  evento: EventoSolicitudCompraEstadoCambiado,
): PlantillaNotificacionSolicitud | null {
  const numero = evento.numero;
  const motivoHtml = evento.motivo ? ` Motivo: ${evento.motivo}.` : '';

  switch (evento.estadoNuevo) {
    case EstadoSolicitudCompra.PENDIENTE:
      return {
        destinatarios: ['ENCARGADO_SECTOR'],
        asunto: `Orden de compra #${numero}: pendiente de tu aprobación`,
        cuerpo: `<p>La orden de compra #${numero} está pendiente de tu aprobación.</p>`,
      };
    case EstadoSolicitudCompra.APROBADO:
      return {
        destinatarios: ['SOLICITANTE'],
        asunto: `Orden de compra #${numero}: aprobada`,
        cuerpo: `<p>La orden de compra #${numero} fue aprobada. Ya podés generar la orden de pago correspondiente.</p>`,
      };
    case EstadoSolicitudCompra.RECHAZADO:
      return {
        destinatarios: ['SOLICITANTE'],
        asunto: `Orden de compra #${numero}: rechazada`,
        cuerpo: `<p>La orden de compra #${numero} fue rechazada.${motivoHtml}</p>`,
      };
    case EstadoSolicitudCompra.ANULADO:
      return {
        destinatarios: ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        asunto: `Orden de compra #${numero}: anulada`,
        cuerpo: `<p>La orden de compra #${numero} fue anulada.${motivoHtml}</p>`,
      };
    default:
      return null;
  }
}
