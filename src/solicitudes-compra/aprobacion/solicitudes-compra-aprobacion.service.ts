import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EstadoSolicitudCompra,
  RolUsuario,
} from '../../../generated/prisma/enums';
import type { SolicitudCompraModel } from '../../../generated/prisma/models';
import { ACCIONES_AUDITORIA } from '../../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../../comun/interfaces/usuario-autenticado.interface';
import { RespuestaSolicitudCompraDto } from '../dtos/respuesta-solicitud-compra.dto';
import { EVENTOS_SOLICITUD_COMPRA } from '../eventos/eventos.constantes';
import type { EventoSolicitudCompraEstadoCambiado } from '../eventos/solicitud-compra-estado-cambiado.evento';
import { SOLICITUDES_COMPRA_REPOSITORIO } from '../interfaces/solicitudes-compra-repositorio.interface';
import type { ISolicitudesCompraRepositorio } from '../interfaces/solicitudes-compra-repositorio.interface';
import { mapearRespuestaSolicitudCompra } from '../solicitudes-compra.mapper';
import { RespuestaHistorialSolicitudCompraDto } from './dtos/respuesta-historial-solicitud-compra.dto';
import { TRANSICIONES_VALIDAS_SOLICITUD_COMPRA } from './transiciones-solicitud-compra';

@Injectable()
export class SolicitudesCompraAprobacionService {
  constructor(
    @Inject(SOLICITUDES_COMPRA_REPOSITORIO)
    private readonly solicitudesCompraRepositorio: ISolicitudesCompraRepositorio,
    private readonly emisorEventos: EventEmitter2,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async enviar(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaSolicitudCompraDto> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    const resultado = await this.ejecutarTransicion(
      solicitud,
      EstadoSolicitudCompra.PENDIENTE,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.ENVIAR_SOLICITUD_COMPRA,
      'Envió a aprobación',
      resultado,
      usuario,
    );

    return resultado;
  }

  async aprobar(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaSolicitudCompraDto> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    this.validarEncargadoDelSector(solicitud, usuario);
    const resultado = await this.ejecutarTransicion(
      solicitud,
      EstadoSolicitudCompra.APROBADO,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.APROBAR_SOLICITUD_COMPRA,
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
  ): Promise<RespuestaSolicitudCompraDto> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    this.validarEncargadoDelSector(solicitud, usuario);
    const resultado = await this.ejecutarTransicion(
      solicitud,
      EstadoSolicitudCompra.RECHAZADO,
      usuario,
      motivo,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.RECHAZAR_SOLICITUD_COMPRA,
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
  ): Promise<RespuestaSolicitudCompraDto> {
    const solicitud = await this.obtenerSolicitudOFallar(id);

    if (usuario.rol === RolUsuario.ENCARGADO) {
      this.validarEncargadoDelSector(solicitud, usuario);
    }

    const resultado = await this.ejecutarTransicion(
      solicitud,
      EstadoSolicitudCompra.ANULADO,
      usuario,
      motivo,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.ANULAR_SOLICITUD_COMPRA,
      'Anuló',
      resultado,
      usuario,
    );

    return resultado;
  }

  async listarHistorial(
    id: string,
  ): Promise<RespuestaHistorialSolicitudCompraDto[]> {
    await this.obtenerSolicitudOFallar(id);
    const historial =
      await this.solicitudesCompraRepositorio.buscarHistorial(id);

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
    solicitud: SolicitudCompraModel,
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
    solicitud: SolicitudCompraModel,
    estadoNuevo: EstadoSolicitudCompra,
    usuario: UsuarioAutenticado,
    motivo?: string,
  ): Promise<RespuestaSolicitudCompraDto> {
    const transicionesPermitidas =
      TRANSICIONES_VALIDAS_SOLICITUD_COMPRA[solicitud.estado];

    if (!transicionesPermitidas.includes(estadoNuevo)) {
      throw new ConflictException({
        error: 'TRANSICION_INVALIDA',
        mensaje: `No se puede pasar de ${solicitud.estado} a ${estadoNuevo}`,
      });
    }

    const estadoAnterior = solicitud.estado;

    const solicitudActualizada =
      await this.solicitudesCompraRepositorio.cambiarEstado(
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

    return mapearRespuestaSolicitudCompra(solicitudActualizada);
  }

  private emitirCambioDeEstado(
    solicitud: SolicitudCompraModel,
    estadoAnterior: EstadoSolicitudCompra,
    usuarioId: string,
    motivo?: string,
  ): void {
    const evento: EventoSolicitudCompraEstadoCambiado = {
      solicitudCompraId: solicitud.id,
      numero: solicitud.numero,
      estadoAnterior,
      estadoNuevo: solicitud.estado,
      sectorId: solicitud.sectorId,
      solicitanteId: solicitud.solicitanteId,
      usuarioId,
      motivo: motivo ?? null,
    };

    this.emisorEventos.emit(EVENTOS_SOLICITUD_COMPRA.ESTADO_CAMBIADO, evento);
  }

  private async registrarAuditoriaTransicion(
    accion: string,
    verbo: string,
    resultado: RespuestaSolicitudCompraDto,
    usuario: UsuarioAutenticado,
  ): Promise<void> {
    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      accion,
      descripcion: `${verbo} la orden de compra #${resultado.numero}`,
      entidad: 'SolicitudCompra',
      entidadId: resultado.id,
    });
  }

  private async obtenerSolicitudOFallar(
    id: string,
  ): Promise<SolicitudCompraModel> {
    const solicitud = await this.solicitudesCompraRepositorio.buscarPorId(id);

    if (!solicitud) {
      throw new NotFoundException({
        error: 'SOLICITUD_COMPRA_NO_ENCONTRADA',
        mensaje: 'No existe una orden de compra con ese ID',
      });
    }

    return solicitud;
  }
}
