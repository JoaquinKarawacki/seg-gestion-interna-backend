import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { RolUsuario } from '../../../generated/prisma/enums';
import type { UsuarioModel } from '../../../generated/prisma/models';
import { EVENTOS_ORDEN_COMPRA } from '../../ordenes-compra/eventos/eventos.constantes';
import type { EventoOrdenCompraEstadoCambiado } from '../../ordenes-compra/eventos/orden-compra-estado-cambiado.evento';
import { USUARIOS_REPOSITORIO } from '../../usuarios/interfaces/usuarios-repositorio.interface';
import type { IUsuariosRepositorio } from '../../usuarios/interfaces/usuarios-repositorio.interface';
import { CorreoService } from '../correo.service';
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
    private readonly correoService: CorreoService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(EVENTOS_ORDEN_COMPRA.ESTADO_CAMBIADO)
  async cuandoCambiaEstado(
    evento: EventoOrdenCompraEstadoCambiado,
  ): Promise<void> {
    const plantilla = obtenerPlantillaSolicitud(evento);

    if (!plantilla) {
      this.logger.warn(
        `Sin plantilla de notificación para el estado ${evento.estadoNuevo}`,
      );
      return;
    }

    // Fail-soft: se emite con emit() (fire-and-forget); una excepción sin
    // atrapar acá tumbaría el proceso, así que se loguea y no se relanza.
    try {
      const destinatarios = await this.resolverEmails(
        plantilla.destinatarios,
        evento,
      );
      const emailsEnCopia = this.obtenerEmailsEnCopia();
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

  private obtenerEmailsEnCopia(): string[] {
    const lista = this.configService.get<string>('EMAILS_EN_COPIA', '');
    return lista
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }
}
