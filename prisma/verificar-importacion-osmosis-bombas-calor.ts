import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// Verificación de solo lectura de la carga hecha por
// importar-proyectos-osmosis-bombas-calor.ts: recalcula, para cada Tarea del
// dataset, lo que debería haber quedado en la base y lo compara contra lo
// que realmente hay, sin modificar nada.
const RUT_CLIENTE: Record<string, string> = {
  CAMDEL: '090105250010',
  COMTA: '190034730011',
  BSE: '210465050018',
  SOFITEL: 'PENDIENTE-SOFITEL',
  UAM: 'PENDIENTE-UAM',
};

interface TareaJson {
  ref: string;
  nombre: string;
  montoTotal: number;
  pagos: { monto: number }[];
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

async function main(): Promise<void> {
  let errores = 0;
  let totalEsperado = 0;
  let totalReal = 0;

  for (const proyectoJson of proyectosJson) {
    const clienteId = (await prisma.cliente.findUniqueOrThrow({ where: { rut: RUT_CLIENTE[proyectoJson.cliente] } })).id;
    const proyecto = await prisma.proyecto.findFirst({ where: { nombre: proyectoJson.nombre, clienteId } });
    if (!proyecto) {
      console.error(`FALTA Proyecto ${proyectoJson.nombre} / ${proyectoJson.cliente}`);
      errores += 1;
      continue;
    }

    for (const tareaJson of proyectoJson.tareas) {
      const esperadoPagado = tareaJson.pagos.reduce((acc, p) => acc + p.monto, 0);
      totalEsperado += esperadoPagado;

      const tarea = await prisma.tarea.findFirst({ where: { nombre: tareaJson.nombre, proyectoId: proyecto.id } });
      if (!tarea) {
        console.error(`FALTA Tarea "${tareaJson.nombre}" en ${proyectoJson.nombre}/${proyectoJson.cliente} (${tareaJson.ref})`);
        errores += 1;
        continue;
      }

      const cotizacion = await prisma.cotizacion.findFirst({ where: { tareaId: tarea.id, estado: 'ACTIVA' } });
      if (!cotizacion) {
        console.error(`FALTA Cotización ACTIVA para "${tareaJson.nombre}" (${tareaJson.ref})`);
        errores += 1;
        continue;
      }
      if (Number(cotizacion.montoTotal) !== tareaJson.montoTotal) {
        console.error(
          `MONTO TOTAL distinto en ${tareaJson.ref}: esperado ${tareaJson.montoTotal}, real ${cotizacion.montoTotal}`,
        );
        errores += 1;
      }

      const ordenes = await prisma.ordenPago.findMany({ where: { cotizacionId: cotizacion.id } });
      const sumaReal = ordenes.reduce((acc, o) => acc + Number(o.monto), 0);
      totalReal += sumaReal;
      if (ordenes.length !== tareaJson.pagos.length) {
        console.error(
          `CANTIDAD DE OC distinta en ${tareaJson.ref}: esperadas ${tareaJson.pagos.length}, reales ${ordenes.length}`,
        );
        errores += 1;
      }
      if (Math.abs(sumaReal - esperadoPagado) > 0.01) {
        console.error(`PAGADO distinto en ${tareaJson.ref}: esperado ${esperadoPagado}, real ${sumaReal}`);
        errores += 1;
      }
      const noPagadas = ordenes.filter((o) => o.estado !== 'PAGADO');
      if (noPagadas.length > 0) {
        console.error(`${tareaJson.ref}: hay ${noPagadas.length} OC que no quedaron en PAGADO`);
        errores += 1;
      }
    }
  }

  console.log('\nResumen verificación:', {
    errores,
    totalEsperado: totalEsperado.toFixed(2),
    totalReal: totalReal.toFixed(2),
  });
  if (errores === 0 && Math.abs(totalEsperado - totalReal) < 0.01) {
    console.log('TODO OK — coincide exactamente con el Excel.');
  } else {
    console.log('HAY DIFERENCIAS — revisar el detalle arriba.');
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
