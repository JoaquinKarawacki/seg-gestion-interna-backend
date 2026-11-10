import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../generated/prisma/client';
import { EstadoOC, Moneda, RolUsuario } from '../../generated/prisma/enums';
import { tieneRol } from '../comun/autorizacion/roles.util';
import type {
  OrdenCompraModel,
  ProyectoModel,
  TipoCambioModel,
} from '../../generated/prisma/models';
import { ALMACENAMIENTO } from '../almacenamiento/puertos/almacenamiento.puerto';
import type {
  ArchivoAlmacenado,
  IAlmacenamiento,
} from '../almacenamiento/puertos/almacenamiento.puerto';
import { ACCIONES_AUDITORIA } from '../auditoria/acciones-auditoria.constantes';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuarioAutenticado } from '../comun/interfaces/usuario-autenticado.interface';
import { PROYECTOS_REPOSITORIO } from '../proyectos/interfaces/proyectos-repositorio.interface';
import type { IProyectosRepositorio } from '../proyectos/interfaces/proyectos-repositorio.interface';
import { TIPOS_CAMBIO_REPOSITORIO } from '../tipos-cambio/interfaces/tipos-cambio-repositorio.interface';
import type { ITiposCambioRepositorio } from '../tipos-cambio/interfaces/tipos-cambio-repositorio.interface';
import { CrearOrdenCompraDto } from './dtos/crear-orden-compra.dto';
import { ModificarOrdenCompraDto } from './dtos/modificar-orden-compra.dto';
import {
  calcularMontoNeto,
  requiereProyecto,
  UMBRAL_PDF_USD,
} from './ordenes-compra.constantes';
import { construirEventoOrdenCompraEstadoCambiado } from './eventos/construir-evento-estado-cambiado';
import { EVENTOS_ORDEN_COMPRA } from './eventos/eventos.constantes';
import { RespuestaOrdenCompraDto } from './dtos/respuesta-orden-compra.dto';
import {
  FiltrosOrdenCompra,
  PaginacionOrdenCompra,
  ORDENES_COMPRA_REPOSITORIO,
} from './interfaces/ordenes-compra-repositorio.interface';
import type { IOrdenesCompraRepositorio } from './interfaces/ordenes-compra-repositorio.interface';
import { mapearRespuestaOrdenCompra } from './ordenes-compra.mapper';

const CARPETA_ARCHIVOS = 'ordenes-compra';
const CODIGO_REFERENCIA_INVALIDA = 'P2003';

// Datos mínimos para calcular el monto neto en USD (sirve tanto para el alta como
// para la edición, sin acoplar la validación a un DTO puntual).
interface DatosCalculoMonto {
  monto: number;
  pagaIva: boolean;
  ivaIncluido: boolean;
  moneda: Moneda;
}

@Injectable()
export class OrdenesCompraService {
  constructor(
    @Inject(ORDENES_COMPRA_REPOSITORIO)
    private readonly ordenesCompraRepositorio: IOrdenesCompraRepositorio,
    @Inject(PROYECTOS_REPOSITORIO)
    private readonly proyectosRepositorio: IProyectosRepositorio,
    @Inject(TIPOS_CAMBIO_REPOSITORIO)
    private readonly tiposCambioRepositorio: ITiposCambioRepositorio,
    @Inject(ALMACENAMIENTO)
    private readonly almacenamiento: IAlmacenamiento,
    private readonly auditoriaService: AuditoriaService,
    private readonly emisorEventos: EventEmitter2,
  ) {}

  async listar(
    filtros: FiltrosOrdenCompra,
    paginacion: PaginacionOrdenCompra,
  ): Promise<{ datos: RespuestaOrdenCompraDto[]; total: number }> {
    const [solicitudes, total] = await Promise.all([
      this.ordenesCompraRepositorio.buscarConFiltros(filtros, paginacion),
      this.ordenesCompraRepositorio.contarConFiltros(filtros),
    ]);

    return {
      datos: solicitudes.map((solicitud) =>
        mapearRespuestaOrdenCompra(solicitud),
      ),
      total,
    };
  }

  async buscarPorId(id: string): Promise<RespuestaOrdenCompraDto> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    return mapearRespuestaOrdenCompra(solicitud);
  }

  async crear(
    dto: CrearOrdenCompraDto,
    usuario: UsuarioAutenticado,
    adjunto?: Express.Multer.File,
  ): Promise<RespuestaOrdenCompraDto> {
    this.validarPagoUnico(dto);
    await this.validarAdjuntoSegunMonto(dto, Boolean(adjunto));

    const adjuntoGuardado = adjunto
      ? await this.almacenamiento.guardar(
          adjunto.buffer,
          adjunto.originalname,
          CARPETA_ARCHIVOS,
        )
      : null;

    try {
      const solicitud = await this.ejecutarOMapearReferenciaInvalida(() =>
        this.crearSegunCategoria(
          dto,
          usuario,
          adjuntoGuardado?.referencia ?? null,
        ),
      );

      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        accion: ACCIONES_AUDITORIA.CREAR_ORDEN_COMPRA,
        descripcion: `Creó la orden de compra #${solicitud.numero}`,
        entidad: 'OrdenCompra',
        entidadId: solicitud.id,
      });

      return mapearRespuestaOrdenCompra(solicitud);
    } catch (error) {
      await this.revertirArchivoGuardado(adjuntoGuardado);
      throw error;
    }
  }

  // Edita una OC aprobada y la reenvía a aprobación. Solo el solicitante, el
  // encargado del sector o un admin pueden hacerlo (validarPertenencia). El
  // aprobador se re-notifica solo: el evento de paso a PENDIENTE dispara el mail.
  async modificar(
    id: string,
    dto: ModificarOrdenCompraDto,
    usuario: UsuarioAutenticado,
  ): Promise<RespuestaOrdenCompraDto> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    this.validarPertenencia(solicitud, usuario);
    this.validarEsAprobada(solicitud);
    await this.validarAdjuntoSegunMonto(dto, Boolean(solicitud.archivoPdfRuta));

    const resultado = await this.ordenesCompraRepositorio.modificarYReaprobar(
      id,
      {
        tipo: dto.tipo,
        proveedorId: dto.proveedorId,
        moneda: dto.moneda,
        monto: new Prisma.Decimal(dto.monto),
        concepto: dto.concepto,
        pagaIva: dto.pagaIva,
        ivaIncluido: dto.ivaIncluido,
        observaciones: dto.observaciones ?? null,
      },
      usuario.id,
    );

    if (resultado.estado === 'TIENE_ORDENES_PAGO') {
      throw new ConflictException({
        error: 'ORDEN_COMPRA_CON_ORDENES_PAGO',
        mensaje:
          'No se puede editar: la orden de compra ya tiene órdenes de pago asociadas',
      });
    }

    if (resultado.estado === 'CONFLICTO_ESTADO') {
      throw new ConflictException({
        error: 'TRANSICION_INVALIDA',
        mensaje:
          'La orden de compra fue modificada por otra acción mientras tanto — volvé a revisarla antes de reintentar',
      });
    }

    const orden = resultado.orden;
    this.emisorEventos.emit(
      EVENTOS_ORDEN_COMPRA.ESTADO_CAMBIADO,
      construirEventoOrdenCompraEstadoCambiado(
        orden,
        EstadoOC.APROBADO,
        usuario.id,
        'Editada y reenviada a aprobación',
      ),
    );

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      accion: ACCIONES_AUDITORIA.ACTUALIZAR_ORDEN_COMPRA,
      descripcion: `Editó y reenvió a aprobación la orden de compra #${orden.numero}`,
      entidad: 'OrdenCompra',
      entidadId: orden.id,
    });

    return mapearRespuestaOrdenCompra(orden);
  }

  private validarEsAprobada(solicitud: OrdenCompraModel): void {
    if (solicitud.estado !== EstadoOC.APROBADO) {
      throw new ConflictException({
        error: 'ORDEN_COMPRA_NO_APROBADA',
        mensaje: 'Solo se puede editar una orden de compra aprobada',
      });
    }
  }

  // Pago único: la forma de pago es obligatoria porque la OP se genera con ella
  // al aprobar la OC.
  private validarPagoUnico(dto: CrearOrdenCompraDto): void {
    if (dto.esPagoUnico && !dto.pagoUnicoFormaPago) {
      throw new UnprocessableEntityException({
        error: 'FORMA_PAGO_REQUERIDA_PAGO_UNICO',
        mensaje: 'Indicá la forma de pago para generar el pago único',
      });
    }
  }

  // El PDF adjunto es obligatorio solo si el monto sin IVA, en USD, llega al
  // umbral. Por debajo es opcional.
  private async validarAdjuntoSegunMonto(
    datos: DatosCalculoMonto,
    tieneAdjunto: boolean,
  ): Promise<void> {
    const montoNetoUsd = await this.calcularMontoNetoUsd(datos);

    if (montoNetoUsd >= UMBRAL_PDF_USD && !tieneAdjunto) {
      throw new UnprocessableEntityException({
        error: 'ADJUNTO_REQUERIDO',
        mensaje: `El PDF adjunto es obligatorio para montos de ${UMBRAL_PDF_USD} USD o más (sin IVA)`,
      });
    }
  }

  // Monto sin IVA convertido a USD. UYU es la moneda base (valor 1); USD/EUR
  // salen de los tipos de cambio cargados. 422 si falta el tipo de cambio.
  private async calcularMontoNetoUsd(
    datos: DatosCalculoMonto,
  ): Promise<number> {
    const neto = calcularMontoNeto(
      datos.monto,
      datos.pagaIva,
      datos.ivaIncluido,
    );

    if (datos.moneda === Moneda.USD) {
      return neto;
    }

    const tiposCambio = await this.tiposCambioRepositorio.buscarTodos();
    const valorMoneda = this.valorEnUyu(datos.moneda, tiposCambio);
    const valorUsd = this.valorEnUyu(Moneda.USD, tiposCambio);

    if (valorMoneda === null || valorUsd === null) {
      throw new UnprocessableEntityException({
        error: 'TIPO_CAMBIO_NO_DISPONIBLE',
        mensaje: 'No hay tipo de cambio cargado para calcular el monto en USD',
      });
    }

    return (neto * valorMoneda) / valorUsd;
  }

  private valorEnUyu(
    moneda: Moneda,
    tiposCambio: TipoCambioModel[],
  ): number | null {
    if (moneda === Moneda.UYU) {
      return 1;
    }
    const tipoCambio = tiposCambio.find((tc) => tc.moneda === moneda);
    return tipoCambio ? tipoCambio.valorEnUyu.toNumber() : null;
  }

  // Deriva proyecto/cliente de la categoría (solo ESCO los tiene) y crea la OC
  // con su cotización (siempre). `archivoPdfRuta` puede ser null.
  private async crearSegunCategoria(
    dto: CrearOrdenCompraDto,
    usuario: UsuarioAutenticado,
    archivoPdfRuta: string | null,
  ): Promise<OrdenCompraModel> {
    let proyectoId: string | null = null;
    let clienteId: string | null = null;

    if (requiereProyecto(dto.categoria)) {
      const proyecto = await this.obtenerProyectoOFallar(dto.proyectoId);
      proyectoId = proyecto.id;
      clienteId = proyecto.clienteId;
    }

    return this.ordenesCompraRepositorio.crearConCotizacion({
      categoria: dto.categoria,
      tipo: dto.tipo,
      solicitanteId: usuario.id,
      sectorId: dto.sectorId,
      proveedorId: dto.proveedorId,
      clienteId,
      proyectoId,
      moneda: dto.moneda,
      monto: new Prisma.Decimal(dto.monto),
      concepto: dto.concepto,
      pagaIva: dto.pagaIva,
      ivaIncluido: dto.ivaIncluido,
      observaciones: dto.observaciones ?? null,
      archivoPdfRuta,
      esPagoUnico: dto.esPagoUnico ?? false,
      pagoUnicoFormaPago: dto.pagoUnicoFormaPago ?? null,
    });
  }

  private async obtenerProyectoOFallar(
    proyectoId?: string,
  ): Promise<ProyectoModel> {
    // En las categorías con proyecto el DTO ya exige proyectoId (@ValidateIf);
    // el chequeo acá es defensivo.
    const proyecto = proyectoId
      ? await this.proyectosRepositorio.buscarPorId(proyectoId)
      : null;

    if (!proyecto) {
      throw new NotFoundException({
        error: 'PROYECTO_NO_ENCONTRADO',
        mensaje: 'No existe un proyecto con ese ID',
      });
    }

    return proyecto;
  }

  async eliminar(id: string, usuario: UsuarioAutenticado): Promise<void> {
    const solicitud = await this.obtenerSolicitudOFallar(id);
    this.validarPertenencia(solicitud, usuario);
    this.validarEsBorrador(solicitud);

    await this.ordenesCompraRepositorio.eliminar(id);
    if (solicitud.archivoPdfRuta) {
      await this.almacenamiento.eliminar(solicitud.archivoPdfRuta);
    }

    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      accion: ACCIONES_AUDITORIA.ELIMINAR_ORDEN_COMPRA,
      descripcion: `Eliminó la orden de compra #${solicitud.numero}`,
      entidad: 'OrdenCompra',
      entidadId: solicitud.id,
    });
  }

  async descargarAdjunto(
    id: string,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const solicitud = await this.obtenerSolicitudOFallar(id);

    if (!solicitud.archivoPdfRuta) {
      throw new NotFoundException({
        error: 'ADJUNTO_NO_ENCONTRADO',
        mensaje: 'La orden de compra no tiene un PDF adjunto',
      });
    }

    const buffer = await this.almacenamiento.leer(solicitud.archivoPdfRuta);
    return { buffer, nombreArchivo: `orden-compra-${solicitud.numero}.pdf` };
  }

  private async obtenerSolicitudOFallar(id: string): Promise<OrdenCompraModel> {
    const solicitud = await this.ordenesCompraRepositorio.buscarPorId(id);

    if (!solicitud) {
      throw new NotFoundException({
        error: 'ORDEN_COMPRA_NO_ENCONTRADA',
        mensaje: 'No existe una orden de compra con ese ID',
      });
    }

    return solicitud;
  }

  private validarPertenencia(
    solicitud: OrdenCompraModel,
    usuario: UsuarioAutenticado,
  ): void {
    const esElSolicitante = usuario.id === solicitud.solicitanteId;
    const esDelMismoSector = usuario.sectoresEncargado.includes(
      solicitud.sectorId,
    );
    const esAdmin = tieneRol(usuario, RolUsuario.ADMIN);

    if (!esElSolicitante && !esDelMismoSector && !esAdmin) {
      throw new ForbiddenException({
        error: 'SIN_PERMISO_SOBRE_ORDEN_COMPRA',
        mensaje: 'No tenés permiso sobre esta orden de compra',
      });
    }
  }

  private validarEsBorrador(solicitud: OrdenCompraModel): void {
    if (solicitud.estado !== EstadoOC.BORRADOR) {
      throw new ConflictException({
        error: 'ORDEN_COMPRA_NO_ES_BORRADOR',
        mensaje:
          'Solo se puede eliminar una orden de compra en estado BORRADOR',
      });
    }
  }

  private async revertirArchivoGuardado(
    archivoGuardado: ArchivoAlmacenado | null,
  ): Promise<void> {
    if (archivoGuardado) {
      await this.almacenamiento.eliminar(archivoGuardado.referencia);
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
          error: 'REFERENCIA_NO_ENCONTRADA',
          mensaje: 'El proveedor, el sector o el proyecto indicado no existen',
        });
      }

      throw error;
    }
  }
}
