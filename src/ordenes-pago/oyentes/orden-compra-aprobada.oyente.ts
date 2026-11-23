import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EstadoOC, EstadoOP } from '../../../generated/prisma/enums';
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
 * pasa a APROBADO, se genera sola su Orden de Pago (OrdenPago) por el total y queda
 * APROBADA, lista para pago. Aprobar la OC equivale a aprobar su único pago.
 *
 * Recorrido de la OP: BORRADOR → PENDIENTE (sin mail: el encargado ya aprobó) →
 * APROBADO (con mail a PAGOS, incluye datos bancarios). La aprobación se hace a
 * nombre de quien aprobó la OC y pasa por la misma validación de sector que la
 * manual; si esa persona ya no es encargado/suplente del sector, la OP queda
 * PENDIENTE con el mail normal al encargado, que la aprueba a mano.
 *
 * Patrón Observer sobre el evento de transición de la OC (igual que las
 * notificaciones), fail-soft: si algo falla se loguea y no se relanza (el emit()
 * es síncrono y una excepción tumbaría el proceso).
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

      // Idempotencia: si la OC ya tiene una OP viva (p. ej. el evento se
      // reprocesó), no generar otra. Las ANULADAS no cuentan: si se anuló la OP,
      // se editó la OC y se re-aprobó, hay que generar la nueva (el alta manual
      // está oculta para pago único, así que no habría otra forma).
      const [opsTotales, opsAnuladas] = await Promise.all([
        this.ordenesPagoRepositorio.contarConFiltros({
          ordenCompraId: solicitud.id,
        }),
        this.ordenesPagoRepositorio.contarConFiltros({
          ordenCompraId: solicitud.id,
          estado: EstadoOP.ANULADO,
        }),
      ]);

      if (opsTotales - opsAnuladas > 0) {
        return;
      }

      const autor = await this.resolverUsuario(solicitud.solicitanteId);

      // tipo/sector/proveedor/moneda/IVA incluido los deriva el service desde la
      // misma OC; acá solo se pasa lo que el flujo de pago único define.
      const dto: CrearOrdenPagoDto = {
        ordenCompraId: solicitud.id,
        fecha: new Date().toISOString(),
        monto: solicitud.monto.toNumber(),
        concepto: solicitud.concepto,
        formaPago: solicitud.pagoUnicoFormaPago,
        pagaIva: solicitud.pagaIva,
        observaciones: solicitud.observaciones ?? undefined,
      };

      // Quien aprobó la OC aprueba también la OP. La OP toma el sector de la OC,
      // así que normalmente puede; si no (le sacaron el sector), se cae al flujo
      // normal: PENDIENTE con mail al encargado, para que nunca quede sin aviso.
      const aprobador = await this.resolverUsuario(evento.usuarioId);
      const aprobadorPuedeAprobar =
        aprobador.sectoresEncargado.includes(solicitud.sectorId) ||
        aprobador.sectoresSuplente.includes(solicitud.sectorId);

      // Crea la OP en BORRADOR (hereda cotización/jerarquía de la OC aprobada y
      // corre la cadena de validación de monto) y la pasa a PENDIENTE; sin mail
      // si se va a aprobar en el acto.
      const op = await this.ordenesPagoService.crear(dto, autor);
      await this.ordenesPagoAprobacionService.enviar(op.id, autor, {
        notificar: !aprobadorPuedeAprobar,
      });

      if (!aprobadorPuedeAprobar) {
        this.logger.warn(
          `Pago único: la OP #${op.numero} (OC #${solicitud.numero}) quedó PENDIENTE: quien aprobó la OC ya no es encargado/suplente del sector`,
        );
        return;
      }

      await this.ordenesPagoAprobacionService.aprobar(op.id, aprobador);

      this.logger.log(
        `Pago único: generada y aprobada la OP #${op.numero} desde la OC #${solicitud.numero}`,
      );
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudo generar la orden de pago del pago único (OC ${evento.ordenCompraId}): ${mensaje}`,
      );
    }
  }

  // Arma el UsuarioAutenticado desde la DB (datos frescos, no del JWT). Se usa
  // para el autor de la OP (solicitante de la OC) y para el aprobador (quien
  // aprobó la OC): sus sectores de encargado/suplente son los que valida aprobar().
  private async resolverUsuario(
    usuarioId: string,
  ): Promise<UsuarioAutenticado> {
    const usuario = await this.usuariosRepositorio.buscarPorId(usuarioId);

    if (!usuario) {
      throw new Error(`No existe el usuario ${usuarioId}`);
    }

    return {
      id: usuario.id,
      email: usuario.email,
      roles: usuario.roles,
      sectorId: usuario.sectorId,
      sectoresEncargado: usuario.sectoresEncargado.map((s) => s.id),
      sectoresSuplente: usuario.sectoresSuplente.map((s) => s.id),
    };
  }
}
