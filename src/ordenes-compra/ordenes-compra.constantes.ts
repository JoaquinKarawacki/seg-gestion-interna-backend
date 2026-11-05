import { CategoriaOrdenCompra } from '../../generated/prisma/enums';

// Categorías de OC que exigen proyecto (y, por lo tanto, cliente + cotización).
// Hoy solo PROYECTOS_ESCO: el resto de las categorías son compras sin proyecto.
// Sumar una nueva categoría "completa" es agregarla acá, sin tocar el resto del
// flujo de creación (principio abierto/cerrado).
export const CATEGORIAS_CON_PROYECTO: CategoriaOrdenCompra[] = [
  CategoriaOrdenCompra.PROYECTOS_ESCO,
];

export function requiereProyecto(categoria: CategoriaOrdenCompra): boolean {
  return CATEGORIAS_CON_PROYECTO.includes(categoria);
}

// A partir de este monto neto (sin IVA), convertido a USD, el PDF adjunto es
// obligatorio. Por debajo es opcional.
export const UMBRAL_PDF_USD = 1000;

// IVA general de Uruguay (fijo, igual que en el frontend `lib/iva.ts`).
export const TASA_IVA = 0.22;

// Monto neto (sin IVA) a partir del monto cargado. Solo se descuenta IVA cuando
// la compra paga IVA y el monto ya lo incluye; en el resto de los casos el monto
// ya es neto.
export function calcularMontoNeto(
  monto: number,
  pagaIva: boolean,
  ivaIncluido: boolean,
): number {
  return pagaIva && ivaIncluido ? monto / (1 + TASA_IVA) : monto;
}
