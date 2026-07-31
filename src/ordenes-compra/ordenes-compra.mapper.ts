import { OrdenCompraModel } from '../../generated/prisma/models';
import { RespuestaOrdenCompraDto } from './dtos/respuesta-orden-compra.dto';

export function mapearRespuestaOrdenCompra(
  orden: OrdenCompraModel,
): RespuestaOrdenCompraDto {
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
