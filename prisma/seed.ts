import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { Moneda, RolUsuario } from '../generated/prisma/enums';

const RONDAS_SALT = 10;
const CONTRASENA_DE_PRUEBA = 'Cambiar123!';

const USUARIOS_DE_PRUEBA = [
  {
    nombre: 'Solicitante de Prueba',
    email: 'solicitante@segingenieria.com',
    rol: RolUsuario.SOLICITANTE,
  },
  {
    nombre: 'Encargado de Prueba',
    email: 'encargado@segingenieria.com',
    rol: RolUsuario.ENCARGADO,
  },
  {
    nombre: 'Pagos de Prueba',
    email: 'pagos@segingenieria.com',
    rol: RolUsuario.PAGOS,
  },
  {
    nombre: 'Admin de Prueba',
    email: 'admin@segingenieria.com',
    rol: RolUsuario.ADMIN,
  },
];

const adaptador = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter: adaptador });

async function main(): Promise<void> {
  const contrasenaHash = await bcrypt.hash(CONTRASENA_DE_PRUEBA, RONDAS_SALT);

  for (const usuario of USUARIOS_DE_PRUEBA) {
    await prisma.usuario.upsert({
      where: { email: usuario.email },
      update: {},
      create: { ...usuario, contrasenaHash },
    });
  }

  // UYU es la base (tasa 1 implícita, sin fila). USD/EUR arrancan en 1 para
  // que GET /tipos-cambio nunca truene antes de que un ADMIN los actualice.
  for (const moneda of [Moneda.USD, Moneda.EUR]) {
    await prisma.tipoCambio.upsert({
      where: { moneda },
      update: {},
      create: { moneda, valorEnUyu: 1 },
    });
  }

  console.log(
    `Usuarios de prueba creados. Contraseña para todos: ${CONTRASENA_DE_PRUEBA}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
