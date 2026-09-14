import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { RolUsuario, TipoCuentaBancaria } from '../generated/prisma/enums';

// Datos reales de SEG (clientes/proveedores del historial, trabajadores del
// listado de sectores) extraídos de los Excel provistos por el usuario el
// 2026-09-14. Ver contexto-gestion-interna-backend.md, Etapa 10.
const RONDAS_SALT = 10;
const CONTRASENA_INICIAL = 'Cambiar123!';
const DIR_DATOS = join(__dirname, 'datos-reales');

interface DatoCliente {
  nombre: string;
  rut: string;
}

interface DatoProveedor {
  nombre: string;
  rut: string;
  banco: string;
  tipoCuenta: TipoCuentaBancaria;
  numeroCuenta: string;
}

interface DatoUsuario {
  sector: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

function leerJson<T>(archivo: string): T {
  return JSON.parse(readFileSync(join(DIR_DATOS, archivo), 'utf-8')) as T;
}

const sectores = leerJson<string[]>('sectores.json');
const usuarios = leerJson<DatoUsuario[]>('usuarios.json');
const clientes = leerJson<DatoCliente[]>('clientes.json');
const proveedores = leerJson<DatoProveedor[]>('proveedores.json');

const adaptador = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: adaptador });

async function cargarSectores(): Promise<Map<string, string>> {
  const idPorNombre = new Map<string, string>();
  for (const nombre of sectores) {
    const sector = await prisma.sector.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    idPorNombre.set(nombre, sector.id);
  }
  return idPorNombre;
}

async function cargarUsuarios(idPorSector: Map<string, string>): Promise<void> {
  const contrasenaHash = await bcrypt.hash(CONTRASENA_INICIAL, RONDAS_SALT);
  for (const usuario of usuarios) {
    await prisma.usuario.upsert({
      where: { email: usuario.email },
      update: {},
      create: {
        nombre: usuario.nombre,
        email: usuario.email,
        contrasenaHash,
        rol: usuario.rol,
        sectorId: idPorSector.get(usuario.sector),
      },
    });
  }
}

async function cargarClientes(): Promise<void> {
  for (const cliente of clientes) {
    await prisma.cliente.upsert({
      where: { rut: cliente.rut },
      update: {},
      create: cliente,
    });
  }
}

async function cargarProveedores(): Promise<void> {
  for (const proveedor of proveedores) {
    await prisma.proveedor.upsert({
      where: { rut: proveedor.rut },
      update: {},
      create: proveedor,
    });
  }
}

async function main(): Promise<void> {
  console.log(
    `Cargando: ${sectores.length} sectores, ${usuarios.length} usuarios, ${clientes.length} clientes, ${proveedores.length} proveedores...`,
  );

  const idPorSector = await cargarSectores();
  await cargarUsuarios(idPorSector);
  await cargarClientes();
  await cargarProveedores();

  console.log(`Listo. Contraseña inicial para los usuarios nuevos: ${CONTRASENA_INICIAL}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
