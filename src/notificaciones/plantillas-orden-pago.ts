import { EstadoOP, FormaPago } from '../../generated/prisma/enums';
import type { EventoOrdenPagoEstadoCambiado } from '../ordenes-pago/eventos/orden-pago-estado-cambiado.evento';
import type { OrdenPagoDetalle } from '../ordenes-pago/interfaces/ordenes-pago-repositorio.interface';
import {
  construirBoton,
  construirCuerpo,
  DatoCorreo,
  formatearMontoCorreo,
} from './plantilla-base';
import {
  ETIQUETAS_ESTADO_OP,
  ETIQUETAS_FORMA_PAGO,
  ETIQUETAS_TIPO,
  ETIQUETAS_TIPO_CUENTA,
  etiquetaSiNo,
  formatearFechaCorreo,
} from './etiquetas-correo';

export type TipoDestinatario = 'SOLICITANTE' | 'ENCARGADO_SECTOR' | 'ROL_PAGOS';

export interface PlantillaNotificacion {
  destinatarios: TipoDestinatario[];
  asunto: string;
  cuerpo: string;
}

export function obtenerPlantilla(
  evento: EventoOrdenPagoEstadoCambiado,
  op: OrdenPagoDetalle,
  baseUrl = '',
): PlantillaNotificacion | null {
  const numero = evento.numero;
  const motivoTexto = evento.motivo ? ` Motivo: ${evento.motivo}.` : '';
  const proyecto = op.proyecto;
  const estadoLabel = ETIQUETAS_ESTADO_OP[evento.estadoNuevo];
  const titulo = `Orden de pago #${numero}`;

  // Toda OP nace de una OC (que tiene proyecto). El fallback sin proyecto cubre
  // OPs viejas sueltas.
  const asunto = proyecto
    ? `${proyecto.codigoInversion} - ${proyecto.nombre} - ${proyecto.cliente?.nombre ?? '—'} - ` +
      `Orden de pago #${numero} · ${estadoLabel}`
    : `Orden de pago #${numero} · ${estadoLabel}`;

  const datos: DatoCorreo[] = [];
  if (proyecto) {
    datos.push({
      etiqueta: 'Proyecto',
      valor: `${proyecto.codigoInversion} - ${proyecto.nombre}`,
    });
    datos.push({ etiqueta: 'Cliente', valor: proyecto.cliente?.nombre ?? '—' });
  }
  datos.push({ etiqueta: 'Proveedor', valor: op.proveedor.nombre });
  datos.push({ etiqueta: 'Sector', valor: op.sector.nombre });
  datos.push({ etiqueta: 'Tipo', valor: ETIQUETAS_TIPO[op.tipo] });
  datos.push({
    etiqueta: 'Forma de pago',
    valor: ETIQUETAS_FORMA_PAGO[op.formaPago],
  });
  datos.push({ etiqueta: 'Fecha', valor: formatearFechaCorreo(op.fecha) });
  datos.push({
    etiqueta: 'Monto',
    valor: formatearMontoCorreo(op.monto.toString(), op.moneda),
  });
  datos.push({ etiqueta: '¿Paga IVA?', valor: etiquetaSiNo(op.pagaIva) });
  datos.push({ etiqueta: 'Concepto', valor: op.concepto });
  if (op.ordenCompra) {
    datos.push({
      etiqueta: 'Orden de compra',
      valor: `#${op.ordenCompra.numero}`,
    });
  }
  datos.push({ etiqueta: 'Estado', valor: estadoLabel });
  datos.push({ etiqueta: 'Solicitante', valor: op.solicitante.email });
  if (op.observaciones) {
    datos.push({ etiqueta: 'Observaciones', valor: op.observaciones });
  }

  const boton = construirBoton(
    baseUrl,
    `/ordenes-pago/${evento.ordenPagoId}`,
    'Ver orden de pago',
  );

  // Datos bancarios del proveedor para que el rol PAGOS pueda hacer la
  // transferencia desde el propio mail. Solo tienen sentido cuando la forma de
  // pago es transferencia bancaria; si al proveedor le faltan (texto vacío), se
  // avisa en lugar de mostrar datos en blanco.
  const esTransferencia = op.formaPago === FormaPago.TRANSFERENCIA_BANCARIA;

  function datosBancariosProveedor(): DatoCorreo[] {
    const banco = op.proveedor.banco?.trim() ?? '';
    const numeroCuenta = op.proveedor.numeroCuenta?.trim() ?? '';
    if (!banco || !numeroCuenta) {
      return [
        {
          etiqueta: 'Datos bancarios',
          valor:
            'Faltan los datos bancarios de este proveedor. Completalos en la sección Proveedores.',
        },
      ];
    }
    return [
      { etiqueta: 'Banco', valor: banco },
      {
        etiqueta: 'Tipo de cuenta',
        valor: ETIQUETAS_TIPO_CUENTA[op.proveedor.tipoCuenta],
      },
      { etiqueta: 'Número de cuenta', valor: numeroCuenta },
    ];
  }

  function armar(
    destinatarios: TipoDestinatario[],
    intro: string,
  ): PlantillaNotificacion {
    // El bloque bancario va únicamente en el mail que recibe el rol PAGOS (el de
    // "aprobada, lista para pago"), no en los avisos a solicitante/encargado.
    const datosCuerpo =
      esTransferencia && destinatarios.includes('ROL_PAGOS')
        ? [...datos, ...datosBancariosProveedor()]
        : datos;
    return {
      destinatarios,
      asunto,
      cuerpo: construirCuerpo({ titulo, intro, datos: datosCuerpo, boton }),
    };
  }

  switch (evento.estadoNuevo) {
    case EstadoOP.PENDIENTE:
      return armar(
        ['ENCARGADO_SECTOR'],
        'Tenés una orden de pago pendiente de tu aprobación.',
      );
    case EstadoOP.EN_CONSULTA:
      return armar(
        ['SOLICITANTE'],
        'El encargado dejó una consulta sobre la orden de pago.',
      );
    case EstadoOP.APROBADO:
      return evento.estadoAnterior === EstadoOP.PAGO_OBSERVADO
        ? armar(
            ['SOLICITANTE', 'ENCARGADO_SECTOR'],
            `Se resolvió la observación de pago de la orden de pago.${motivoTexto}`,
          )
        : armar(
            ['ROL_PAGOS'],
            'La orden de pago fue aprobada y está lista para pago.',
          );
    case EstadoOP.RECHAZADO:
      return armar(
        ['SOLICITANTE'],
        `La orden de pago fue rechazada.${motivoTexto}`,
      );
    case EstadoOP.PAGO_OBSERVADO:
      return armar(
        ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        `Se observó el pago de la orden de pago.${motivoTexto}`,
      );
    case EstadoOP.PAGADO:
      return armar(
        ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        'Se confirmó el pago de la orden de pago.',
      );
    case EstadoOP.ANULADO:
      return armar(
        ['SOLICITANTE', 'ENCARGADO_SECTOR'],
        `La orden de pago fue anulada.${motivoTexto}`,
      );
    default:
      return null;
  }
}
