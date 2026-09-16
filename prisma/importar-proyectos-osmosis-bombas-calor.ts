import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { Moneda, TipoOC, FormaPago, EstadoOC, EstadoCotizacion } from '../generated/prisma/enums';

// Primer lote de datos transaccionales reales (Proyecto→Tarea→Cotización→
// OrdenCompra), extraído y validado desde
// Resumen_Proyectos_Osmosis_y_Bombas_de_Calor.xlsx el 2026-09-16. Ver
// contexto-gestion-interna-backend.md y el plan de esa sesión para el
// detalle del mapeo. La hoja "Resumen" del Excel no se usó como fuente de
// montos (tiene datos desactualizados) — todo sale de las hojas "Osmosis"/
// "Bombas de Calor" (Cotizaciones) y "Detalle de Pagos" (Órdenes de Compra).
const SECTOR_NOMBRE = 'AE';
const SOLICITANTE_EMAIL = 'karawacki@segingenieria.com';
const MOTIVO_HISTORIAL = 'Carga histórica de datos reales (Resumen_Proyectos_Osmosis_y_Bombas_de_Calor.xlsx)';

// RUTs reales ya cargados en Etapa 10 — se resuelven por RUT, no por nombre,
// porque el nombre corto de este Excel no coincide literal con el nombre
// completo ya cargado (ej. "CAMDEL" acá vs. "CAMDEL IAMPP" en el catálogo).
const RUT_CLIENTE_CONOCIDO: Record<string, string> = {
  CAMDEL: '090105250010',
  COMTA: '190034730011',
  BSE: '210465050018', // Banco de Seguros del Estado
};
// SOFITEL y UAM no existen todavía — se crean con RUT provisorio (decisión
// del usuario, 2026-09-16): pendiente reemplazar por el RUT real.
const RUT_PROVISORIO_CLIENTE: Record<string, string> = {
  SOFITEL: 'PENDIENTE-SOFITEL',
  UAM: 'PENDIENTE-UAM',
};
const RUT_PROVEEDOR: Record<string, string> = {
  Geosur: '214256670016',
  'NOALER S.A. (CIR)': '213797180014',
};

interface PagoJson {
  fecha: string;
  monto: number;
  nota: string | null;
  fechaAproximada?: boolean;
}

interface TareaJson {
  ref: string;
  nombre: string;
  numeroFactura: string;
  nota: string | null;
  proveedor: string;
  moneda: 'UYU' | 'USD';
  montoTotal: number;
  pagos: PagoJson[];
}

interface ProyectoJson {
  nombre: string;
  cliente: string;
  tareas: TareaJson[];
}

const proyectosJson = JSON.parse(
  readFileSync(join(__dirname, 'datos-reales/proyectos-osmosis-bombas-calor.json'), 'utf-8'),
) as ProyectoJson[];

const adaptador = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: adaptador });

async function resolverClienteId(nombreCorto: string): Promise<string> {
  const rutConocido = RUT_CLIENTE_CONOCIDO[nombreCorto];
  if (rutConocido) {
    const cliente = await prisma.cliente.findUnique({ where: { rut: rutConocido } });
    if (!cliente) {
      throw new Error(`Cliente esperado con rut ${rutConocido} (${nombreCorto}) no existe — revisar datos reales importados en Etapa 10.`);
    }
    return cliente.id;
  }

  const rutProvisorio = RUT_PROVISORIO_CLIENTE[nombreCorto];
  const cliente = await prisma.cliente.upsert({
    where: { rut: rutProvisorio },
    update: {},
    create: { nombre: nombreCorto, rut: rutProvisorio },
  });
  return cliente.id;
}

async function resolverProveedorId(nombre: string): Promise<string> {
  const rut = RUT_PROVEEDOR[nombre];
  const proveedor = await prisma.proveedor.findUnique({ where: { rut } });
  if (!proveedor) {
    throw new Error(`Proveedor esperado con rut ${rut} (${nombre}) no existe — revisar datos reales importados en Etapa 10.`);
  }
  return proveedor.id;
}

async function resolverSectorId(): Promise<string> {
  const sector = await prisma.sector.findUnique({ where: { nombre: SECTOR_NOMBRE } });
  if (!sector) throw new Error(`Sector ${SECTOR_NOMBRE} no existe.`);
  return sector.id;
}

async function resolverSolicitanteId(): Promise<string> {
  const usuario = await prisma.usuario.findUnique({ where: { email: SOLICITANTE_EMAIL } });
  if (!usuario) throw new Error(`Usuario solicitante ${SOLICITANTE_EMAIL} no existe.`);
  return usuario.id;
}

async function obtenerOCrearProyecto(nombre: string, clienteId: string, sectorId: string): Promise<string> {
  const existente = await prisma.proyecto.findFirst({ where: { nombre, clienteId } });
  if (existente) return existente.id;
  const creado = await prisma.proyecto.create({ data: { nombre, clienteId, sectorId } });
  return creado.id;
}

async function obtenerOCrearTarea(nombre: string, proyectoId: string): Promise<string> {
  const existente = await prisma.tarea.findFirst({ where: { nombre, proyectoId } });
  if (existente) return existente.id;
  const creada = await prisma.tarea.create({ data: { nombre, proyectoId } });
  return creada.id;
}

async function obtenerOCrearCotizacionActiva(
  proyectoId: string,
  tareaId: string,
  proveedorId: string,
  montoTotal: number,
  moneda: Moneda,
): Promise<string> {
  const existente = await prisma.cotizacion.findFirst({ where: { tareaId, estado: EstadoCotizacion.ACTIVA } });
  if (existente) return existente.id;
  const creada = await prisma.cotizacion.create({
    data: {
      proyectoId,
      tareaId,
      proveedorId,
      montoTotal,
      moneda,
      ivaIncluido: true,
      estado: EstadoCotizacion.ACTIVA,
    },
  });
  return creada.id;
}

async function crearOrdenCompraPagada(
  cotizacionId: string,
  proyectoId: string,
  tareaId: string,
  proveedorId: string,
  clienteId: string,
  sectorId: string,
  solicitanteId: string,
  moneda: Moneda,
  concepto: string,
  monto: number,
  fecha: string,
  observaciones: string,
): Promise<void> {
  const yaExiste = await prisma.ordenCompra.findFirst({
    where: { cotizacionId, monto, fecha: new Date(fecha) },
  });
  if (yaExiste) return;

  await prisma.$transaction(async (tx) => {
    const orden = await tx.ordenCompra.create({
      data: {
        tipo: TipoOC.SERVICIO,
        fecha: new Date(fecha),
        solicitanteId,
        sectorId,
        proveedorId,
        clienteId,
        proyectoId,
        tareaId,
        cotizacionId,
        moneda,
        monto,
        concepto,
        formaPago: FormaPago.TRANSFERENCIA_BANCARIA,
        pagaIva: true,
        ivaIncluido: true,
        observaciones,
        estado: EstadoOC.PAGADO,
      },
    });
    await tx.historialEstadoOC.create({
      data: {
        ordenCompraId: orden.id,
        estadoAnterior: EstadoOC.BORRADOR,
        estadoNuevo: EstadoOC.PAGADO,
        usuarioId: solicitanteId,
        motivo: MOTIVO_HISTORIAL,
        creadoEn: new Date(fecha),
      },
    });
  });
}

async function main(): Promise<void> {
  const sectorId = await resolverSectorId();
  const solicitanteId = await resolverSolicitanteId();

  let proyectosCreados = 0;
  let tareasCreadas = 0;
  let cotizacionesCreadas = 0;
  let ordenesCreadas = 0;
  let totalCargado = 0;

  for (const proyectoJson of proyectosJson) {
    const clienteId = await resolverClienteId(proyectoJson.cliente);
    const proyectoId = await obtenerOCrearProyecto(proyectoJson.nombre, clienteId, sectorId);
    proyectosCreados += 1;

    for (const tareaJson of proyectoJson.tareas) {
      const proveedorId = await resolverProveedorId(tareaJson.proveedor);
      const tareaId = await obtenerOCrearTarea(tareaJson.nombre, proyectoId);
      tareasCreadas += 1;

      const moneda = tareaJson.moneda === 'UYU' ? Moneda.UYU : Moneda.USD;
      const cotizacionId = await obtenerOCrearCotizacionActiva(
        proyectoId,
        tareaId,
        proveedorId,
        tareaJson.montoTotal,
        moneda,
      );
      cotizacionesCreadas += 1;

      const sumaPagos = tareaJson.pagos.reduce((acc, p) => acc + p.monto, 0);
      if (sumaPagos > tareaJson.montoTotal + 0.01) {
        throw new Error(
          `${tareaJson.ref}: la suma de pagos (${sumaPagos}) supera el montoTotal de la cotización (${tareaJson.montoTotal}).`,
        );
      }

      for (const pago of tareaJson.pagos) {
        const notaOriginal = pago.nota ? ` — ${pago.nota}` : '';
        const numeroFactura = tareaJson.numeroFactura && tareaJson.numeroFactura !== '-'
          ? ` (Factura ${tareaJson.numeroFactura})`
          : '';
        const aviso = pago.fechaAproximada
          ? ' [fecha aproximada: no especificada en el Excel original]'
          : '';
        const observaciones = `Ref. ${tareaJson.ref}${numeroFactura}${notaOriginal}${aviso}`.trim();

        await crearOrdenCompraPagada(
          cotizacionId,
          proyectoId,
          tareaId,
          proveedorId,
          clienteId,
          sectorId,
          solicitanteId,
          moneda,
          tareaJson.nombre,
          pago.monto,
          pago.fecha,
          observaciones,
        );
        ordenesCreadas += 1;
        totalCargado += pago.monto;
      }
    }
  }

  console.log('Carga completa:', {
    proyectosCreados,
    tareasCreadas,
    cotizacionesCreadas,
    ordenesCreadas,
    totalCargado: totalCargado.toFixed(2),
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
