// Emails que van en COPIA (CC) de las notificaciones de OC/OP, según el sector
// de la orden. Reemplaza al viejo EMAILS_EN_COPIA global (una sola lista para
// todo). La clave es el nombre del sector normalizado (mayúsculas, sin espacios
// de más), así que no importa cómo esté escrito el sector en la base.

const GESTION = [
  'albornoz@segingenieria.com',
  'mgonzalez@segingenieria.com',
  'rodriguez@segingenieria.com',
  'marichal@segingenieria.com',
  'garfinkel@segingenieria.com',
];

// Administración y Ventas comparten la misma copia.
const ADMINISTRACION_Y_VENTAS = [
  'rodriguez@segingenieria.com',
  'mgonzalez@segingenieria.com',
];

const EMAILS_COPIA_POR_SECTOR: Record<string, string[]> = {
  AE: GESTION,
  ECR: GESTION,
  ISO: GESTION,
  CONSULTING: GESTION,
  // "SEG EMOVE" (alias Emove). Se dejan las dos variantes por si el nombre real
  // del sector en la base es sólo "EMOVE".
  'SEG EMOVE': GESTION,
  EMOVE: GESTION,
  // GreenPower
  RENOVABLES: [
    'rodriguez@segingenieria.com',
    'soto@segingenieria.com',
    'schaich@segingenieria.com',
  ],
  HELIOTEC: [
    'garfinkel@segingenieria.com',
    'acosta@segingenieria.com',
    'rodriguez@segingenieria.com',
  ],
  ADMINISTRACION: ADMINISTRACION_Y_VENTAS,
  VENTAS: ADMINISTRACION_Y_VENTAS,
};

function normalizar(nombreSector: string): string {
  return nombreSector.trim().toUpperCase();
}

// Devuelve la lista de copia para el sector dado. Si el sector no tiene una
// lista definida (ej. INDICADORES), devuelve vacío (sin copia).
export function obtenerEmailsEnCopiaPorSector(nombreSector: string): string[] {
  return EMAILS_COPIA_POR_SECTOR[normalizar(nombreSector)] ?? [];
}
