import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EstadoSolicitudCompra } from '../../../generated/prisma/enums';
import type { UsuarioAutenticado } from '../../comun/interfaces/usuario-autenticado.interface';
import { EVENTOS_SOLICITUD_COMPRA } from '../../solicitudes-compra/eventos/eventos.constantes';
import type { EventoSolicitudCompraEstadoCambiado } from '../../solicitudes-compra/eventos/solicitud-compra-estado-cambiado.evento';
import { SOLICITUDES_COMPRA_REPOSITORIO } from '../../solicitudes-compra/interfaces/solicitudes-compra-repositorio.interface';
import type { ISolicitudesCompraRepositorio } from '../../solicitudes-compra/interfaces/solicitudes-compra-repositorio.interface';
import { USUARIOS_REPOSITORIO } from '../../usuarios/interfaces/usuarios-repositorio.interface';
import type { IUsuariosRepositorio } from '../../usuarios/interfaces/usuarios-repositorio.interface';
import type { CrearOrdenCompraDto } from '../dtos/crear-orden-compra.dto';
import { ORDENES_COMPRA_REPOSITORIO } from '../interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from '../interfaces/ordenes-compra-repositorio.interface';
import { OrdenesCompraAprobacionService } from '../aprobacion/ordenes-compra-aprobacion.service';
import { OrdenesCompraService } from '../ordenes-compra.service';

/**
 * Pago único: cuando una Orden de Compra (SolicitudCompra) marcada como `esPagoUnico`
 * pasa a APROBADO, se genera sola su Orden de Pago (OrdenCompra) por el total y se la
 * auto-envía a PENDIENTE. Patrón Observer sobre el evento de transición de la OC
 * (igual que las notificaciones), fail-soft: si algo falla se loguea y no se relanza
 * (el emit() es síncrono y una excepción tumbaría el proceso), y queda como fallback
 * el botón manual "Crear Orden de Pago" de la OC ya aprobada.
 */
@Injectable()
export class SolicitudCompraAprobadaOyente {
  private readonly logger = new Logger(SolicitudCompraAprobadaOyente.name);

  constructor(
    @Inject(SOLICITUDES_COMPRA_REPOSITORIO)
    private readonly solicitudesCompraRepositorio: ISolicitudesCompraRepositorio,
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
    @Inject(USUARIOS_REPOSITORIO)
    private readonly usuariosRepositorio: IUsuariosRepositorio,
    private readonly ordenesCompraService: OrdenesCompraService,
    private readonly ordenesCompraAprobacionService: OrdenesCompraAprobacionService,
  ) {}

  @OnEvent(EVENTOS_SOLICITUD_COMPRA.ESTADO_CAMBIADO)
  async cuandoCambiaEstadoSolicitudCompra(
    evento: EventoSolicitudCompraEstadoCambiado,
  ): Promise<void> {
    if (evento.estadoNuevo !== EstadoSolicitudCompra.APROBADO) {
      return;
    }

    try {
      const solicitud = await this.solicitudesCompraRepositorio.buscarPorId(
        evento.solicitudCompraId,
      );

      if (!solicitud || !solicitud.esPagoUnico) {
        return;
      }

      if (!solicitud.pagoUnicoFormaPago) {
        this.logger.error(
          `OC #${solicitud.numero} es pago único pero no tiene forma de pago; no se genera la OP`,
        );
        return;
      }

      // Idempotencia: si la OC ya tiene una OP (p. ej. el evento se reprocesó),
      // no generar otra. El vínculo directo es solicitudCompraId.
      const opsExistentes = await this.ordenesCompraRepositorio.contarConFiltros(
        { solicitudCompraId: solicitud.id },
      );

      if (opsExistentes > 0) {
        return;
      }

      const autor = await this.resolverAutor(solicitud.solicitanteId);

      const dto: CrearOrdenCompraDto = {
        tipo: solicitud.tipo,
        fecha: new Date().toISOString(),
        sectorId: solicitud.sectorId,
        proveedorId: solicitud.proveedorId,
        solicitudCompraId: solicitud.id,
        moneda: solicitud.moneda,
        monto: solicitud.monto.toNumber(),
        concepto: solicitud.concepto,
        formaPago: solicitud.pagoUnicoFormaPago,
        pagaIva: solicitud.pagaIva,
        ivaIncluido: solicitud.ivaIncluido,
        observaciones: solicitud.observaciones ?? undefined,
      };

      // Crea la OP en BORRADOR (hereda cotización/jerarquía de la OC aprobada y
      // corre la cadena de validación de monto) y la auto-envía a PENDIENTE.
      const op = await this.ordenesCompraService.crear(dto, autor);
      await this.ordenesCompraAprobacionService.enviar(op.id, autor);

      this.logger.log(
        `Pago único: generada y enviada la OP #${op.numero} desde la OC #${solicitud.numero}`,
      );
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudo generar la orden de pago del pago único (OC ${evento.solicitudCompraId}): ${mensaje}`,
      );
    }
  }

  // El autor de la OP es el solicitante de la OC. `crear`/`enviar` solo usan id y
  // email (este último para la auditoría); el resto del shape se completa por tipos.
  private async resolverAutor(
    solicitanteId: string,
  ): Promise<UsuarioAutenticado> {
    const usuario = await this.usuariosRepositorio.buscarPorId(solicitanteId);

    if (!usuario) {
      throw new Error(
        `No existe el solicitante ${solicitanteId} de la OC de pago único`,
      );
    }

    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      sectorId: usuario.sectorId,
      sectoresEncargado: [],
    };
  }
}
