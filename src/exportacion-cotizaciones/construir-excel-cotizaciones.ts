import { Workbook } from 'exceljs';
import type { FilaCotizacion } from './fila-cotizacion';

interface DefinicionColumna {
  header: string;
  key: keyof FilaCotizacion;
  width: number;
}

// Orden y nombres de las columnas del Excel del listado de cotizaciones.
const COLUMNAS: DefinicionColumna[] = [
  { header: 'Fecha', key: 'fecha', width: 12 },
  { header: 'OC de origen', key: 'ordenCompra', width: 12 },
  { header: 'Estado OC', key: 'estadoOrdenCompra', width: 14 },
  { header: 'Categoría', key: 'categoria', width: 22 },
  { header: 'Proyecto', key: 'proyecto', width: 32 },
  { header: 'Cliente', key: 'cliente', width: 24 },
  { header: 'Proveedor', key: 'proveedor', width: 28 },
  { header: 'Sector', key: 'sector', width: 18 },
  { header: 'Monto total', key: 'montoTotal', width: 14 },
  { header: 'Moneda', key: 'moneda', width: 8 },
  { header: 'IVA incluido', key: 'ivaIncluido', width: 12 },
  { header: 'Comprometido en OP', key: 'comprometido', width: 18 },
  { header: 'Saldo', key: 'saldo', width: 14 },
];

const COLUMNAS_MONTO = ['montoTotal', 'comprometido', 'saldo'] as const;

export async function construirExcelCotizaciones(
  filas: FilaCotizacion[],
): Promise<Buffer> {
  const libro = new Workbook();
  libro.creator = 'SEG Ingeniería - Gestión Interna';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Cotizaciones');
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
    for (const key of COLUMNAS_MONTO) {
      agregada.getCell(key).numFmt = '#,##0.00';
    }
    // Saldo negativo = se pagó más de lo cotizado (exceso confirmado): en rojo.
    if (fila.saldo < 0) {
      agregada.getCell('saldo').font = {
        bold: true,
        color: { argb: 'FFC0392B' },
      };
    }
  }

  hoja.autoFilter = { from: 'A1', to: 'M1' };

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
