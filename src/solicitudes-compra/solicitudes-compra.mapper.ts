import { SolicitudCompraModel } from '../../generated/prisma/models';
import { RespuestaSolicitudCompraDto } from './dtos/respuesta-solicitud-compra.dto';

export function mapearRespuestaSolicitudCompra(
  solicitud: SolicitudCompraModel,
): RespuestaSolicitudCompraDto {
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
