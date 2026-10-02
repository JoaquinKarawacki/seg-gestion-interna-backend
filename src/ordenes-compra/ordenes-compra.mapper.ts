import { OrdenCompraModel } from '../../generated/prisma/models';
import { RespuestaOrdenCompraDto } from './dtos/respuesta-orden-compra.dto';

export function mapearRespuestaOrdenCompra(
  solicitud: OrdenCompraModel,
): RespuestaOrdenCompraDto {
  return {
    id: solicitud.id,
    numero: solicitud.numero,
    tipo: solicitud.tipo,
    fecha: solicitud.fecha,
    solicitanteId: solicitud.solicitanteId,
    sectorId: solicitud.sectorId,
    proveedorId: solicitud.proveedorId,
    clienteId: solicitud.clienteId,
    proyectoId: solicitud.proyectoId,
    rubroId: solicitud.rubroId,
    tareaId: solicitud.tareaId,
    cotizacionId: solicitud.cotizacionId,
    moneda: solicitud.moneda,
    monto: solicitud.monto.toString(),
    concepto: solicitud.concepto,
    pagaIva: solicitud.pagaIva,
    ivaIncluido: solicitud.ivaIncluido,
    observaciones: solicitud.observaciones,
    archivoPdfRuta: solicitud.archivoPdfRuta,
    estado: solicitud.estado,
    esPagoUnico: solicitud.esPagoUnico,
    pagoUnicoFormaPago: solicitud.pagoUnicoFormaPago,
  };
}
