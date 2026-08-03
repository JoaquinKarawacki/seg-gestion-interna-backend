import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoOC, RolUsuario } from '../../generated/prisma/enums';
import type {
  ComentarioModel,
  OrdenCompraModel,
} from '../../generated/prisma/models';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { OrdenesCompraAprobacionService } from '../ordenes-compra/aprobacion/ordenes-compra-aprobacion.service';
import { ORDENES_COMPRA_REPOSITORIO } from '../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from '../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import { CrearComentarioDto } from './dtos/crear-comentario.dto';
import { RespuestaComentarioDto } from './dtos/respuesta-comentario.dto';
import { COMENTARIOS_REPOSITORIO } from './interfaces/comentarios-repositorio.interface';
import type { IComentariosRepositorio } from './interfaces/comentarios-repositorio.interface';

@Injectable()
export class ComentariosService {
  constructor(
    @Inject(COMENTARIOS_REPOSITORIO)
    private readonly comentariosRepositorio: IComentariosRepositorio,
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
    private readonly ordenesCompraAprobacionService: OrdenesCompraAprobacionService,
  ) {}

  async crear(
    ordenCompraId: string,
    dto: CrearComentarioDto,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaComentarioDto> {
    const orden = await this.obtenerOrdenOFallar(ordenCompraId);

    const comentario = await this.comentariosRepositorio.crear({
      ordenCompraId,
      autorId: usuario.id,
      texto: dto.texto,
    });

    await this.dispararTransicionSiCorresponde(orden, usuario);

    return this.mapearRespuesta(comentario);
  }

  async listar(ordenCompraId: string): Promise<RespuestaComentarioDto[]> {
    await this.obtenerOrdenOFallar(ordenCompraId);
    const comentarios =
      await this.comentariosRepositorio.buscarPorOrden(ordenCompraId);

    return comentarios.map((comentario) => this.mapearRespuesta(comentario));
  }

  private async dispararTransicionSiCorresponde(
    orden: OrdenCompraModel,
    usuario: UsuarioAutenticado,
  ): Promise<void> {
    const esEncargadoDelSector =
      usuario.rol === RolUsuario.ENCARGADO &&
      usuario.sectorId === orden.sectorId;
    const esElSolicitante = usuario.id === orden.solicitanteId;

    if (orden.estado === EstadoOC.PENDIENTE && esEncargadoDelSector) {
      await this.ordenesCompraAprobacionService.marcarEnConsulta(
        orden.id,
        usuario,
      );
      return;
    }

    if (orden.estado === EstadoOC.EN_CONSULTA && esElSolicitante) {
      await this.ordenesCompraAprobacionService.responderConsulta(
        orden.id,
        usuario,
      );
    }
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

  private mapearRespuesta(comentario: ComentarioModel): RespuestaComentarioDto {
    return {
      id: comentario.id,
      ordenCompraId: comentario.ordenCompraId,
      autorId: comentario.autorId,
      texto: comentario.texto,
      creadoEn: comentario.creadoEn,
    };
  }
}
