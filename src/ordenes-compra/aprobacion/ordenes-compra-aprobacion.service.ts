import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoOC, RolUsuario } from '../../../generated/prisma/enums';
import type { OrdenCompraModel } from '../../../generated/prisma/models';
import { UsuarioAutenticado } from '../../comun/interfaces/usuario-autenticado.interface';
import { RespuestaOrdenCompraDto } from '../dtos/respuesta-orden-compra.dto';
import { ORDENES_COMPRA_REPOSITORIO } from '../interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from '../interfaces/ordenes-compra-repositorio.interface';
import { mapearRespuestaOrdenCompra } from '../ordenes-compra.mapper';
import { RespuestaHistorialEstadoOCDto } from './dtos/respuesta-historial-estado-oc.dto';
import { TRANSICIONES_VALIDAS_OC } from './transiciones-oc';

@Injectable()
export class OrdenesCompraAprobacionService {
  constructor(
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
  ) {}

  async enviar(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    return this.ejecutarTransicion(orden, EstadoOC.PENDIENTE, usuario);
  }

  async aprobar(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    this.validarEncargadoDelSector(orden, usuario);
    return this.ejecutarTransicion(orden, EstadoOC.APROBADO, usuario);
  }

  async rechazar(
    id: string,
    usuario: UsuarioAutenticado,
    motivo: string,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    this.validarEncargadoDelSector(orden, usuario);
    return this.ejecutarTransicion(orden, EstadoOC.RECHAZADO, usuario, motivo);
  }

  async observarPago(
    id: string,
    usuario: UsuarioAutenticado,
    motivo: string,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    return this.ejecutarTransicion(
      orden,
      EstadoOC.PAGO_OBSERVADO,
      usuario,
      motivo,
    );
  }

  async resolverObservacion(
    id: string,
    usuario: UsuarioAutenticado,
    motivo?: string,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    return this.ejecutarTransicion(orden, EstadoOC.APROBADO, usuario, motivo);
  }

  async confirmarPago(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    return this.ejecutarTransicion(orden, EstadoOC.PAGADO, usuario);
  }

  async anular(
    id: string,
    usuario: UsuarioAutenticado,
    motivo: string,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);

    if (usuario.rol === RolUsuario.ENCARGADO) {
      this.validarEncargadoDelSector(orden, usuario);
    }

    return this.ejecutarTransicion(orden, EstadoOC.ANULADO, usuario, motivo);
  }

  async listarHistorial(id: string): Promise<RespuestaHistorialEstadoOCDto[]> {
    await this.obtenerOrdenOFallar(id);
    const historial = await this.ordenesCompraRepositorio.buscarHistorial(id);

    return historial.map((entrada) => ({
      id: entrada.id,
      estadoAnterior: entrada.estadoAnterior,
      estadoNuevo: entrada.estadoNuevo,
      usuarioId: entrada.usuarioId,
      motivo: entrada.motivo,
      creadoEn: entrada.creadoEn,
    }));
  }

  private validarEncargadoDelSector(
    orden: OrdenCompraModel,
    usuario: UsuarioAutenticado,
  ): void {
    if (usuario.sectorId !== orden.sectorId) {
      throw new ForbiddenException({
        error: 'SIN_PERMISO_SOBRE_SECTOR',
        mensaje: 'No tenés permiso sobre el sector de esta orden de compra',
      });
    }
  }

  private async ejecutarTransicion(
    orden: OrdenCompraModel,
    estadoNuevo: EstadoOC,
    usuario: UsuarioAutenticado,
    motivo?: string,
  ): Promise<RespuestaOrdenCompraDto> {
    const transicionesPermitidas = TRANSICIONES_VALIDAS_OC[orden.estado];

    if (!transicionesPermitidas.includes(estadoNuevo)) {
      throw new ConflictException({
        error: 'TRANSICION_INVALIDA',
        mensaje: `No se puede pasar de ${orden.estado} a ${estadoNuevo}`,
      });
    }

    const ordenActualizada = await this.ordenesCompraRepositorio.cambiarEstado(
      orden.id,
      estadoNuevo,
      usuario.id,
      motivo,
    );

    return mapearRespuestaOrdenCompra(ordenActualizada);
  }

  private async obtenerOrdenOFallar(id: string): Promise<OrdenCompraModel> {
    const orden = await this.ordenesCompraRepositorio.buscarPorId(id);

    if (!orden) {
      throw new NotFoundException({
        error: 'ORDEN_COMPRA_NO_ENCONTRADA',
        mensaje: 'No existe una orden de compra con ese ID',
      });
    }

    return orden;
  }
}
