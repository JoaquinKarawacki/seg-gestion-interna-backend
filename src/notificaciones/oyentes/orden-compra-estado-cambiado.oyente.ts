import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { RolUsuario } from '../../../generated/prisma/enums';
import type { UsuarioModel } from '../../../generated/prisma/models';
import { EVENTOS_ORDEN_COMPRA } from '../../ordenes-compra/eventos/eventos.constantes';
import type { EventoOrdenCompraEstadoCambiado } from '../../ordenes-compra/eventos/orden-compra-estado-cambiado.evento';
import { ORDENES_COMPRA_REPOSITORIO } from '../../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from '../../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import { USUARIOS_REPOSITORIO } from '../../usuarios/interfaces/usuarios-repositorio.interface';
import type { IUsuariosRepositorio } from '../../usuarios/interfaces/usuarios-repositorio.interface';
import { CorreoService } from '../correo.service';
import { obtenerEmailsEnCopiaPorSector } from '../emails-copia-por-sector';
import {
  obtenerPlantillaSolicitud,
  TipoDestinatarioSolicitud,
} from '../plantillas-orden-compra';

@Injectable()
export class OrdenCompraEstadoCambiadoOyente {
  private readonly logger = new Logger(OrdenCompraEstadoCambiadoOyente.name);

  constructor(
    @Inject(USUARIOS_REPOSITORIO)
    private readonly usuariosRepositorio: IUsuariosRepositorio,
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
    private readonly correoService: CorreoService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(EVENTOS_ORDEN_COMPRA.ESTADO_CAMBIADO)
  async cuandoCambiaEstado(
    evento: EventoOrdenCompraEstadoCambiado,
  ): Promise<void> {
    const baseUrl = this.configService.get<string>('FRONTEND_URL', '');

    // Fail-soft: se emite con emit() (fire-and-forget); una excepción sin
    // atrapar acá (incluida la carga de la OC) tumbaría el proceso, así que se
    // loguea y no se relanza.
    try {
      const oc = await this.ordenesCompraRepositorio.buscarDetalle(
        evento.ordenCompraId,
      );
      if (!oc) {
        this.logger.warn(
          `No se encontró la orden de compra ${evento.ordenCompraId} para notificar`,
        );
        return;
      }

      const plantilla = obtenerPlantillaSolicitud(evento, oc, baseUrl);
      if (!plantilla) {
        this.logger.warn(
          `Sin plantilla de notificación para el estado ${evento.estadoNuevo}`,
        );
        return;
      }

      const destinatarios = await this.resolverEmails(
        plantilla.destinatarios,
        evento,
      );
      const emailsEnCopia = obtenerEmailsEnCopiaPorSector(oc.sector.nombre);
      const destinatariosFinales = [
        ...new Set([...destinatarios, ...emailsEnCopia]),
      ];

      await this.correoService.enviar(
        destinatariosFinales,
        plantilla.asunto,
        plantilla.cuerpo,
      );
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudo procesar la notificación de cambio de estado: ${mensaje}`,
      );
    }
  }

  private async resolverEmails(
    tipos: TipoDestinatarioSolicitud[],
    evento: EventoOrdenCompraEstadoCambiado,
  ): Promise<string[]> {
    const emails = new Set<string>();

    for (const tipo of tipos) {
      const usuarios = await this.buscarUsuariosPorTipo(tipo, evento);
      usuarios.forEach((usuario) => emails.add(usuario.email));
    }

    return [...emails];
  }

  private async buscarUsuariosPorTipo(
    tipo: TipoDestinatarioSolicitud,
    evento: EventoOrdenCompraEstadoCambiado,
  ): Promise<UsuarioModel[]> {
    if (tipo === 'SOLICITANTE') {
      const solicitante = await this.usuariosRepositorio.buscarPorId(
        evento.solicitanteId,
      );
      return solicitante ? [solicitante] : [];
    }

    return this.usuariosRepositorio.buscarActivosPorRol(
      RolUsuario.ENCARGADO,
      evento.sectorId,
    );
  }
}
