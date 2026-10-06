import { EstadoOC } from '../../generated/prisma/enums';
import type { EventoOrdenCompraEstadoCambiado } from '../ordenes-compra/eventos/orden-compra-estado-cambiado.evento';
import {
  construirBoton,
  construirCuerpo,
  DatoCorreo,
  formatearMontoCorreo,
} from './plantilla-base';

export type TipoDestinatarioSolicitud = 'SOLICITANTE' | 'ENCARGADO_SECTOR';

export interface PlantillaNotificacionSolicitud {
  destinatarios: TipoDestinatarioSolicitud[];
  asunto: string;
  cuerpo: string;
}

// Una plantilla por transición: un solo mail por acción, sin atomizar.
export function obtenerPlantillaSolicitud(
  evento: EventoOrdenCompraEstadoCambiado,
  baseUrl = '',
): PlantillaNotificacionSolicitud | null {
  const numero = evento.numero;
  const motivoTexto = evento.motivo ? ` Motivo: ${evento.motivo}.` : '';
  const titulo = `Orden de compra #${numero}`;
  const datos: DatoCorreo[] = [
    {
      etiqueta: 'Monto',
      valor: formatearMontoCorreo(evento.monto, evento.moneda),
    },
    { etiqueta: 'Concepto', valor: evento.concepto },
  ];
  const boton = construirBoton(
    baseUrl,
    `/ordenes-compra/${evento.ordenCompraId}`,
    'Ver orden de compra',
  );

  function armar(
    destinatarios: TipoDestinatarioSolicitud[],
    asunto: string,
    intro: string,
  ): PlantillaNotificacionSolicitud {
    return {
      destinatarios,
      asunto,
      cuerpo: construirCuerpo({ titulo, intro, datos, boton }),
    };
  }

  switch (evento.estadoNuevo) {
    case EstadoOC.PENDIENTE:
      return armar(
        ['ENCARGADO_SECTOR'],
        `Orden de compra #${numero}: pendiente de tu aprobación`,
        'Tenés una orden de compra pendiente de tu aprobación.',
      );
    case EstadoOC.APROBADO:
      return armar(
        ['SOLICITANTE'],
        `Orden de compra #${numero}: aprobada`,
        'La orden de compra fue aprobada. Ya podés generar la orden de pago correspondiente.',
      );
    case EstadoOC.RECHAZADO:
      return armar(
        ['SOLICITANTE'],
        `Orden de compra #${numero}: rechazada`,
        `La orden de compra fue rechazada.${motivoTexto}`,
      );
    case EstadoOC.ANULADO:
      return armar(
        ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        `Orden de compra #${numero}: anulada`,
        `La orden de compra fue anulada.${motivoTexto}`,
      );
    default:
      return null;
  }
}
