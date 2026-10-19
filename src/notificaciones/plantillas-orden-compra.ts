import { EstadoOC } from '../../generated/prisma/enums';
import type { EventoOrdenCompraEstadoCambiado } from '../ordenes-compra/eventos/orden-compra-estado-cambiado.evento';
import type { OrdenCompraDetalle } from '../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import {
  construirBoton,
  construirCuerpo,
  DatoCorreo,
  formatearMontoCorreo,
} from './plantilla-base';
import {
  ETIQUETAS_ESTADO_OC,
  ETIQUETAS_TIPO,
  etiquetaSiNo,
  formatearFechaCorreo,
} from './etiquetas-correo';

export type TipoDestinatarioSolicitud = 'SOLICITANTE' | 'ENCARGADO_SECTOR';

export interface PlantillaNotificacionSolicitud {
  destinatarios: TipoDestinatarioSolicitud[];
  asunto: string;
  cuerpo: string;
}

// Una plantilla por transición: un solo mail por acción, con la OC completa en el
// cuerpo. El asunto identifica el proyecto, cliente y la OC (+ el estado nuevo).
export function obtenerPlantillaSolicitud(
  evento: EventoOrdenCompraEstadoCambiado,
  oc: OrdenCompraDetalle,
  baseUrl = '',
): PlantillaNotificacionSolicitud | null {
  const numero = evento.numero;
  const motivoTexto = evento.motivo ? ` Motivo: ${evento.motivo}.` : '';
  const proyecto = oc.proyecto;
  const clienteNombre = proyecto.cliente?.nombre ?? '—';
  const titulo = `Orden de compra #${numero}`;

  const asunto =
    `#${proyecto.numero} - ${proyecto.nombre} - ${clienteNombre} - ` +
    `Orden de compra #${numero} · ${ETIQUETAS_ESTADO_OC[evento.estadoNuevo]}`;

  const datos: DatoCorreo[] = [
    { etiqueta: 'Proyecto', valor: `#${proyecto.numero} - ${proyecto.nombre}` },
    { etiqueta: 'Cliente', valor: clienteNombre },
    { etiqueta: 'Proveedor', valor: oc.proveedor.nombre },
    { etiqueta: 'Sector', valor: oc.sector.nombre },
    { etiqueta: 'Tipo', valor: ETIQUETAS_TIPO[oc.tipo] },
    { etiqueta: 'Rubro', valor: oc.rubro.nombre },
    { etiqueta: 'Fecha', valor: formatearFechaCorreo(oc.fecha) },
    {
      etiqueta: 'Monto',
      valor: formatearMontoCorreo(oc.monto.toString(), oc.moneda),
    },
    { etiqueta: '¿Paga IVA?', valor: etiquetaSiNo(oc.pagaIva) },
    { etiqueta: 'Concepto', valor: oc.concepto },
    { etiqueta: 'Estado', valor: ETIQUETAS_ESTADO_OC[oc.estado] },
    { etiqueta: 'Solicitante', valor: oc.solicitante.email },
  ];
  if (oc.observaciones) {
    datos.push({ etiqueta: 'Observaciones', valor: oc.observaciones });
  }

  const boton = construirBoton(
    baseUrl,
    `/ordenes-compra/${evento.ordenCompraId}`,
    'Ver orden de compra',
  );

  function armar(
    destinatarios: TipoDestinatarioSolicitud[],
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
        'Tenés una orden de compra pendiente de tu aprobación.',
      );
    case EstadoOC.APROBADO:
      return armar(
        ['SOLICITANTE'],
        'La orden de compra fue aprobada. Ya podés generar la orden de pago correspondiente.',
      );
    case EstadoOC.RECHAZADO:
      return armar(
        ['SOLICITANTE'],
        `La orden de compra fue rechazada.${motivoTexto}`,
      );
    case EstadoOC.ANULADO:
      return armar(
        ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        `La orden de compra fue anulada.${motivoTexto}`,
      );
    default:
      return null;
  }
}
