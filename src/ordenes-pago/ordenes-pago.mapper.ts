import { OrdenPagoModel } from '../../generated/prisma/models';
import { RespuestaOrdenPagoDto } from './dtos/respuesta-orden-pago.dto';

export function mapearRespuestaOrdenPago(
  orden: OrdenPagoModel,
): RespuestaOrdenPagoDto {
  return {
    id: orden.id,
    numero: orden.numero,
    tipo: orden.tipo,
    fecha: orden.fecha,
    solicitanteId: orden.solicitanteId,
    sectorId: orden.sectorId,
    proveedorId: orden.proveedorId,
    clienteId: orden.clienteId,
    proyectoId: orden.proyectoId,
    tareaId: orden.tareaId,
    cotizacionId: orden.cotizacionId,
    ordenCompraId: orden.ordenCompraId,
    moneda: orden.moneda,
    monto: orden.monto.toString(),
    concepto: orden.concepto,
    formaPago: orden.formaPago,
    pagaIva: orden.pagaIva,
    ivaIncluido: orden.ivaIncluido,
    observaciones: orden.observaciones,
    facturaPdfRuta: orden.facturaPdfRuta,
    estado: orden.estado,
  };
}
