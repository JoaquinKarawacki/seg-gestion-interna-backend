import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EstadoOC } from '../../../generated/prisma/enums';
import type { UsuarioAutenticado } from '../../comun/interfaces/usuario-autenticado.interface';
import { EVENTOS_ORDEN_COMPRA } from '../../ordenes-compra/eventos/eventos.constantes';
import type { EventoOrdenCompraEstadoCambiado } from '../../ordenes-compra/eventos/orden-compra-estado-cambiado.evento';
import { ORDENES_COMPRA_REPOSITORIO } from '../../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from '../../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import { USUARIOS_REPOSITORIO } from '../../usuarios/interfaces/usuarios-repositorio.interface';
import type { IUsuariosRepositorio } from '../../usuarios/interfaces/usuarios-repositorio.interface';
import type { CrearOrdenPagoDto } from '../dtos/crear-orden-pago.dto';
import { ORDENES_PAGO_REPOSITORIO } from '../interfaces/ordenes-pago-repositorio.interface';
import type { IOrdenesPagoRepositorio } from '../interfaces/ordenes-pago-repositorio.interface';
import { OrdenesPagoAprobacionService } from '../aprobacion/ordenes-pago-aprobacion.service';
import { OrdenesPagoService } from '../ordenes-pago.service';

/**
 * Pago único: cuando una Orden de Compra (OrdenCompra) marcada como `esPagoUnico`
 * pasa a APROBADO, se genera sola su Orden de Pago (OrdenPago) por el total y se la
 * auto-envía a PENDIENTE. Patrón Observer sobre el evento de transición de la OC
 * (igual que las notificaciones), fail-soft: si algo falla se loguea y no se relanza
 * (el emit() es síncrono y una excepción tumbaría el proceso), y queda como fallback
 * el botón manual "Crear Orden de Pago" de la OC ya aprobada.
 */
@Injectable()
export class OrdenCompraAprobadaOyente {
  private readonly logger = new Logger(OrdenCompraAprobadaOyente.name);

  constructor(
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
    @Inject(ORDENES_PAGO_REPOSITORIO)
    private readonly ordenesPagoRepositorio: IOrdenesPagoRepositorio,
    @Inject(USUARIOS_REPOSITORIO)
    private readonly usuariosRepositorio: IUsuariosRepositorio,
    private readonly ordenesPagoService: OrdenesPagoService,
    private readonly ordenesPagoAprobacionService: OrdenesPagoAprobacionService,
  ) {}

  @OnEvent(EVENTOS_ORDEN_COMPRA.ESTADO_CAMBIADO)
  async cuandoCambiaEstadoOC(
    evento: EventoOrdenCompraEstadoCambiado,
  ): Promise<void> {
    if (evento.estadoNuevo !== EstadoOC.APROBADO) {
      return;
    }

    try {
      const solicitud = await this.ordenesCompraRepositorio.buscarPorId(
        evento.ordenCompraId,
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
      // no generar otra. El vínculo directo es ordenCompraId.
      const opsExistentes = await this.ordenesPagoRepositorio.contarConFiltros({
        ordenCompraId: solicitud.id,
      });

      if (opsExistentes > 0) {
        return;
      }

      const autor = await this.resolverAutor(solicitud.solicitanteId);

      const dto: CrearOrdenPagoDto = {
        tipo: solicitud.tipo,
        fecha: new Date().toISOString(),
        sectorId: solicitud.sectorId,
        proveedorId: solicitud.proveedorId,
        ordenCompraId: solicitud.id,
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
      const op = await this.ordenesPagoService.crear(dto, autor);
      await this.ordenesPagoAprobacionService.enviar(op.id, autor);

      this.logger.log(
        `Pago único: generada y enviada la OP #${op.numero} desde la OC #${solicitud.numero}`,
      );
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudo generar la orden de pago del pago único (OC ${evento.ordenCompraId}): ${mensaje}`,
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
