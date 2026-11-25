import { Moneda } from '../../generated/prisma/enums';

interface CuentasProveedor {
  numeroCuentaPesos: string | null;
  numeroCuentaDolares: string | null;
}

export interface CuentaParaPago {
  // Número de cuenta ya recortado; '' si el proveedor no tiene cargada la
  // cuenta que corresponde a la moneda del pago.
  numeroCuenta: string;
  // Etiqueta corta de la moneda de la cuenta, para mostrar junto al número.
  monedaCuenta: 'UYU' | 'USD';
}

// Elige la cuenta del proveedor que corresponde a la moneda del pago: pesos
// para UYU, dólares para cualquier moneda extranjera (USD/EUR). No hace
// fallback a la otra cuenta: transferir a la cuenta de otra moneda es un error,
// así que si falta la que corresponde se devuelve vacío y quien llama avisa.
export function cuentaSegunMoneda(
  proveedor: CuentasProveedor,
  moneda: Moneda,
): CuentaParaPago {
  if (moneda === Moneda.UYU) {
    return {
      numeroCuenta: proveedor.numeroCuentaPesos?.trim() ?? '',
      monedaCuenta: 'UYU',
    };
  }
  return {
    numeroCuenta: proveedor.numeroCuentaDolares?.trim() ?? '',
    monedaCuenta: 'USD',
  };
}
