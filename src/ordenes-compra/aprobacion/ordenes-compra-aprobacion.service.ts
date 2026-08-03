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
import { EVENTOS } from '../eventos/eventos.constantes';
import type { EventoOrdenCompraEstadoCambiado } from '../eventos/orden-compra-estado-cambiado.evento';
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
    private readonly emisorEventos: EventEmitter2,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async enviar(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
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
    const orden = await this.obtenerOrdenOFallar(id);
    this.validarEncargadoDelSector(orden, usuario);
    const resultado = await this.ejecutarTransicion(
      orden,
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
    const orden = await this.obtenerOrdenOFallar(id);
    this.validarEncargadoDelSector(orden, usuario);
    const resultado = await this.ejecutarTransicion(
      orden,
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

  async observarPago(
    id: string,
    usuario: UsuarioAutenticado,
    motivo: string,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOC.PAGO_OBSERVADO,
      usuario,
      motivo,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.OBSERVAR_PAGO_ORDEN_COMPRA,
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
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOC.APROBADO,
      usuario,
      motivo,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.RESOLVER_OBSERVACION_ORDEN_COMPRA,
      'Resolvió la observación de pago de',
      resultado,
      usuario,
    );

    return resultado;
  }

  async confirmarPago(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOC.PAGADO,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.CONFIRMAR_PAGO_ORDEN_COMPRA,
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
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);

    if (usuario.rol === RolUsuario.ENCARGADO) {
      this.validarEncargadoDelSector(orden, usuario);
    }

    const resultado = await this.ejecutarTransicion(
      orden,
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

  async marcarEnConsulta(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOC.EN_CONSULTA,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.MARCAR_EN_CONSULTA_ORDEN_COMPRA,
      'Marcó en consulta',
      resultado,
      usuario,
    );

    return resultado;
  }

  async responderConsulta(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    const resultado = await this.ejecutarTransicion(
      orden,
      EstadoOC.PENDIENTE,
      usuario,
    );

    await this.registrarAuditoriaTransicion(
      ACCIONES_AUDITORIA.RESPONDER_CONSULTA_ORDEN_COMPRA,
      'Respondió la consulta de',
      resultado,
      usuario,
    );

    return resultado;
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

    const estadoAnterior = orden.estado;

    const ordenActualizada = await this.ordenesCompraRepositorio.cambiarEstado(
      orden.id,
      estadoNuevo,
      usuario.id,
      motivo,
    );

    this.emitirCambioDeEstado(
      ordenActualizada,
      estadoAnterior,
      usuario.id,
      motivo,
    );

    return mapearRespuestaOrdenCompra(ordenActualizada);
  }

  private emitirCambioDeEstado(
    orden: OrdenCompraModel,
    estadoAnterior: EstadoOC,
    usuarioId: string,
    motivo?: string,
  ): void {
    const evento: EventoOrdenCompraEstadoCambiado = {
      ordenCompraId: orden.id,
      numero: orden.numero,
      estadoAnterior,
      estadoNuevo: orden.estado,
      sectorId: orden.sectorId,
      solicitanteId: orden.solicitanteId,
      usuarioId,
      motivo: motivo ?? null,
    };

    this.emisorEventos.emit(EVENTOS.ORDEN_COMPRA_ESTADO_CAMBIADO, evento);
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
