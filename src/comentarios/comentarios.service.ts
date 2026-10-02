import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoOP, RolUsuario } from '../../generated/prisma/enums';
import type {
  ComentarioModel,
  OrdenPagoModel,
} from '../../generated/prisma/models';
import { ACCIONES_AUDITORIA } from '../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { OrdenesPagoAprobacionService } from '../ordenes-pago/aprobacion/ordenes-pago-aprobacion.service';
import { ORDENES_PAGO_REPOSITORIO } from '../ordenes-pago/interfaces/ordenes-pago-repositorio.interface';
import type { IOrdenesPagoRepositorio } from '../ordenes-pago/interfaces/ordenes-pago-repositorio.interface';
import { CrearComentarioDto } from './dtos/crear-comentario.dto';
import { RespuestaComentarioDto } from './dtos/respuesta-comentario.dto';
import { COMENTARIOS_REPOSITORIO } from './interfaces/comentarios-repositorio.interface';
import type { IComentariosRepositorio } from './interfaces/comentarios-repositorio.interface';

@Injectable()
export class ComentariosService {
  constructor(
    @Inject(COMENTARIOS_REPOSITORIO)
    private readonly comentariosRepositorio: IComentariosRepositorio,
    @Inject(ORDENES_PAGO_REPOSITORIO)
    private readonly ordenesPagoRepositorio: IOrdenesPagoRepositorio,
    private readonly ordenesPagoAprobacionService: OrdenesPagoAprobacionService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async crear(
    ordenPagoId: string,
    dto: CrearComentarioDto,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaComentarioDto> {
    const orden = await this.obtenerOrdenOFallar(ordenPagoId);

    const comentario = await this.comentariosRepositorio.crear({
      ordenPagoId,
      autorId: usuario.id,
      texto: dto.texto,
    });

    await this.dispararTransicionSiCorresponde(orden, usuario);

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      accion: ACCIONES_AUDITORIA.CREAR_COMENTARIO,
      descripcion: `Comentó en la orden de compra #${orden.numero}`,
      entidad: 'OrdenPago',
      entidadId: orden.id,
    });

    return this.mapearRespuesta(comentario);
  }

  async listar(ordenPagoId: string): Promise<RespuestaComentarioDto[]> {
    await this.obtenerOrdenOFallar(ordenPagoId);
    const comentarios =
      await this.comentariosRepositorio.buscarPorOrden(ordenPagoId);

    return comentarios.map((comentario) => this.mapearRespuesta(comentario));
  }

  private async dispararTransicionSiCorresponde(
    orden: OrdenPagoModel,
    usuario: UsuarioAutenticado,
  ): Promise<void> {
    const esEncargadoDelSector =
      usuario.rol === RolUsuario.ENCARGADO &&
      usuario.sectoresEncargado.includes(orden.sectorId);
    const esElSolicitante = usuario.id === orden.solicitanteId;

    if (orden.estado === EstadoOP.PENDIENTE && esEncargadoDelSector) {
      await this.ordenesPagoAprobacionService.marcarEnConsulta(
        orden.id,
        usuario,
      );
      return;
    }

    if (orden.estado === EstadoOP.EN_CONSULTA && esElSolicitante) {
      await this.ordenesPagoAprobacionService.responderConsulta(
        orden.id,
        usuario,
      );
    }
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

  private mapearRespuesta(comentario: ComentarioModel): RespuestaComentarioDto {
    return {
      id: comentario.id,
      ordenPagoId: comentario.ordenPagoId,
      autorId: comentario.autorId,
      texto: comentario.texto,
      creadoEn: comentario.creadoEn,
    };
  }
}
