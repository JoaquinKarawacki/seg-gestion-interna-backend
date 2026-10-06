import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoOC, RolUsuario } from '../../../generated/prisma/enums';
import type { OrdenCompraModel } from '../../../generated/prisma/models';
import { ACCIONES_AUDITORIA } from '../../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../../comun/interfaces/usuario-autenticado.interface';
import { RespuestaOrdenCompraDto } from '../dtos/respuesta-orden-compra.dto';
import { EVENTOS_ORDEN_COMPRA } from '../eventos/eventos.constantes';
import type { EventoOrdenCompraEstadoCambiado } from '../eventos/orden-compra-estado-cambiado.evento';
import { ORDENES_COMPRA_REPOSITORIO } from '../interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from '../interfaces/ordenes-compra-repositorio.interface';
import { mapearRespuestaOrdenCompra } from '../ordenes-compra.mapper';
import { RespuestaHistorialOrdenCompraDto } from './dtos/respuesta-historial-orden-compra.dto';
import { TRANSICIONES_VALIDAS_ORDEN_COMPRA } from './transiciones-orden-compra';

@Injectable()
export class OrdenesCompraAprobacionService {
  constructor(
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
    private readonly emisorEventos: EventEmitter2,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async enviar(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    const resultado = await this.ejecutarTransicion(
      solicitud,
      EstadoOC.PENDIENTE,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.ENVIAR_ORDEN_COMPRA,
      'Envió a aprobación',
      resultado,
      usuario,
    );

    return resultado;
  }

  async aprobar(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    this.validarEncargadoDelSector(solicitud, usuario);
    const resultado = await this.ejecutarTransicion(
      solicitud,
      EstadoOC.APROBADO,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.APROBAR_ORDEN_COMPRA,
      'Aprobó',
      resultado,
      usuario,
    );

    return resultado;
  }

  async rechazar(
    id: string,
    usuario: UsuarioAutenticado,
    motivo: string,
  ): Promise<RespuestaOrdenCompraDto> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    this.validarEncargadoDelSector(solicitud, usuario);
    const resultado = await this.ejecutarTransicion(
      solicitud,
      EstadoOC.RECHAZADO,
      usuario,
      motivo,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.RECHAZAR_ORDEN_COMPRA,
      'Rechazó',
      resultado,
      usuario,
    );

    return resultado;
  }

  async anular(
    id: string,
    usuario: UsuarioAutenticado,
    motivo: string,
  ): Promise<RespuestaOrdenCompraDto> {
    const solicitud = await this.obtenerSolicitudOFallar(id);

    if (usuario.rol === RolUsuario.ENCARGADO) {
      this.validarEncargadoDelSector(solicitud, usuario);
    }

    const resultado = await this.ejecutarTransicion(
      solicitud,
      EstadoOC.ANULADO,
      usuario,
      motivo,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.ANULAR_ORDEN_COMPRA,
      'Anuló',
      resultado,
      usuario,
    );

    return resultado;
  }

  async listarHistorial(
    id: string,
  ): Promise<RespuestaHistorialOrdenCompraDto[]> {
    await this.obtenerSolicitudOFallar(id);
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
    solicitud: OrdenCompraModel,
    usuario: UsuarioAutenticado,
  ): void {
    if (!usuario.sectoresEncargado.includes(solicitud.sectorId)) {
      throw new ForbiddenException({
        error: 'SIN_PERMISO_SOBRE_SECTOR',
        mensaje: 'No tenés permiso sobre el sector de esta orden de compra',
      });
    }
  }

  private async ejecutarTransicion(
    solicitud: OrdenCompraModel,
    estadoNuevo: EstadoOC,
    usuario: UsuarioAutenticado,
    motivo?: string,
  ): Promise<RespuestaOrdenCompraDto> {
    const transicionesPermitidas =
      TRANSICIONES_VALIDAS_ORDEN_COMPRA[solicitud.estado];

    if (!transicionesPermitidas.includes(estadoNuevo)) {
      throw new ConflictException({
        error: 'TRANSICION_INVALIDA',
        mensaje: `No se puede pasar de ${solicitud.estado} a ${estadoNuevo}`,
      });
    }

    const estadoAnterior = solicitud.estado;

    const solicitudActualizada =
      await this.ordenesCompraRepositorio.cambiarEstado(
        solicitud.id,
        estadoAnterior,
        estadoNuevo,
        usuario.id,
        motivo,
      );

    if (!solicitudActualizada) {
      throw new ConflictException({
        error: 'TRANSICION_INVALIDA',
        mensaje:
          'La orden de compra fue modificada por otra acción mientras tanto — volvé a revisarla antes de reintentar',
      });
    }

    this.emitirCambioDeEstado(
      solicitudActualizada,
      estadoAnterior,
      usuario.id,
      motivo,
    );

    return mapearRespuestaOrdenCompra(solicitudActualizada);
  }

  private emitirCambioDeEstado(
    solicitud: OrdenCompraModel,
    estadoAnterior: EstadoOC,
    usuarioId: string,
    motivo?: string,
  ): void {
    const evento: EventoOrdenCompraEstadoCambiado = {
      ordenCompraId: solicitud.id,
      numero: solicitud.numero,
      estadoAnterior,
      estadoNuevo: solicitud.estado,
      sectorId: solicitud.sectorId,
      solicitanteId: solicitud.solicitanteId,
      usuarioId,
      motivo: motivo ?? null,
      monto: solicitud.monto.toString(),
      moneda: solicitud.moneda,
      concepto: solicitud.concepto,
    };

    this.emisorEventos.emit(EVENTOS_ORDEN_COMPRA.ESTADO_CAMBIADO, evento);
  }

  private async registrarAuditoriaTransicion(
    accion: string,
    verbo: string,
    resultado: RespuestaOrdenCompraDto,
    usuario: UsuarioAutenticado,
  ): Promise<void> {
    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      accion,
      descripcion: `${verbo} la orden de compra #${resultado.numero}`,
      entidad: 'OrdenCompra',
      entidadId: resultado.id,
    });
  }

  private async obtenerSolicitudOFallar(id: string): Promise<OrdenCompraModel> {
    const solicitud = await this.ordenesCompraRepositorio.buscarPorId(id);

    if (!solicitud) {
      throw new NotFoundException({
        error: 'ORDEN_COMPRA_NO_ENCONTRADA',
        mensaje: 'No existe una orden de compra con ese ID',
      });
    }

    return solicitud;
  }
}
