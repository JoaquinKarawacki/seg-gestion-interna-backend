// Emails que van en COPIA (CC) de las notificaciones de OC/OP, según el sector
// de la orden. Reemplaza al viejo EMAILS_EN_COPIA global (una sola lista para
// todo). La clave es el nombre del sector normalizado (mayúsculas, sin espacios
// de más), así que no importa cómo esté escrito el sector en la base.
//
// El encargado del sector NO va en estas listas: siempre recibe la notificación
// por separado. Acá van sólo los destinatarios en copia adicionales.

// Grupo "Gestión": comparten la misma copia. Incluye Administración y Ventas.
const GESTION = [
  'mgonzalez@segingenieria.com',
  'rodriguez@segingenieria.com',
  'marichal@segingenieria.com',
  'albornoz@segingenieria.com',
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
  'RENOVABLES - ESCO': GESTION,
  ADMINISTRACION: GESTION,
  VENTAS: GESTION,
  HELIOTEC: [
    'albornoz@segingenieria.com',
    'rodriguez@segingenieria.com',
    'acosta@segingenieria.com',
  ],
  'SEG GREEN POWER': [
    'schaich@segingenieria.com',
    'rodriguez@segingenieria.com',
    'soto@segingenieria.com',
  ],
};

function normalizar(nombreSector: string): string {
  return nombreSector.trim().toUpperCase();
}

// Devuelve la lista de copia para el sector dado. Si el sector no tiene una
// lista definida (ej. INDICADORES), devuelve vacío (sin copia).
export function obtenerEmailsEnCopiaPorSector(nombreSector: string): string[] {
  return EMAILS_COPIA_POR_SECTOR[normalizar(nombreSector)] ?? [];
}
