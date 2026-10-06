import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoOP, RolUsuario } from '../../../generated/prisma/enums';
import type { OrdenPagoModel } from '../../../generated/prisma/models';
import { ACCIONES_AUDITORIA } from '../../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../../comun/interfaces/usuario-autenticado.interface';
import { RespuestaOrdenPagoDto } from '../dtos/respuesta-orden-pago.dto';
import { EVENTOS } from '../eventos/eventos.constantes';
import type { EventoOrdenPagoEstadoCambiado } from '../eventos/orden-pago-estado-cambiado.evento';
import { ORDENES_PAGO_REPOSITORIO } from '../interfaces/ordenes-pago-repositorio.interface';
import type { IOrdenesPagoRepositorio } from '../interfaces/ordenes-pago-repositorio.interface';
import { mapearRespuestaOrdenPago } from '../ordenes-pago.mapper';
import { RespuestaHistorialEstadoOPDto } from './dtos/respuesta-historial-estado-op.dto';
import { TRANSICIONES_VALIDAS_OP } from './transiciones-op';

@Injectable()
export class OrdenesPagoAprobacionService {
  constructor(
    @Inject(ORDENES_PAGO_REPOSITORIO)
    private readonly ordenesPagoRepositorio: IOrdenesPagoRepositorio,
    private readonly emisorEventos: EventEmitter2,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async enviar(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenPagoDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOP.PENDIENTE,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.ENVIAR_ORDEN_PAGO,
      'Envió a aprobación',
      resultado,
      usuario,
    );

    return resultado;
  }

  async aprobar(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenPagoDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    this.validarEncargadoDelSector(orden, usuario);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOP.APROBADO,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.APROBAR_ORDEN_PAGO,
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
  ): Promise<RespuestaOrdenPagoDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    this.validarEncargadoDelSector(orden, usuario);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOP.RECHAZADO,
      usuario,
      motivo,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.RECHAZAR_ORDEN_PAGO,
      'Rechazó',
      resultado,
      usuario,
    );

    return resultado;
  }

  async observarPago(
    id: string,
    usuario: UsuarioAutenticado,
    motivo: string,
  ): Promise<RespuestaOrdenPagoDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOP.PAGO_OBSERVADO,
      usuario,
      motivo,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.OBSERVAR_PAGO_ORDEN_PAGO,
      'Observó el pago de',
      resultado,
      usuario,
    );

    return resultado;
  }

  async resolverObservacion(
    id: string,
    usuario: UsuarioAutenticado,
    motivo?: string,
  ): Promise<RespuestaOrdenPagoDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOP.APROBADO,
      usuario,
      motivo,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.RESOLVER_OBSERVACION_ORDEN_PAGO,
      'Resolvió la observación de pago de',
      resultado,
      usuario,
    );

    return resultado;
  }

  async confirmarPago(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenPagoDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOP.PAGADO,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.CONFIRMAR_PAGO_ORDEN_PAGO,
      'Confirmó el pago de',
      resultado,
      usuario,
    );

    return resultado;
  }

  async anular(
    id: string,
    usuario: UsuarioAutenticado,
    motivo: string,
  ): Promise<RespuestaOrdenPagoDto> {
    const orden = await this.obtenerOrdenOFallar(id);

    if (usuario.rol === RolUsuario.ENCARGADO) {
      this.validarEncargadoDelSector(orden, usuario);
    }

    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOP.ANULADO,
      usuario,
      motivo,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.ANULAR_ORDEN_PAGO,
      'Anuló',
      resultado,
      usuario,
    );

    return resultado;
  }

  async marcarEnConsulta(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenPagoDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOP.EN_CONSULTA,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.MARCAR_EN_CONSULTA_ORDEN_PAGO,
      'Marcó en consulta',
      resultado,
      usuario,
    );

    return resultado;
  }

  async responderConsulta(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenPagoDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOP.PENDIENTE,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.RESPONDER_CONSULTA_ORDEN_PAGO,
      'Respondió la consulta de',
      resultado,
      usuario,
    );

    return resultado;
  }

  async listarHistorial(id: string): Promise<RespuestaHistorialEstadoOPDto[]> {
    await this.obtenerOrdenOFallar(id);
    const historial = await this.ordenesPagoRepositorio.buscarHistorial(id);

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
    orden: OrdenPagoModel,
    usuario: UsuarioAutenticado,
  ): void {
    if (!usuario.sectoresEncargado.includes(orden.sectorId)) {
      throw new ForbiddenException({
        error: 'SIN_PERMISO_SOBRE_SECTOR',
        mensaje: 'No tenés permiso sobre el sector de esta orden de compra',
      });
    }
  }

  private async ejecutarTransicion(
    orden: OrdenPagoModel,
    estadoNuevo: EstadoOP,
    usuario: UsuarioAutenticado,
    motivo?: string,
  ): Promise<RespuestaOrdenPagoDto> {
    const transicionesPermitidas = TRANSICIONES_VALIDAS_OP[orden.estado];

    if (!transicionesPermitidas.includes(estadoNuevo)) {
      throw new ConflictException({
        error: 'TRANSICION_INVALIDA',
        mensaje: `No se puede pasar de ${orden.estado} a ${estadoNuevo}`,
      });
    }

    const estadoAnterior = orden.estado;

    const ordenActualizada = await this.ordenesPagoRepositorio.cambiarEstado(
      orden.id,
      estadoAnterior,
      estadoNuevo,
      usuario.id,
      motivo,
    );

    if (!ordenActualizada) {
      throw new ConflictException({
        error: 'TRANSICION_INVALIDA',
        mensaje:
          'La orden de compra fue modificada por otra acción mientras tanto — volvé a revisarla antes de reintentar',
      });
    }

    this.emitirCambioDeEstado(
      ordenActualizada,
      estadoAnterior,
      usuario.id,
      motivo,
    );

    return mapearRespuestaOrdenPago(ordenActualizada);
  }

  private emitirCambioDeEstado(
    orden: OrdenPagoModel,
    estadoAnterior: EstadoOP,
    usuarioId: string,
    motivo?: string,
  ): void {
    const evento: EventoOrdenPagoEstadoCambiado = {
      ordenPagoId: orden.id,
      numero: orden.numero,
      estadoAnterior,
      estadoNuevo: orden.estado,
      sectorId: orden.sectorId,
      solicitanteId: orden.solicitanteId,
      usuarioId,
      motivo: motivo ?? null,
      monto: orden.monto.toString(),
      moneda: orden.moneda,
      concepto: orden.concepto,
    };

    this.emisorEventos.emit(EVENTOS.ORDEN_PAGO_ESTADO_CAMBIADO, evento);
  }

  private async registrarAuditoriaTransicion(
    accion: string,
    verbo: string,
    resultado: RespuestaOrdenPagoDto,
    usuario: UsuarioAutenticado,
  ): Promise<void> {
    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      accion,
      descripcion: `${verbo} la orden de compra #${resultado.numero}`,
      entidad: 'OrdenPago',
      entidadId: resultado.id,
    });
  }

  private async obtenerOrdenOFallar(id: string): Promise<OrdenPagoModel> {
    const orden = await this.ordenesPagoRepositorio.buscarPorId(id);

    if (!orden) {
      throw new NotFoundException({
        error: 'ORDEN_PAGO_NO_ENCONTRADA',
        mensaje: 'No existe una orden de compra con ese ID',
      });
    }

    return orden;
  }
}
