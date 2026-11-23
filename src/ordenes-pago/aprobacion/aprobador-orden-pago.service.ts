import { Inject, Injectable } from '@nestjs/common';
import { RolUsuario } from '../../../generated/prisma/enums';
import type { UsuarioAutenticado } from '../../comun/interfaces/usuario-autenticado.interface';
import { tieneRol } from '../../comun/autorizacion/roles.util';
import { ORDENES_COMPRA_REPOSITORIO } from '../../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from '../../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';

// Lo mínimo de una OP que hace falta para decidir quién la aprueba.
export interface OrdenPagoParaAprobar {
  sectorId: string;
  ordenCompraId: string | null;
}

/**
 * Quién puede aprobar/rechazar (y poner en consulta) una Orden de Pago.
 *
 * Regla: la aprueba quien aprobó su Orden de Compra (el "aprobador asignado"),
 * o un suplente del sector. Otros encargados del sector, no.
 *
 * Se vuelve a la regla del sector (cualquier encargado o suplente) cuando no hay
 * aprobador asignado: OP sin OC de origen (históricas), o quien aprobó la OC ya
 * no puede aprobar en ese sector (inactivo, o dejó de ser encargado/suplente).
 */
@Injectable()
export class AprobadorOrdenPagoService {
  constructor(
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
  ) {}

  // Id de quien aprobó la OC, solo si todavía puede aprobar en el sector de la
  // OP; null si corresponde la regla del sector.
  async resolverAprobadorAsignadoId(
    orden: OrdenPagoParaAprobar,
  ): Promise<string | null> {
    if (!orden.ordenCompraId) {
      return null;
    }

    const aprobador = await this.ordenesCompraRepositorio.buscarUltimoAprobador(
      orden.ordenCompraId,
    );

    if (!aprobador || !aprobador.activo) {
      return null;
    }

    const sigueEnElSector =
      aprobador.sectoresEncargado.some((s) => s.id === orden.sectorId) ||
      aprobador.sectoresSuplente.some((s) => s.id === orden.sectorId);

    return sigueEnElSector ? aprobador.id : null;
  }

  async puedeAprobar(
    orden: OrdenPagoParaAprobar,
    usuario: UsuarioAutenticado,
  ): Promise<boolean> {
    if (usuario.sectoresSuplente.includes(orden.sectorId)) {
      return true;
    }

    const aprobadorAsignadoId = await this.resolverAprobadorAsignadoId(orden);

    if (aprobadorAsignadoId) {
      return usuario.id === aprobadorAsignadoId;
    }

    return (
      tieneRol(usuario, RolUsuario.ENCARGADO) &&
      usuario.sectoresEncargado.includes(orden.sectorId)
    );
  }
}
