import { Workbook } from 'exceljs';
import type { FilaOrdenPago } from './fila-orden-pago';

interface DefinicionColumna {
  header: string;
  key: keyof FilaOrdenPago;
  width: number;
}

// Orden y nombres de las columnas del Excel del listado de órdenes de pago.
const COLUMNAS: DefinicionColumna[] = [
  { header: 'N° OP', key: 'numero', width: 8 },
  { header: 'Fecha', key: 'fecha', width: 12 },
  { header: 'Estado', key: 'estado', width: 16 },
  { header: 'Proveedor', key: 'proveedor', width: 28 },
  { header: 'Concepto', key: 'concepto', width: 36 },
  { header: 'Monto', key: 'monto', width: 14 },
  { header: 'Moneda', key: 'moneda', width: 8 },
  { header: 'Paga IVA', key: 'pagaIva', width: 10 },
  { header: 'Forma de pago', key: 'formaPago', width: 22 },
  { header: 'Tipo', key: 'tipo', width: 12 },
  { header: 'Proyecto', key: 'proyecto', width: 32 },
  { header: 'Cliente', key: 'cliente', width: 24 },
  { header: 'Sector', key: 'sector', width: 18 },
  { header: 'Solicitante', key: 'solicitante', width: 22 },
  { header: 'OC de origen', key: 'ordenCompra', width: 12 },
];

export async function construirExcelOrdenesPago(
  filas: FilaOrdenPago[],
): Promise<Buffer> {
  const libro = new Workbook();
  libro.creator = 'SEG Ingeniería - Gestión Interna';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Órdenes de pago');
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
    agregada.getCell('fecha').numFmt = 'dd/mm/yyyy';
    agregada.getCell('monto').numFmt = '#,##0.00';
  }

  hoja.autoFilter = { from: 'A1', to: 'O1' };

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
