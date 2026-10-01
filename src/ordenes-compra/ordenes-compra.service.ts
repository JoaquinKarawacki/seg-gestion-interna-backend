import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  EstadoOC,
  EstadoSolicitudCompra,
  RolUsuario,
} from '../../generated/prisma/enums';
import type { OrdenCompraModel } from '../../generated/prisma/models';
import { ALMACENAMIENTO } from '../almacenamiento/puertos/almacenamiento.puerto';
import type {
  ArchivoAlmacenado,
  IAlmacenamiento,
} from '../almacenamiento/puertos/almacenamiento.puerto';
import { COTIZACIONES_REPOSITORIO } from '../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import type { ICotizacionesRepositorio } from '../cotizaciones/interfaces/cotizaciones-repositorio.interface';
import { PROYECTOS_REPOSITORIO } from '../proyectos/interfaces/proyectos-repositorio.interface';
import type { IProyectosRepositorio } from '../proyectos/interfaces/proyectos-repositorio.interface';
import { SOLICITUDES_COMPRA_REPOSITORIO } from '../solicitudes-compra/interfaces/solicitudes-compra-repositorio.interface';
import type { ISolicitudesCompraRepositorio } from '../solicitudes-compra/interfaces/solicitudes-compra-repositorio.interface';
import { ACCIONES_AUDITORIA } from '../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { ActualizarOrdenCompraDto } from './dtos/actualizar-orden-compra.dto';
import { CrearOrdenCompraDto } from './dtos/crear-orden-compra.dto';
import { RespuestaOrdenCompraDto } from './dtos/respuesta-orden-compra.dto';
import {
  ORDENES_COMPRA_REPOSITORIO,
  FiltrosOrdenCompra,
  PaginacionOrdenCompra,
} from './interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from './interfaces/ordenes-compra-repositorio.interface';
import { mapearRespuestaOrdenCompra } from './ordenes-compra.mapper';
import { CadenaValidacionOC } from './validaciones/cadena-validacion-oc';
import { ValidarProveedorCoincideCotizacionEslabon } from './validaciones/validar-proveedor-coincide-cotizacion.eslabon';

const CARPETA_ARCHIVOS = 'ordenes-compra';
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
export class OrdenesCompraService {
  constructor(
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
    @Inject(COTIZACIONES_REPOSITORIO)
    private readonly cotizacionesRepositorio: ICotizacionesRepositorio,
    @Inject(PROYECTOS_REPOSITORIO)
    private readonly proyectosRepositorio: IProyectosRepositorio,
    @Inject(SOLICITUDES_COMPRA_REPOSITORIO)
    private readonly solicitudesCompraRepositorio: ISolicitudesCompraRepositorio,
    @Inject(ALMACENAMIENTO)
    private readonly almacenamiento: IAlmacenamiento,
    private readonly cadenaValidacionOC: CadenaValidacionOC,
    private readonly validarProveedorEslabon: ValidarProveedorCoincideCotizacionEslabon,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async listar(
    filtros: FiltrosOrdenCompra,
    paginacion: PaginacionOrdenCompra,
  ): Promise<{ datos: RespuestaOrdenCompraDto[]; total: number }> {
    const [ordenes, total] = await Promise.all([
      this.ordenesCompraRepositorio.buscarConFiltros(filtros, paginacion),
      this.ordenesCompraRepositorio.contarConFiltros(filtros),
    ]);

    return {
      datos: ordenes.map((orden) => mapearRespuestaOrdenCompra(orden)),
      total,
    };
  }

  async buscarPorId(id: string): Promise<RespuestaOrdenCompraDto> {
    const orden = await this.obtenerOrdenOFallar(id);
    return mapearRespuestaOrdenCompra(orden);
  }

  async crear(
    dto: CrearOrdenCompraDto,
    usuario: UsuarioAutenticado,
    factura?: Express.Multer.File,
  ): Promise<RespuestaOrdenCompraDto> {
    // Si la OP se genera desde una orden de compra (SolicitudCompra) aprobada,
    // la cotización efectiva es la de esa OC (relación 1:1); si no, se usa la
    // que venga en el DTO.
    const cotizacionId = await this.resolverCotizacion(dto);
    const jerarquia = await this.derivarJerarquia(cotizacionId ?? undefined);
    const monto = new Prisma.Decimal(dto.monto);

    await this.cadenaValidacionOC.ejecutar({
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
        this.ordenesCompraRepositorio.crear({
          tipo: dto.tipo,
          fecha: new Date(dto.fecha),
          solicitanteId: usuario.id,
          sectorId: dto.sectorId,
          proveedorId: dto.proveedorId,
          clienteId: jerarquia.clienteId,
          proyectoId: jerarquia.proyectoId,
          tareaId: jerarquia.tareaId,
          cotizacionId,
          solicitudCompraId: dto.solicitudCompraId ?? null,
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
        accion: ACCIONES_AUDITORIA.CREAR_ORDEN_COMPRA,
        descripcion: `Creó la orden de compra #${orden.numero}${
          dto.solicitudCompraId
            ? ' (generada desde una orden de compra aprobada)'
            : ''
        }${
          dto.confirmarExcesoMonto ? ' con confirmación de exceso de monto' : ''
        }`,
        entidad: 'OrdenCompra',
        entidadId: orden.id,
      });

      return mapearRespuestaOrdenCompra(orden);
    } catch (error) {
      await this.revertirArchivoGuardado(facturaGuardada);
      throw error;
    }
  }

  async actualizar(
    id: string,
    dto: ActualizarOrdenCompraDto,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
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
      this.ordenesCompraRepositorio.actualizar(id, {
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
      accion: ACCIONES_AUDITORIA.ACTUALIZAR_ORDEN_COMPRA,
      descripcion: `Actualizó la orden de compra #${orden.numero}`,
      entidad: 'OrdenCompra',
      entidadId: orden.id,
    });

    return mapearRespuestaOrdenCompra(orden);
  }

  async adjuntarFactura(
    id: string,
    factura: Express.Multer.File,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
    const ordenExistente = await this.obtenerOrdenOFallar(id);
    const facturaGuardada = await this.almacenamiento.guardar(
      factura.buffer,
      factura.originalname,
      CARPETA_ARCHIVOS,
    );

    try {
      const orden = await this.ordenesCompraRepositorio.actualizar(id, {
        facturaPdfRuta: facturaGuardada.referencia,
      });

      if (ordenExistente.facturaPdfRuta) {
        await this.almacenamiento.eliminar(ordenExistente.facturaPdfRuta);
      }

      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        accion: ACCIONES_AUDITORIA.ADJUNTAR_FACTURA_ORDEN_COMPRA,
        descripcion: `Adjuntó la factura de la orden de compra #${orden.numero}`,
        entidad: 'OrdenCompra',
        entidadId: orden.id,
      });

      return mapearRespuestaOrdenCompra(orden);
    } catch (error) {
      await this.revertirArchivoGuardado(facturaGuardada);
      throw error;
    }
  }

  async descargarFactura(id: string): Promise<ArchivoDescargado> {
    const orden = await this.obtenerOrdenOFallar(id);

    if (!orden.facturaPdfRuta) {
      throw new NotFoundException({
        error: 'ORDEN_COMPRA_SIN_FACTURA',
        mensaje: 'Esta orden de compra no tiene una factura adjunta',
      });
    }

    const buffer = await this.almacenamiento.leer(orden.facturaPdfRuta);
    return { buffer, nombreArchivo: `orden-compra-${orden.numero}.pdf` };
  }

  async eliminar(id: string, usuario: UsuarioAutenticado): Promise<void> {
    const orden = await this.obtenerOrdenOFallar(id);
    this.validarPertenencia(orden, usuario);
    this.validarEsBorrador(orden);

    const comentariosAsociados =
      await this.ordenesCompraRepositorio.contarComentariosAsociados(id);

    if (comentariosAsociados > 0) {
      throw new UnprocessableEntityException({
        error: 'ORDEN_COMPRA_CON_COMENTARIOS_ASOCIADOS',
        mensaje:
          'No se puede eliminar la orden de compra porque tiene comentarios cargados',
      });
    }

    await this.ordenesCompraRepositorio.eliminar(id);

    if (orden.facturaPdfRuta) {
      await this.almacenamiento.eliminar(orden.facturaPdfRuta);
    }

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      accion: ACCIONES_AUDITORIA.ELIMINAR_ORDEN_COMPRA,
      descripcion: `Eliminó la orden de compra #${orden.numero}`,
      entidad: 'OrdenCompra',
      entidadId: orden.id,
    });
  }

  /**
   * Determina qué cotización usar al crear una Orden de Pago.
   * - Sin `solicitudCompraId`: flujo clásico, se usa la cotización del DTO (o null).
   * - Con `solicitudCompraId`: la OP se genera desde una Orden de Compra; se valida
   *   que exista y esté APROBADA, y se devuelve su cotización (relación 1:1).
   */
  private async resolverCotizacion(
    dto: CrearOrdenCompraDto,
  ): Promise<string | null> {
    if (!dto.solicitudCompraId) {
      return dto.cotizacionId ?? null;
    }

    const solicitud = await this.solicitudesCompraRepositorio.buscarPorId(
      dto.solicitudCompraId,
    );

    if (!solicitud) {
      throw new NotFoundException({
        error: 'SOLICITUD_COMPRA_NO_ENCONTRADA',
        mensaje: 'No existe una orden de compra con ese ID',
      });
    }

    if (solicitud.estado !== EstadoSolicitudCompra.APROBADO) {
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

  private async revertirArchivoGuardado(
    archivoGuardado: ArchivoAlmacenado | null,
  ): Promise<void> {
    if (archivoGuardado) {
      await this.almacenamiento.eliminar(archivoGuardado.referencia);
    }
  }

  private validarPertenencia(
    orden: OrdenCompraModel,
    usuario: UsuarioAutenticado,
  ): void {
    const esElSolicitante = usuario.id === orden.solicitanteId;
    const esDelMismoSector = usuario.sectoresEncargado.includes(orden.sectorId);
    const esAdmin = usuario.rol === RolUsuario.ADMIN;

    if (!esElSolicitante && !esDelMismoSector && !esAdmin) {
      throw new ForbiddenException({
        error: 'SIN_PERMISO_SOBRE_ORDEN_COMPRA',
        mensaje: 'No tenés permiso sobre esta orden de compra',
      });
    }
  }

  private validarEsBorrador(orden: OrdenCompraModel): void {
    if (orden.estado !== EstadoOC.BORRADOR) {
      throw new ConflictException({
        error: 'ORDEN_COMPRA_NO_ES_BORRADOR',
        mensaje:
          'Solo se puede editar o eliminar una orden de compra en estado BORRADOR',
      });
    }
  }

  private async ejecutarOMapearReferenciaInvalida(
    operacion: () => Promise<OrdenCompraModel>,
  ): Promise<OrdenCompraModel> {
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
