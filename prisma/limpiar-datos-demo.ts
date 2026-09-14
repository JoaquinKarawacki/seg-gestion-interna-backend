import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// Borra el dataset de demo/prueba identificado el 2026-09-14 (proyectos
// "Edificio Torres del Puerto"/"Golf"/"Puerto", cliente "Constructora
// Bulevar SRL", proveedores "Ferretería Central"/"Materiales del Sur SA").
// IDs fijos a propósito (no por nombre) para no arriesgar borrar datos
// reales por coincidencia. Ver contexto-gestion-interna-backend.md.
const ORDENES_COMPRA = [
  '3170ba96-e875-411c-bf55-af2e83831c9a', // #6
  '55bcdf03-5644-455a-8bc0-2d58d154d3c8', // #5
  'a81d859c-be1f-4b8b-9e21-ad001ed36e73', // #4
  'dea5fd83-3ae4-43a3-b96d-3a1fb4b02bd3', // #3
  'e4a503d5-64e6-4b1b-970d-d59594da1459', // #2
  '0b009454-99b6-46d2-ac51-2c8786b8c510', // #1
];
const COTIZACIONES = ['2fb7f5c2-931b-4058-a337-faab04032672', '99023a84-3751-407f-9248-300faf758730'];
const TAREAS = [
  '81fdd4ea-ef66-4768-8929-359186e0118b', // Cimientos y estructura
  '716dd655-ee46-470d-82fe-907d3677e68b', // Cambio de bomba
  '6f907e60-f319-4a05-935d-91ed0113b01e', // Cimientos
];
const PROYECTOS = [
  'a78bc854-8260-4271-87d5-254c818c1f7d', // Edificio Torres del Puerto
  '42868d61-4ab1-43f3-875e-6a3da6a9e3fb', // Golf
  '78aa23b0-5fd3-461a-b81e-0cfb6e467be2', // Puerto
];
const CLIENTES = ['193838ff-1896-43d9-9268-6e801fba7aa8']; // Constructora Bulevar SRL
const PROVEEDORES = [
  '2cd2b048-8c11-4de3-a9a8-3140adfa766e', // Ferretería Central
  '96311902-b1c8-4296-a947-4b8fa7881a22', // Materiales del Sur SA
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
