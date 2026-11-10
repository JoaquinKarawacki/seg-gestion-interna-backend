import { Workbook } from 'exceljs';
import type { FilaCompra } from './fila-compra';

interface DefinicionColumna {
  header: string;
  key: keyof FilaCompra;
  width: number;
}

// Orden y nombres de las columnas del Excel de órdenes de compra.
const COLUMNAS: DefinicionColumna[] = [
  { header: 'N° OC', key: 'numero', width: 8 },
  { header: 'Categoría', key: 'categoria', width: 22 },
  { header: 'Proyecto', key: 'proyecto', width: 32 },
  { header: 'Proveedor', key: 'proveedor', width: 28 },
  { header: 'Sector', key: 'sector', width: 18 },
  { header: 'Monto', key: 'monto', width: 14 },
  { header: 'Moneda', key: 'moneda', width: 8 },
  { header: 'Estado', key: 'estado', width: 14 },
];

export async function construirExcelCompras(
  filas: FilaCompra[],
): Promise<Buffer> {
  const libro = new Workbook();
  libro.creator = 'SEG Ingeniería - Gestión Interna';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Órdenes de compra');
  hoja.columns = COLUMNAS.map((columna) => ({
    header: columna.header,
    key: columna.key,
    width: columna.width,
  }));

  // Encabezado en negrita, fondo gris, y congelado al hacer scroll.
  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true };
  encabezado.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEFEFEF' },
  };
  hoja.views = [{ state: 'frozen', ySplit: 1 }];

  for (const fila of filas) {
    const agregada = hoja.addRow(fila);
    agregada.getCell('monto').numFmt = '#,##0.00';
  }

  hoja.autoFilter = { from: 'A1', to: 'H1' };

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
