import { Workbook } from 'exceljs';
import type { FilaPago } from './fila-pago';

// Texto que va en las celdas bancarias cuando el proveedor no tiene los datos
// cargados, para que a quien paga le salte a la vista.
const FALTAN_DATOS = 'FALTAN DATOS';

interface DefinicionColumna {
  header: string;
  key: keyof FilaPago;
  width: number;
}

// Orden y nombres de las columnas del Excel de pagos. Mantener este orden
// estable: es el que ve quien ejecuta las transferencias.
const COLUMNAS: DefinicionColumna[] = [
  { header: 'N° OP', key: 'numero', width: 8 },
  { header: 'Fecha', key: 'fecha', width: 12 },
  { header: 'Proveedor', key: 'proveedor', width: 28 },
  { header: 'RUT', key: 'rut', width: 16 },
  { header: 'Banco', key: 'banco', width: 20 },
  { header: 'Tipo de cuenta', key: 'tipoCuenta', width: 16 },
  { header: 'N° de cuenta', key: 'numeroCuenta', width: 22 },
  { header: 'Monto', key: 'monto', width: 14 },
  { header: 'Moneda', key: 'moneda', width: 8 },
  { header: 'Forma de pago', key: 'formaPago', width: 20 },
  { header: 'Tipo', key: 'tipo', width: 12 },
  { header: 'Concepto', key: 'concepto', width: 36 },
  { header: 'Proyecto', key: 'proyecto', width: 28 },
  { header: 'Cliente', key: 'cliente', width: 24 },
  { header: 'Sector', key: 'sector', width: 16 },
  { header: 'Solicitante', key: 'solicitante', width: 22 },
  { header: 'Aprobado por', key: 'aprobadoPor', width: 22 },
  { header: 'OC de origen', key: 'ordenCompra', width: 12 },
];

export async function construirExcelPagos(filas: FilaPago[]): Promise<Buffer> {
  const libro = new Workbook();
  libro.creator = 'SEG Ingeniería - Gestión Interna';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Pagos a ejecutar');
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
    const bancoVacio = fila.banco === '';
    const cuentaVacia = fila.numeroCuenta === '';
    const agregada = hoja.addRow({
      ...fila,
      banco: bancoVacio ? FALTAN_DATOS : fila.banco,
      numeroCuenta: cuentaVacia ? FALTAN_DATOS : fila.numeroCuenta,
    });

    agregada.getCell('fecha').numFmt = 'dd/mm/yyyy';
    agregada.getCell('monto').numFmt = '#,##0.00';

    if (fila.faltanDatosBancarios) {
      for (const key of ['banco', 'numeroCuenta'] as const) {
        const celda = agregada.getCell(key);
        celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        celda.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC0392B' },
        };
      }
    }
  }

  hoja.autoFilter = { from: 'A1', to: 'R1' };

  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
