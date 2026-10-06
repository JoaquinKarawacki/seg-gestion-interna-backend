import { EstadoOP } from '../../generated/prisma/enums';
import type { EventoOrdenPagoEstadoCambiado } from '../ordenes-pago/eventos/orden-pago-estado-cambiado.evento';
import {
  construirBoton,
  construirCuerpo,
  DatoCorreo,
  formatearMontoCorreo,
} from './plantilla-base';

export type TipoDestinatario = 'SOLICITANTE' | 'ENCARGADO_SECTOR' | 'ROL_PAGOS';

export interface PlantillaNotificacion {
  destinatarios: TipoDestinatario[];
  asunto: string;
  cuerpo: string;
}

export function obtenerPlantilla(
  evento: EventoOrdenPagoEstadoCambiado,
  baseUrl = '',
): PlantillaNotificacion | null {
  const numero = evento.numero;
  const motivoTexto = evento.motivo ? ` Motivo: ${evento.motivo}.` : '';
  const titulo = `Orden de pago #${numero}`;
  const datos: DatoCorreo[] = [
    {
      etiqueta: 'Monto',
      valor: formatearMontoCorreo(evento.monto, evento.moneda),
    },
    { etiqueta: 'Concepto', valor: evento.concepto },
  ];
  const boton = construirBoton(
    baseUrl,
    `/ordenes-pago/${evento.ordenPagoId}`,
    'Ver orden de pago',
  );

  function armar(
    destinatarios: TipoDestinatario[],
    asunto: string,
    intro: string,
  ): PlantillaNotificacion {
    return {
      destinatarios,
      asunto,
      cuerpo: construirCuerpo({ titulo, intro, datos, boton }),
    };
  }

  switch (evento.estadoNuevo) {
    case EstadoOP.PENDIENTE:
      return armar(
        ['ENCARGADO_SECTOR'],
        `Orden de pago #${numero}: pendiente de tu aprobación`,
        'Tenés una orden de pago pendiente de tu aprobación.',
      );
    case EstadoOP.EN_CONSULTA:
      return armar(
        ['SOLICITANTE'],
        `Orden de pago #${numero}: tenés una consulta pendiente`,
        'El encargado dejó una consulta sobre la orden de pago.',
      );
    case EstadoOP.APROBADO:
      return evento.estadoAnterior === EstadoOP.PAGO_OBSERVADO
        ? armar(
            ['SOLICITANTE', 'ENCARGADO_SECTOR'],
            `Orden de pago #${numero}: observación de pago resuelta`,
            `Se resolvió la observación de pago de la orden de pago.${motivoTexto}`,
          )
        : armar(
            ['ROL_PAGOS'],
            `Orden de pago #${numero}: aprobada, lista para pago`,
            'La orden de pago fue aprobada y está lista para pago.',
          );
    case EstadoOP.RECHAZADO:
      return armar(
        ['SOLICITANTE'],
        `Orden de pago #${numero}: rechazada`,
        `La orden de pago fue rechazada.${motivoTexto}`,
      );
    case EstadoOP.PAGO_OBSERVADO:
      return armar(
        ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        `Orden de pago #${numero}: pago observado`,
        `Se observó el pago de la orden de pago.${motivoTexto}`,
      );
    case EstadoOP.PAGADO:
      return armar(
        ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        `Orden de pago #${numero}: pago confirmado`,
        'Se confirmó el pago de la orden de pago.',
      );
    case EstadoOP.ANULADO:
      return armar(
        ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        `Orden de pago #${numero}: anulada`,
        `La orden de pago fue anulada.${motivoTexto}`,
      );
    default:
      return null;
  }
}
