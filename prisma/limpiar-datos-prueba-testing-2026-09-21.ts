import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// Borra los datos de prueba creados el 2026-09-21 durante el pase de testing
// pre-lanzamiento en producción (ver contexto-gestion-interna-backend.md):
// carga por API de un cliente/proveedor/proyecto/tarea/cotización/OC de
// prueba (todos nombrados "ZZZ ... TEST BORRAR"), OC #37 llevada hasta
// APROBADO y luego ANULADA (nunca PAGADA, no afectó totales reales).
// IDs fijos a propósito (no por nombre) para no arriesgar borrar datos reales.
const ORDENES_COMPRA = [
  '1352b74c-6e67-46ff-9c11-55d8f1b7cd62', // #37 "TEST BORRAR ... - carga de prueba antes de habilitar el sistema al equipo"
];
const COTIZACIONES = [
  '9fc4dbb3-f8b1-4a13-b80d-5db87deaf5be', // ZZZ Tarea test borrar
];
const TAREAS = [
  '0b5ac660-ad10-47d3-9834-a060150ad6aa', // ZZZ Tarea test borrar
];
const PROYECTOS = [
  '641b400d-55de-43cb-9337-16596a241ec2', // ZZZ PROYECTO TEST BORRAR
];
const CLIENTES = [
  'c4e56d05-4eab-4cd6-9c75-24a82a8a0a65', // ZZZ CLIENTE TEST BORRAR
];
const PROVEEDORES = [
  '98c2ff5a-f503-47a7-9026-4e187157c495', // ZZZ PROVEEDOR TEST BORRAR
];

const adaptador = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: adaptador });

async function main(): Promise<void> {
  const resultado = await prisma.$transaction(async (tx) => {
    const comentarios = await tx.comentario.deleteMany({ where: { ordenCompraId: { in: ORDENES_COMPRA } } });
    const historial = await tx.historialEstadoOC.deleteMany({ where: { ordenCompraId: { in: ORDENES_COMPRA } } });
    const ordenesCompra = await tx.ordenCompra.deleteMany({ where: { id: { in: ORDENES_COMPRA } } });
    const cotizaciones = await tx.cotizacion.deleteMany({ where: { id: { in: COTIZACIONES } } });
    const tareas = await tx.tarea.deleteMany({ where: { id: { in: TAREAS } } });
    const proyectos = await tx.proyecto.deleteMany({ where: { id: { in: PROYECTOS } } });
    const clientes = await tx.cliente.deleteMany({ where: { id: { in: CLIENTES } } });
    const proveedores = await tx.proveedor.deleteMany({ where: { id: { in: PROVEEDORES } } });

    return { comentarios, historial, ordenesCompra, cotizaciones, tareas, proyectos, clientes, proveedores };
  });

  console.log('Borrado completo:', resultado);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
