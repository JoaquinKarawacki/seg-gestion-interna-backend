import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { EstadoOP, EstadoOC, RolUsuario } from '../../generated/prisma/enums';
import type { OrdenPagoModel } from '../../generated/prisma/models';
import { ALMACENAMIENTO } from '../almacenamiento/puertos/almacenamiento.puerto';
import type {
  ArchivoAlmacenado,
  IAlmacenamiento,
} from '../almacenamiento/puertos/almacenamiento.puerto';
import { COTIZACIONES_REPOSITORIO } from '../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import type { ICotizacionesRepositorio } from '../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import { PROYECTOS_REPOSITORIO } from '../proyectos/interfaces/proyectos-repositorio.interface';
import type { IProyectosRepositorio } from '../proyectos/interfaces/proyectos-repositorio.interface';
import { ORDENES_COMPRA_REPOSITORIO } from '../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from '../ordenes-compra/interfaces/ordenes-compra-repositorio.interface';
import { ACCIONES_AUDITORIA } from '../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { ActualizarOrdenPagoDto } from './dtos/actualizar-orden-pago.dto';
import { CrearOrdenPagoDto } from './dtos/crear-orden-pago.dto';
import { RespuestaOrdenPagoDto } from './dtos/respuesta-orden-pago.dto';
import {
  ORDENES_PAGO_REPOSITORIO,
  FiltrosOrdenPago,
  PaginacionOrdenPago,
} from './interfaces/ordenes-pago-repositorio.interface';
import type { IOrdenesPagoRepositorio } from './interfaces/ordenes-pago-repositorio.interface';
import { mapearRespuestaOrdenPago } from './ordenes-pago.mapper';
import { CadenaValidacionOP } from './validaciones/cadena-validacion-op';
import { ValidarProveedorCoincideCotizacionEslabon } from './validaciones/validar-proveedor-coincide-cotizacion.eslabon';

const CARPETA_ARCHIVOS = 'ordenes-pago';
const CODIGO_REFERENCIA_INVALIDA = 'P2003';

export interface ArchivoDescargado {
  buffer: Buffer;
  nombreArchivo: string;
}

interface JerarquiaDerivada {
  clienteId: string | null;
  proyectoId: string | null;
  tareaId: string | null;
}

@Injectable()
export class OrdenesPagoService {
  constructor(
    @Inject(ORDENES_PAGO_REPOSITORIO)
    private readonly ordenesPagoRepositorio: IOrdenesPagoRepositorio,
    @Inject(COTIZACIONES_REPOSITORIO)
    private readonly cotizacionesRepositorio: ICotizacionesRepositorio,
    @Inject(PROYECTOS_REPOSITORIO)
    private readonly proyectosRepositorio: IProyectosRepositorio,
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
    @Inject(ALMACENAMIENTO)
    private readonly almacenamiento: IAlmacenamiento,
    private readonly cadenaValidacionOP: CadenaValidacionOP,
    private readonly validarProveedorEslabon: ValidarProveedorCoincideCotizacionEslabon,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async listar(
    filtros: FiltrosOrdenPago,
    paginacion: PaginacionOrdenPago,
  ): Promise<{ datos: RespuestaOrdenPagoDto[]; total: number }> {
    const [ordenes, total] = await Promise.all([
      this.ordenesPagoRepositorio.buscarConFiltros(filtros, paginacion),
      this.ordenesPagoRepositorio.contarConFiltros(filtros),
    ]);

    return {
      datos: ordenes.map((orden) => mapearRespuestaOrdenPago(orden)),
      total,
    };
  }

  async buscarPorId(id: string): Promise<RespuestaOrdenPagoDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    return mapearRespuestaOrdenPago(orden);
  }

  async crear(
    dto: CrearOrdenPagoDto,
    usuario: UsuarioAutenticado,
    factura?: Express.Multer.File,
  ): Promise<RespuestaOrdenPagoDto> {
    // Si la OP se genera desde una orden de compra (OrdenCompra) aprobada,
    // la cotización efectiva es la de esa OC (relación 1:1); si no, se usa la
    // que venga en el DTO.
    const cotizacionId = await this.resolverCotizacion(dto);
    const jerarquia = await this.derivarJerarquia(cotizacionId ?? undefined);
    const monto = new Prisma.Decimal(dto.monto);

    await this.cadenaValidacionOP.ejecutar({
      proveedorId: dto.proveedorId,
      cotizacionId,
      monto,
      confirmarExcesoMonto: dto.confirmarExcesoMonto ?? false,
    });

    const facturaGuardada = factura
      ? await this.almacenamiento.guardar(
          factura.buffer,
          factura.originalname,
          CARPETA_ARCHIVOS,
        )
      : null;

    try {
      const orden = await this.ejecutarOMapearReferenciaInvalida(() =>
        this.ordenesPagoRepositorio.crear({
          tipo: dto.tipo,
          fecha: new Date(dto.fecha),
          solicitanteId: usuario.id,
          sectorId: dto.sectorId,
          proveedorId: dto.proveedorId,
          clienteId: jerarquia.clienteId,
          proyectoId: jerarquia.proyectoId,
          tareaId: jerarquia.tareaId,
          cotizacionId,
          ordenCompraId: dto.ordenCompraId ?? null,
          moneda: dto.moneda,
          monto,
          concepto: dto.concepto,
          formaPago: dto.formaPago,
          pagaIva: dto.pagaIva,
          ivaIncluido: dto.ivaIncluido,
          observaciones: dto.observaciones ?? null,
          facturaPdfRuta: facturaGuardada?.referencia ?? null,
        }),
      );

      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        accion: ACCIONES_AUDITORIA.CREAR_ORDEN_PAGO,
        descripcion: `Creó la orden de compra #${orden.numero}${
          dto.ordenCompraId
            ? ' (generada desde una orden de compra aprobada)'
            : ''
        }${
          dto.confirmarExcesoMonto ? ' con confirmación de exceso de monto' : ''
        }`,
        entidad: 'OrdenPago',
        entidadId: orden.id,
      });

      return mapearRespuestaOrdenPago(orden);
    } catch (error) {
      await this.revertirArchivoGuardado(facturaGuardada);
      throw error;
    }
  }

  async actualizar(
    id: string,
    dto: ActualizarOrdenPagoDto,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenPagoDto> {
    const ordenExistente = await this.obtenerOrdenOFallar(id);
    this.validarPertenencia(ordenExistente, usuario);
    this.validarEsBorrador(ordenExistente);

    if (dto.proveedorId && ordenExistente.cotizacionId) {
      await this.validarProveedorEslabon.ejecutarValidacion({
        proveedorId: dto.proveedorId,
        cotizacionId: ordenExistente.cotizacionId,
        monto: ordenExistente.monto,
      });
    }

    const orden = await this.ejecutarOMapearReferenciaInvalida(() =>
      this.ordenesPagoRepositorio.actualizar(id, {
        tipo: dto.tipo,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        sectorId: dto.sectorId,
        proveedorId: dto.proveedorId,
        moneda: dto.moneda,
        concepto: dto.concepto,
        formaPago: dto.formaPago,
        pagaIva: dto.pagaIva,
        ivaIncluido: dto.ivaIncluido,
        observaciones: dto.observaciones,
      }),
    );

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      accion: ACCIONES_AUDITORIA.ACTUALIZAR_ORDEN_PAGO,
      descripcion: `Actualizó la orden de compra #${orden.numero}`,
      entidad: 'OrdenPago',
      entidadId: orden.id,
    });

    return mapearRespuestaOrdenPago(orden);
  }

  async adjuntarFactura(
    id: string,
    factura: Express.Multer.File,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenPagoDto> {
    const ordenExistente = await this.obtenerOrdenOFallar(id);
    const facturaGuardada = await this.almacenamiento.guardar(
      factura.buffer,
      factura.originalname,
      CARPETA_ARCHIVOS,
    );

    try {
      const orden = await this.ordenesPagoRepositorio.actualizar(id, {
        facturaPdfRuta: facturaGuardada.referencia,
      });

      if (ordenExistente.facturaPdfRuta) {
        await this.almacenamiento.eliminar(ordenExistente.facturaPdfRuta);
      }

      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        accion: ACCIONES_AUDITORIA.ADJUNTAR_FACTURA_ORDEN_PAGO,
        descripcion: `Adjuntó la factura de la orden de compra #${orden.numero}`,
        entidad: 'OrdenPago',
        entidadId: orden.id,
      });

      return mapearRespuestaOrdenPago(orden);
    } catch (error) {
      await this.revertirArchivoGuardado(facturaGuardada);
      throw error;
    }
  }

  async descargarFactura(id: string): Promise<ArchivoDescargado> {
    const orden = await this.obtenerOrdenOFallar(id);

    if (!orden.facturaPdfRuta) {
      throw new NotFoundException({
        error: 'ORDEN_PAGO_SIN_FACTURA',
        mensaje: 'Esta orden de compra no tiene una factura adjunta',
      });
    }

    const buffer = await this.almacenamiento.leer(orden.facturaPdfRuta);
    return { buffer, nombreArchivo: `orden-pago-${orden.numero}.pdf` };
  }

  async eliminar(id: string, usuario: UsuarioAutenticado): Promise<void> {
    const orden = await this.obtenerOrdenOFallar(id);
    this.validarPertenencia(orden, usuario);
    this.validarEsBorrador(orden);

    const comentariosAsociados =
      await this.ordenesPagoRepositorio.contarComentariosAsociados(id);

    if (comentariosAsociados > 0) {
      throw new UnprocessableEntityException({
        error: 'ORDEN_PAGO_CON_COMENTARIOS_ASOCIADOS',
        mensaje:
          'No se puede eliminar la orden de compra porque tiene comentarios cargados',
      });
    }

    await this.ordenesPagoRepositorio.eliminar(id);

    if (orden.facturaPdfRuta) {
      await this.almacenamiento.eliminar(orden.facturaPdfRuta);
    }

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      accion: ACCIONES_AUDITORIA.ELIMINAR_ORDEN_PAGO,
      descripcion: `Eliminó la orden de compra #${orden.numero}`,
      entidad: 'OrdenPago',
      entidadId: orden.id,
    });
  }

  /**
   * Determina qué cotización usar al crear una Orden de Pago.
   * - Sin `ordenCompraId`: flujo clásico, se usa la cotización del DTO (o null).
   * - Con `ordenCompraId`: la OP se genera desde una Orden de Compra; se valida
   *   que exista y esté APROBADA, y se devuelve su cotización (relación 1:1).
   */
  private async resolverCotizacion(
    dto: CrearOrdenPagoDto,
  ): Promise<string | null> {
    if (!dto.ordenCompraId) {
      return dto.cotizacionId ?? null;
    }

    const solicitud = await this.ordenesCompraRepositorio.buscarPorId(
      dto.ordenCompraId,
    );

    if (!solicitud) {
      throw new NotFoundException({
        error: 'ORDEN_COMPRA_NO_ENCONTRADA',
        mensaje: 'No existe una orden de compra con ese ID',
      });
    }

    if (solicitud.estado !== EstadoOC.APROBADO) {
      throw new UnprocessableEntityException({
        error: 'OC_NO_APROBADA',
        mensaje:
          'Solo se puede generar una orden de pago desde una orden de compra aprobada',
      });
    }

    return solicitud.cotizacionId;
  }

  private async derivarJerarquia(
    cotizacionId?: string,
  ): Promise<JerarquiaDerivada> {
    if (!cotizacionId) {
      return { clienteId: null, proyectoId: null, tareaId: null };
    }

    const cotizacion =
      await this.cotizacionesRepositorio.buscarPorId(cotizacionId);

    if (!cotizacion) {
      throw new NotFoundException({
        error: 'COTIZACION_NO_ENCONTRADA',
        mensaje: 'No existe una cotización con ese ID',
      });
    }

    const proyecto = await this.proyectosRepositorio.buscarPorId(
      cotizacion.proyectoId,
    );

    return {
      clienteId: proyecto?.clienteId ?? null,
      proyectoId: cotizacion.proyectoId,
      tareaId: cotizacion.tareaId,
    };
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

  private async revertirArchivoGuardado(
    archivoGuardado: ArchivoAlmacenado | null,
  ): Promise<void> {
    if (archivoGuardado) {
      await this.almacenamiento.eliminar(archivoGuardado.referencia);
    }
  }

  private validarPertenencia(
    orden: OrdenPagoModel,
    usuario: UsuarioAutenticado,
  ): void {
    const esElSolicitante = usuario.id === orden.solicitanteId;
    const esDelMismoSector = usuario.sectoresEncargado.includes(orden.sectorId);
    const esAdmin = usuario.rol === RolUsuario.ADMIN;

    if (!esElSolicitante && !esDelMismoSector && !esAdmin) {
      throw new ForbiddenException({
        error: 'SIN_PERMISO_SOBRE_ORDEN_PAGO',
        mensaje: 'No tenés permiso sobre esta orden de compra',
      });
    }
  }

  private validarEsBorrador(orden: OrdenPagoModel): void {
    if (orden.estado !== EstadoOP.BORRADOR) {
      throw new ConflictException({
        error: 'ORDEN_PAGO_NO_ES_BORRADOR',
        mensaje:
          'Solo se puede editar o eliminar una orden de compra en estado BORRADOR',
      });
    }
  }

  private async ejecutarOMapearReferenciaInvalida(
    operacion: () => Promise<OrdenPagoModel>,
  ): Promise<OrdenPagoModel> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_REFERENCIA_INVALIDA
      ) {
        throw new NotFoundException({
          error: 'PROVEEDOR_O_SECTOR_NO_ENCONTRADO',
          mensaje: 'El proveedor o el sector indicado no existen',
        });
      }

      throw error;
    }
  }
}
