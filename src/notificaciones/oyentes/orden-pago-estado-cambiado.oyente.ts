import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { RolUsuario } from '../../../generated/prisma/enums';
import type { UsuarioModel } from '../../../generated/prisma/models';
import { EVENTOS } from '../../ordenes-pago/eventos/eventos.constantes';
import type { EventoOrdenPagoEstadoCambiado } from '../../ordenes-pago/eventos/orden-pago-estado-cambiado.evento';
import { ORDENES_PAGO_REPOSITORIO } from '../../ordenes-pago/interfaces/ordenes-pago-repositorio.interface';
import type { IOrdenesPagoRepositorio } from '../../ordenes-pago/interfaces/ordenes-pago-repositorio.interface';
import { USUARIOS_REPOSITORIO } from '../../usuarios/interfaces/usuarios-repositorio.interface';
import type { IUsuariosRepositorio } from '../../usuarios/interfaces/usuarios-repositorio.interface';
import { CorreoService } from '../correo.service';
import { obtenerPlantilla, TipoDestinatario } from '../plantillas-orden-pago';

@Injectable()
export class OrdenPagoEstadoCambiadoOyente {
  private readonly logger = new Logger(OrdenPagoEstadoCambiadoOyente.name);

  constructor(
    @Inject(USUARIOS_REPOSITORIO)
    private readonly usuariosRepositorio: IUsuariosRepositorio,
    @Inject(ORDENES_PAGO_REPOSITORIO)
    private readonly ordenesPagoRepositorio: IOrdenesPagoRepositorio,
    private readonly correoService: CorreoService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(EVENTOS.ORDEN_PAGO_ESTADO_CAMBIADO)
  async cuandoCambiaEstadoOrdenPago(
    evento: EventoOrdenPagoEstadoCambiado,
  ): Promise<void> {
    const baseUrl = this.configService.get<string>('FRONTEND_URL', '');

    // Todo el manejo del evento es fail-soft: como se dispara con emit() (no
    // emitAsync()) y no hay un handler de unhandledRejection en main.ts, una
    // excepción sin atrapar acá (incluida la carga de la OP, la resolución de
    // destinatarios o el envío del mail) tumbaría el proceso entero, no solo
    // esta notificación puntual.
    try {
      const op = await this.ordenesPagoRepositorio.buscarDetalle(
        evento.ordenPagoId,
      );
      if (!op) {
        this.logger.warn(
          `No se encontró la orden de pago ${evento.ordenPagoId} para notificar`,
        );
        return;
      }

      const plantilla = obtenerPlantilla(evento, op, baseUrl);
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
    tipos: TipoDestinatario[],
    evento: EventoOrdenPagoEstadoCambiado,
  ): Promise<string[]> {
    const emails = new Set<string>();

    for (const tipo of tipos) {
      const usuarios = await this.buscarUsuariosPorTipo(tipo, evento);
      usuarios.forEach((usuario) => emails.add(usuario.email));
    }

    return [...emails];
  }

  private async buscarUsuariosPorTipo(
    tipo: TipoDestinatario,
    evento: EventoOrdenPagoEstadoCambiado,
  ): Promise<UsuarioModel[]> {
    if (tipo === 'SOLICITANTE') {
      const solicitante = await this.usuariosRepositorio.buscarPorId(
        evento.solicitanteId,
      );
      return solicitante ? [solicitante] : [];
    }

    if (tipo === 'ENCARGADO_SECTOR') {
      return this.usuariosRepositorio.buscarActivosPorRol(
        RolUsuario.ENCARGADO,
        evento.sectorId,
      );
    }

    return this.usuariosRepositorio.buscarActivosPorRol(RolUsuario.PAGOS);
  }

  private obtenerEmailsEnCopia(): string[] {
    const lista = this.configService.get<string>('EMAILS_EN_COPIA', '');
    return lista
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }
}
