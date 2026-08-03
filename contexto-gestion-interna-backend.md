# CONTEXTO_CLAUDE_CODE.md
# seg-gestion-interna-backend

Documento de referencia obligatorio para Claude Code. Leer completo antes de escribir cualquier línea de código.

---

## Visión general del sistema

`seg-gestion-interna` es el sistema centralizado de gestión operativa interna de SEG Ingeniería. Reemplaza una serie de archivos Excel que se usan para distintos procesos administrativos. El primero en implementarse es el módulo de **Órdenes de Compra (OC)**. En el futuro se agregarán más módulos (rendición de gastos, etc.) sin modificar lo existente.

El sistema tiene dos repositorios:
- `seg-gestion-interna-backend` — API REST en NestJS (este repo)
- `seg-gestion-interna-frontend` — interfaz en Next.js (repo separado)

Deploy en Railway. Base de datos PostgreSQL 16.

---

## Principios de diseño no negociables

### 1. Alta cohesión, bajo acoplamiento
Cada módulo de NestJS es una caja negra. Encapsula su controller, service, repositorio y DTOs. Los módulos se comunican únicamente a través de interfaces exportadas, nunca importando servicios internos de otro módulo directamente.

### 2. Abierto/cerrado
El sistema debe poder extenderse (nuevo módulo, nuevo tipo de documento, nueva regla de negocio) sin modificar código existente. Usamos patrones de registro (Registry) y eventos (Observer) para esto.

### 3. Clean Code
- Funciones con una sola responsabilidad
- Nombres que describen intención, no implementación
- Sin comentarios que expliquen el qué (el código lo dice). Comentarios solo para el por qué cuando no es obvio
- Máximo 3 niveles de indentación
- Funciones de máximo 20 líneas. Si crece más, extraer
- Sin números mágicos. Todo en constantes nombradas
- Sin lógica en los controllers. Los controllers solo reciben, delegan y responden

### 4. SOLID aplicado
- **S**: cada clase tiene una razón para cambiar
- **O**: extender con nuevas clases, no modificar las existentes
- **L**: las implementaciones son intercambiables por su interfaz
- **I**: interfaces pequeñas y específicas
- **D**: depender de abstracciones, no de implementaciones concretas

---

## Convenciones de nomenclatura

### Idioma
**Todo en español**, sin excepción, salvo los casos listados abajo.

Esto incluye:
- Nombres de variables, funciones, clases, interfaces, enums
- Nombres de archivos y carpetas
- Rutas de la API (`/ordenes-compra`, `/proveedores`, `/compromisos`)
- Nombres de módulos NestJS
- Mensajes de error y respuestas
- Comentarios en el código

Excepciones donde se usa inglés (restricciones técnicas):
- Clases que extienden de Passport (`JwtStrategy`, `JwtGuard`) por restricción del framework
- Decoradores propios de NestJS (`@Module`, `@Controller`, `@Injectable`, etc.)
- Nombres de variables de entorno (`DATABASE_URL`, `JWT_SECRET`, etc.)

**Corrección (decidido en Etapa 2):** los nombres de tablas y columnas en PostgreSQL **NO** van en inglés. Van en español, igual que el resto del código. Se transliteran sin tildes ni `ñ` únicamente para evitar el caracter literal problemático (ej. `contraseña` → `contrasena_hash`, no `password_hash`). Esto se logra con `@map`/`@@map` de Prisma: el modelo y los campos en el schema quedan en español "natural" (con tildes si corresponde en el nombre del campo TypeScript), y el mapeo a la columna real usa la versión sin tildes/ñ en snake_case. Ejemplo real (`prisma/schema.prisma`):

```prisma
model Usuario {
  id             String     @id @default(uuid())
  nombre         String
  email          String     @unique
  contrasenaHash String     @map("contrasena_hash")
  rol            RolUsuario
  activo         Boolean    @default(true)
  sectorId       String?    @map("sector_id")
  sector         Sector?    @relation(fields: [sectorId], references: [id])
  creadoEn       DateTime   @default(now()) @map("creado_en")
  actualizadoEn  DateTime   @updatedAt @map("actualizado_en")

  @@map("usuarios")
}
```

Los valores de enums (`RolUsuario`, `EstadoOC`, etc.) se mantienen en español SCREAMING_SNAKE_CASE sin mapear, tal como se muestra en la sección de enums más abajo.

### Archivos
```
kebab-case para archivos:
  ordenes-compra.controller.ts
  ordenes-compra.service.ts
  ordenes-compra.repositorio.ts
  crear-orden-compra.dto.ts
  orden-compra.entity.ts

Sufijos obligatorios:
  .controller.ts     — controllers
  .service.ts        — services
  .repositorio.ts    — repositorios
  .dto.ts            — DTOs
  .entity.ts         — entidades (si aplica)
  .modulo.ts         — módulos NestJS
  .guardia.ts        — guards
  .estrategia.ts     — strategies (Passport o de negocio)
  .fabrica.ts        — factories
  .evento.ts         — eventos
  .oyente.ts         — event listeners
```

### Clases e interfaces
```typescript
// Clases: PascalCase en español
class OrdenCompraServicio {}
class CrearOrdenCompraDto {}
class OrdenCompraRepositorio {}
class FabricaOrdenCompra {}
class EstrategiaAprobacionOC {}

// Interfaces: PascalCase con prefijo I
interface IOrdenCompraRepositorio {}
interface IEstrategiaAprobacion {}
interface IFabricaDocumento {}

// Enums: PascalCase, valores en SCREAMING_SNAKE_CASE español
enum EstadoOC {
  BORRADOR = 'BORRADOR',
  PENDIENTE = 'PENDIENTE',
  EN_CONSULTA = 'EN_CONSULTA',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  PAGO_OBSERVADO = 'PAGO_OBSERVADO', // Lore detectó discrepancia en la factura
  PAGADO = 'PAGADO',
  ANULADO = 'ANULADO',
}
```

### Variables y funciones
```typescript
// camelCase en español
const ordenCompra = await this.repositorio.buscarPorId(id);
const itemsConIva = calcularItemsConIva(items);

// Funciones: verbo + sustantivo
buscarPorId()
crearOrdenCompra()
calcularTotalConIva()
enviarNotificacionAprobacion()
registrarTransicionEstado()
validarItemsRequeridos()

// Booleanos: prefijo con verbo
const estaAprobada = orden.estado === EstadoOC.APROBADO;
const tieneItems = orden.items.length > 0;
const puedeAprobar = this.verificarPermisoAprobacion(usuario);
```

---

## Estructura de carpetas

```
src/
├── comun/                        # Compartido entre módulos
│   ├── decoradores/
│   │   └── auditable.decorador.ts
│   ├── filtros/
│   │   └── excepcion-global.filtro.ts
│   ├── guardias/
│   │   ├── jwt.guardia.ts
│   │   └── roles.guardia.ts
│   ├── interfaces/
│   │   ├── repositorio-base.interface.ts
│   │   └── estrategia-aprobacion.interface.ts
│   ├── pipes/
│   │   └── validacion.pipe.ts
│   └── tipos/
│       └── respuesta-api.tipo.ts
│
├── auth/
│   ├── auth.modulo.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── jwt.estrategia.ts         # excepción: nombre en inglés por Passport
│   └── dtos/
│       ├── login.dto.ts
│       └── respuesta-auth.dto.ts
│
├── usuarios/
│   ├── usuarios.modulo.ts
│   ├── usuarios.controller.ts
│   ├── usuarios.service.ts
│   ├── usuarios.repositorio.ts
│   └── dtos/
│
├── sectores/
│   ├── sectores.modulo.ts
│   ├── sectores.controller.ts
│   ├── sectores.service.ts
│   └── sectores.repositorio.ts
│
├── proveedores/
│   ├── proveedores.modulo.ts
│   ├── proveedores.controller.ts
│   ├── proveedores.service.ts
│   ├── proveedores.repositorio.ts
│   └── dtos/
│
├── clientes/
│   ├── clientes.modulo.ts
│   ├── clientes.controller.ts
│   ├── clientes.service.ts
│   ├── clientes.repositorio.ts
│   └── dtos/
│
├── proyectos/
│   ├── proyectos.modulo.ts
│   ├── proyectos.controller.ts
│   ├── proyectos.service.ts
│   ├── proyectos.repositorio.ts
│   └── dtos/
│
├── cotizaciones/
│   ├── cotizaciones.modulo.ts
│   ├── cotizaciones.controller.ts
│   ├── cotizaciones.service.ts
│   ├── cotizaciones.repositorio.ts
│   └── dtos/
│
├── ordenes-compra/
│   ├── ordenes-compra.modulo.ts
│   ├── ordenes-compra.controller.ts
│   ├── ordenes-compra.service.ts
│   ├── ordenes-compra.repositorio.ts
│   ├── fabrica-orden-compra.ts
│   ├── aprobacion/
│   │   ├── registro-aprobacion.ts          # Registry
│   │   ├── estrategia-aprobacion-oc.ts     # Strategy concreta
│   │   └── interfaces/
│   │       └── estrategia-aprobacion.interface.ts
│   ├── validaciones/
│   │   ├── cadena-validacion-oc.ts         # Chain of Responsibility
│   │   ├── validar-items.eslabonon.ts
│   │   ├── validar-proveedor.eslabon.ts
│   │   └── validar-monto.eslabon.ts
│   └── dtos/
│       ├── crear-orden-compra.dto.ts
│       ├── actualizar-orden-compra.dto.ts
│       └── respuesta-orden-compra.dto.ts
│
├── comentarios/
│   ├── comentarios.modulo.ts
│   ├── comentarios.controller.ts
│   ├── comentarios.service.ts
│   └── dtos/
│
├── notificaciones/
│   ├── notificaciones.modulo.ts
│   ├── notificaciones.service.ts          # Microsoft Graph
│   └── oyentes/
│       ├── oc-aprobada.oyente.ts              # Observer
│       ├── oc-rechazada.oyente.ts
│       ├── oc-en-consulta.oyente.ts
│       ├── oc-pago-observado.oyente.ts
│       └── cotizacion-proximo-pago.oyente.ts
│
├── almacenamiento/
│   ├── almacenamiento.modulo.ts
│   ├── puertos/
│   │   └── almacenamiento.puerto.ts       # interfaz (port/adapter)
│   └── adaptadores/
│       └── railway-volumen.adaptador.ts   # implementación Railway Volumes
│
├── auditoria/
│   ├── auditoria.modulo.ts
│   └── auditoria.service.ts
│
├── prisma/
│   ├── prisma.modulo.ts
│   └── prisma.service.ts
│
└── main.ts
```

---

## Patrones de diseño

### 1. Strategy + Registry — Motor de aprobación

Usado en: `ordenes-compra/aprobacion/`

Propósito: cada tipo de documento define sus propias transiciones de estado válidas. Agregar un nuevo tipo de documento es registrar una nueva estrategia, sin tocar el código existente.

```typescript
// Interfaz base (en comun/interfaces/)
interface IEstrategiaAprobacion {
  transicionesValidas(): Map<EstadoOC, EstadoOC[]>;
  validarTransicion(desde: EstadoOC, hacia: EstadoOC, rol: RolUsuario): void;
}

// Registry central
class RegistroAprobacion {
  private estrategias = new Map<TipoDocumento, IEstrategiaAprobacion>();

  registrar(tipo: TipoDocumento, estrategia: IEstrategiaAprobacion): void {}
  obtener(tipo: TipoDocumento): IEstrategiaAprobacion {}
}
```

Cuando llegue rendición de gastos: crear `EstrategiaAprobacionRendicion` y registrarla. Nada más.

---

### 2. Observer — Notificaciones y auditoría

Usado en: `notificaciones/oyentes/`, `auditoria/`

Propósito: las transiciones de estado emiten eventos. Los oyentes reaccionan de forma independiente. Agregar una nueva reacción (nuevo mail, nuevo log) es agregar un oyente, sin tocar el flujo principal.

```typescript
// El service emite, no sabe quién escucha
this.emisor.emit('oc.aprobada', { ordenId, aprobadoPor });

// Oyentes independientes
@OnEvent('oc.aprobada')
async manejarOcAprobada(evento: OcAprobadaEvento): Promise<void> {}
```

Usar `@nestjs/event-emitter` (EventEmitter2), consistente con `mvp-control-de-equipos-seg`.

---

### 3. Chain of Responsibility — Validaciones

Usado en: `ordenes-compra/validaciones/`

Propósito: validar una OC antes de enviarla a aprobación. Cada eslabón valida una regla. Si falla, lanza excepción. Si pasa, delega al siguiente.

```typescript
interface IEslabonValidacion {
  establecerSiguiente(eslabon: IEslabonValidacion): IEslabonValidacion;
  validar(orden: OrdenCompra): void;
}
```

Agregar una nueva regla de validación es crear un nuevo eslabón y encadenarlo.

---

### 4. Repository Pattern — Acceso a datos

Usado en: todos los módulos (`*.repositorio.ts`)

Propósito: los services no hablan con Prisma directamente. Hablan con un repositorio que implementa una interfaz. El service no sabe si los datos vienen de Postgres, un mock, o cualquier otra fuente.

```typescript
interface IRepositorioBase<T> {
  buscarPorId(id: string): Promise<T | null>;
  buscarTodos(filtros?: object): Promise<T[]>;
  crear(datos: object): Promise<T>;
  actualizar(id: string, datos: object): Promise<T>;
  eliminar(id: string): Promise<void>;
}
```

---

### 5. Factory — Construcción de documentos

Usado en: `ordenes-compra/fabrica-orden-compra.ts`

Propósito: centralizar la lógica de construcción de una OC según su tipo (SERVICIO vs ARTICULO). El controller no sabe cómo se construye, solo pide a la fábrica.

```typescript
class FabricaOrdenCompra {
  crear(tipo: TipoOC, datos: CrearOrdenCompraDto): OrdenCompraDto {}
}
```

Cuando llegue un nuevo tipo de documento, se crea una nueva fábrica.

---

### 6. Decorator — Auditoría automática

Usado en: métodos de los services que modifican datos

Propósito: registrar automáticamente en `audit_log` sin ensuciar la lógica de negocio.

```typescript
@Auditable('CREAR_OC')
async crearOrdenCompra(dto: CrearOrdenCompraDto): Promise<OrdenCompra> {
  // lógica limpia, sin código de auditoría
}
```

Reglas de auditoría (consistentes con `mvp-control-de-equipos-seg`):
- Solo operaciones de escritura
- Se registra después de que la operación fue exitosa
- Nunca dentro de una `$transaction`
- Siempre en `try/catch` que no relanza

---

## Convenciones de la API

### Rutas en español, kebab-case
```
GET    /ordenes-compra
GET    /ordenes-compra/:id
POST   /ordenes-compra
PATCH  /ordenes-compra/:id
POST   /ordenes-compra/:id/enviar
POST   /ordenes-compra/:id/aprobar
POST   /ordenes-compra/:id/rechazar
POST   /ordenes-compra/:id/comentarios
GET    /ordenes-compra/:id/comentarios
GET    /cotizaciones/:id/ordenes-compra
GET    /proyectos/:id/avance-pago
```

### Respuestas consistentes
```typescript
// Éxito
{
  "datos": { ... },
  "mensaje": "Orden de compra creada correctamente"
}

// Error
{
  "error": "ORDEN_NO_ENCONTRADA",
  "mensaje": "No existe una orden de compra con ese ID"
}

// Lista
{
  "datos": [ ... ],
  "total": 42,
  "pagina": 1,
  "porPagina": 20
}
```

### Códigos HTTP
- `200` — operación exitosa con respuesta
- `201` — recurso creado
- `204` — operación exitosa sin respuesta (DELETE)
- `400` — datos inválidos
- `401` — no autenticado
- `403` — autenticado pero sin permiso
- `404` — recurso no encontrado
- `409` — conflicto de estado (ej: intentar aprobar una OC ya aprobada)
- `422` — datos válidos pero regla de negocio violada

---

## Manejo de fechas

Uruguay es UTC-3. Nunca usar `toISOString()` para construir fechas locales porque desplaza el día.

```typescript
// MAL
const hoy = new Date().toISOString().split('T')[0];

// BIEN
const ahora = new Date();
const hoy = new Date(
  ahora.getFullYear(),
  ahora.getMonth(),
  ahora.getDate()
);
```

---

## Prisma

Versión 7.9.1 instalada. Configuración específica real (verificada, distinta de la documentación genérica de Prisma):

- `url` va en `prisma.config.ts`, no en `schema.prisma`
- El generador `prisma-client` (nuevo, reemplaza a `prisma-client-js`) por defecto emite un cliente **ESM puro** (usa `import.meta.url`), incompatible con este proyecto (NestJS + Jest + ts-jest, todo CommonJS). Por eso el generator lleva `moduleFormat = "cjs"` explícito:

```prisma
// prisma/schema.prisma
generator client {
  provider     = "prisma-client"
  output       = "../generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}
```

- `prisma.config.ts` solo configura la datasource para el CLI (migraciones/introspección). **No** lleva el adaptador ahí — el tipo `Datasource` de `@prisma/config` en esta versión solo acepta `url`/`shadowDatabaseUrl`, no `adapter`:

```typescript
// prisma.config.ts
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
```

- El adaptador `PrismaPg` se instancia al construir `PrismaClient`, no en `prisma.config.ts`. Esto vive en `src/prisma/prisma.service.ts`:

```typescript
const adaptador = new PrismaPg({ connectionString: process.env.DATABASE_URL });
super({ adapter: adaptador });
```

- Después de cada cambio de schema: `npx prisma generate` + reiniciar TS server en VS Code
- El número de OC se maneja con una secuencia PostgreSQL nativa, no con `autoincrement()` de Prisma
- **Estrategia de ID en todas las tablas: UUID** (`@id @default(uuid())`), no autoincrement
- **Scripts que importan el cliente generado (ej. `prisma/seed.ts`) deben ejecutarse con `tsx`, no con `ts-node`.** El cliente generado usa imports internos con extensión `.js` explícita apuntando a archivos `.ts` (convención moderna de TypeScript para `moduleResolution: "nodenext"`). `ts-node` en modo CommonJS no resuelve esa sustitución de extensión y falla con `MODULE_NOT_FOUND`; `tsx` sí. Por eso `package.json` tiene `"seed": "tsx prisma/seed.ts"` en vez de usar `ts-node`.

### Gotcha confirmado: `@default(dbgenerated(...))` y migraciones nuevas

El campo `numero` de `OrdenCompra` usa `@default(dbgenerated("nextval('numero_orden_compra_seq')"))` (secuencia nativa, ver más abajo). **Cada vez** que se corre `prisma migrate dev` para generar una migración nueva — sea sobre lo que sea, no tiene que tocar `OrdenCompra` ni `numero` — Prisma vuelve a proponer "resetear" ese default (un `ALTER TABLE ... SET DEFAULT / DROP DEFAULT` seguido de `DROP SEQUENCE`), porque no rastrea bien los `dbgenerated()` entre migraciones. Esto **no es un problema que se arregla una vez**, se repite en cada migración nueva mientras ese campo exista así.

**Procedimiento a seguir cada vez que se genera una migración nueva** (confirmado dos veces, Etapa 5 y Etapa 6):
1. Generar normalmente (`prisma migrate dev --name X`). Va a fallar contra la shadow database con `cannot drop sequence numero_orden_compra_seq because other objects depend on it` — es esperado.
2. Abrir `prisma/migrations/<timestamp>_X/migration.sql` y borrar las líneas espurias (`ALTER TABLE "ordenes_compra" ALTER COLUMN "numero" SET DEFAULT ...` / `ALTER COLUMN "numero" DROP DEFAULT` / `DROP SEQUENCE "numero_orden_compra_seq"`), dejando solo los cambios reales.
3. Si la migración quedó marcada como fallida en `_prisma_migrations`: `prisma migrate resolve --rolled-back <nombre_migracion>`.
4. Aplicar con `prisma migrate deploy` (no `migrate dev`, para no volver a disparar el diff que tropieza con lo mismo).
5. `prisma generate` (deploy no lo hace solo).

---

## Auth y roles

JWT + Passport. Dos guardias:
- `JwtGuardia` — verifica token válido
- `RolesGuardia` — verifica que el rol del usuario tenga permiso

```typescript
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(RolUsuario.ENCARGADO, RolUsuario.ADMIN)
@Post(':id/aprobar')
async aprobar() {}
```

Roles del sistema:
- `SOLICITANTE` — crea y consulta sus propias OCs
- `ENCARGADO` — aprueba/rechaza/consulta OCs de su sector
- `PAGOS` — marca OCs como pagadas (Lore en este módulo, puede ser otro en otros)
- `ADMIN` — acceso total

**Actualización Etapa 6:** el JWT ahora incluye `sectorId` (antes solo `{ sub, email, rol }`) — hacía falta para poder chequear en el motor de aprobación que un `ENCARGADO` solo apruebe/rechace/anule OCs de **su propio** sector (`usuario.sectorId === orden.sectorId`), sin ir a buscar el usuario a la base en cada request. Si un usuario cambia de sector vía `PATCH /usuarios/:id`, el cambio no se refleja hasta que vuelve a loguearse (el token viejo sigue teniendo el `sectorId` anterior hasta que expira o se pide uno nuevo).

---

## Modelo de dominio

**Corrección (decidido en Etapa 5, tras revisar `OC Articulos.xlsm` y `OC Servicios.xlsm` reales):** el modelo original de este documento (Ítems detallados con cantidad/precio unitario, Cotización única por Proyecto) no coincide con el proceso real. El modelo vigente:

```
Cliente
  └── Proyecto (uno o varios)
        ├── Cotización GENERAL (tareaId = null, una ACTIVA a la vez, versionada)
        │     ├── Proveedor
        │     └── Monto total + moneda
        └── Tarea (una o varias, ej. "Electricidad", "Construcción")
              └── Cotización DE LA TAREA (una ACTIVA a la vez, versionada
                    independientemente de la general y de otras tareas)
                    ├── Proveedor (el que hace esa tarea puntual)
                    └── Monto total + moneda

OC (Orden de Compra)
  ├── Proveedor (siempre obligatorio)
  ├── Sector comprador (siempre obligatorio)
  ├── Cliente / Proyecto / Tarea (opcionales, DERIVADOS automáticamente
  │     de la Cotización vinculada — nunca los manda el cliente HTTP)
  ├── Cotización vinculada (opcional)
  ├── Concepto (texto libre, NO items detallados) + Monto total + Moneda (UYU/USD/EUR)
  ├── Forma de pago, ¿paga IVA?, ¿IVA incluido?
  ├── Factura PDF adjunta (opcional)
  └── Estado → flujo de aprobación

OC suelta (sin Cliente/Proyecto/Tarea/Cotización — ej. artículos de oficina,
el "cliente" conceptual es SEG mismo, no se completa ningún Cliente)
  ├── Proveedor + Sector
  ├── Concepto + Monto + Moneda
  ├── Factura PDF adjunta (opcional)
  └── Estado → flujo de aprobación
```

Una Cotización general y las Cotizaciones de cada Tarea del mismo proyecto pueden estar todas `ACTIVA` al mismo tiempo — el versionado (marcar `REEMPLAZADA`) es independiente por cada combinación proyecto+tarea (`tareaId = null` identifica a la general).

### Avance de pago por proyecto
El sistema calcula automáticamente para cada proyecto:
- Monto total cotizado (suma de cotizaciones activas)
- Monto pagado hasta ahora (suma de OCs en estado PAGADO vinculadas al proyecto)
- Monto pendiente (diferencia)
- Porcentaje de avance

Este cálculo se expone en `GET /proyectos/:id/avance-pago`.

### Flujo de aprobación completo

```
BORRADOR
  → PENDIENTE          (solicitante envía, notifica al encargado del sector)
  → EN_CONSULTA        (encargado tiene una duda, notifica al solicitante)
  → PENDIENTE          (solicitante responde, vuelve al encargado)
  → APROBADO           (encargado aprueba, notifica a Lore)
  → RECHAZADO          (encargado rechaza, notifica al solicitante)

APROBADO
  → PAGO_OBSERVADO     (Lore revisa el PDF y el monto no coincide, notifica al solicitante y encargado)
  → PAGADO             (Lore confirma el pago)
  → ANULADO            (en cualquier momento antes de PAGADO, con motivo)
```

### Factura adjunta
- El PDF de factura es **opcional** (decidido en Etapa 5: no todos los proyectos/OCs tienen archivo, sobre todo montos chicos)
- Se sube al momento de crear o después, vía `PATCH /ordenes-compra/:id/factura`
- Lore lo abre y controla visualmente contra el monto de la OC
- Si no coincide, cambia el estado a PAGO_OBSERVADO con una nota
- El PDF se almacena en Railway Volumes (mismo patrón que `mvp-control-de-equipos-seg`)
- Máximo 10MB por archivo
- Solo se aceptan archivos PDF

---

## Variables de entorno requeridas

```env
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRACION=7d
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_TENANT_ID=
EMAIL_REMITENTE=Notificaciones@segingenieria.com
EMAILS_EN_COPIA=
NODE_ENV=development
PORT=3000
RUTA_ALMACENAMIENTO=./almacenamiento-local
```

`EMAILS_EN_COPIA` (Etapa 8): lista de emails separados por coma que van en copia en **todas** las notificaciones de OC (Franco Rodríguez, Lorena Albornoz, Natalia Melonio, según la nota de cierre de la Etapa 6). Opcional — si queda vacío, no se agrega ninguna copia.

`RUTA_ALMACENAMIENTO` es el directorio base donde `RailwayVolumenAdaptador` (`src/almacenamiento/`) guarda archivos subidos (PDFs de cotización, y en Etapa 5 la factura de OC). En Railway apunta al path donde se monta el Volume; en desarrollo local es una carpeta del proyecto (gitignored). Si no se define, cae a `./almacenamiento-local` por defecto.

---

## Comandos de Railway

```bash
# Start command del backend en Railway:
npx prisma migrate deploy && node dist/main.js

# Seeds (ejecutar contra DATABASE_PUBLIC_URL desde fuera de Railway):
DATABASE_URL=<public_url> npx tsx prisma/seed.ts
```

### Base de datos local para desarrollo

No se instala Postgres nativo en la máquina de desarrollo; se usa un contenedor Docker:

```bash
docker run -d --name seg-gestion-interna-postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=gestion_interna \
  -p 5432:5432 postgres:16

# Si el contenedor ya existe pero está parado:
docker start seg-gestion-interna-postgres
```

Requiere Docker Desktop corriendo. El `.env` local ya apunta a `postgresql://postgres:postgres@localhost:5432/gestion_interna?schema=public`.

---

## Reglas para Claude Code

1. **Leer este archivo completo antes de escribir cualquier código**
2. **Un cambio a la vez** — nunca modificar más de lo que se pide en el prompt
3. **No tocar archivos fuera del scope del prompt** — si hay algo relacionado que parece necesitar cambio, mencionarlo pero no hacerlo
4. **Siempre verificar que compila** antes de considerar una tarea terminada (`npx tsc --noEmit`)
5. **Respetar la estructura de carpetas** definida en este documento
6. **Respetar los sufijos de archivo** — nunca crear `orden.service.ts`, siempre `ordenes-compra.service.ts`
7. **Nunca lógica en los controllers** — solo recibir, delegar al service, responder
8. **Nunca Prisma en los services** — solo a través del repositorio correspondiente
9. **Siempre DTOs con validación** (`class-validator`) en los endpoints que reciben datos
10. **Los eventos se emiten después de que la operación fue exitosa**, nunca antes
11. **Auditoría siempre en try/catch que no relanza** — un fallo de auditoría no debe romper la operación principal
12. **Español en todo** — si Claude Code introduce una variable en inglés, es un error
13. **Mostrar el código en el chat a medida que se escribe** — el usuario está aprendiendo a desarrollar con este proyecto. No alcanza con crear los archivos: hay que pegar el contenido relevante en la respuesta.
14. **Al cerrar cada etapa, antes de pasar a la siguiente, hacer preguntas de comprensión** sobre el flujo y las decisiones tomadas en esa etapa.

---

## Estado actual (actualizado 2026-08-03, cierre de Etapa 8)

Repo: `github.com/JoaquinKarawacki/seg-gestion-interna-backend`, rama `main`. Se commitea y pushea automáticamente al cerrar cada etapa verificada (tsc + lint + test OK).

- ✅ **Etapa 1 — Scaffolding**: completa. NestJS + Prisma 7 (cjs) + `PrismaModulo` + filtro global + pipe global.
- ✅ **Etapa 2 — Auth**: completa. Modelos `Usuario`, `Sector`, enum `RolUsuario` (ver nota de nombres en español arriba). `JwtStrategy`, `JwtGuardia`, `RolesGuardia`, decorador `@Roles`. Endpoints `POST /auth/login` y `GET /auth/perfil`. Seed (`prisma/seed.ts`, correr con `npm run seed`) crea un usuario por rol con contraseña `Cambiar123!`.
- ✅ **Etapa 3 — Catálogos base**: completa. Decisiones tomadas:
  - **`comun/interfaces/repositorio-base.interface.ts`**: `IRepositorioBase<T, TCrear = Record<string, unknown>, TActualizar = Record<string, unknown>>` — genérico de tres parámetros (no solo `T`) para que cada repositorio concreto tipe fuerte sus entradas de `crear`/`actualizar` en vez de recibir `object` suelto.
  - **`UsuariosModulo`** (completado, no solo el mínimo de Etapa 2): CRUD ADMIN-only (`GET/POST/PATCH/DELETE /usuarios`) + `PATCH /usuarios/mi-contrasena` (cualquier autenticado, cambia su propia contraseña vía `CambiarContrasenaDto`). `eliminar` es **baja lógica** (`activo = false`), nunca DELETE físico — evita romper relaciones futuras (OCs, comentarios) y preserva trazabilidad. El admin fija la contraseña al crear; el propio usuario la cambia después.
  - **`SectoresModulo`**: solo campo `nombre` (único). CRUD ADMIN-only. `eliminar` está **bloqueado explícitamente** (422, `SECTOR_CON_USUARIOS_ASIGNADOS`) si el sector tiene usuarios asignados — la FK real usa `ON DELETE SET NULL`, que dejaría huérfanos silenciosos si no se validara en el service.
  - **Campos de `Cliente`**: `nombre`, `rut` (único, obligatorio), `email` (opcional), `telefono` (opcional).
  - **Campos de `Proveedor`**: `nombre`, `rut` (único, obligatorio), `email` (opcional), `telefono` (opcional), `banco`, `tipoCuenta` (enum `TipoCuentaBancaria`: `CAJA_AHORRO` | `CUENTA_CORRIENTE`), `numeroCuenta` — estos tres últimos **siempre obligatorios**, incluso en el alta rápida desde el formulario de OC.
  - **Permisos `ClientesModulo`**: todos los endpoints (`GET/POST/PATCH/DELETE`) abiertos a cualquier autenticado — decisión revisada luego de construir Etapa 4, ver nota más abajo.
  - **Permisos `ProveedoresModulo`**: `GET` y `POST` abiertos a cualquier autenticado (alta on-the-fly). `PATCH`/`DELETE` siguen restringidos a `ADMIN`, `PAGOS`, `ENCARGADO` (no `SOLICITANTE`) — a diferencia de `Cliente`, acá no se revisó la restricción.
  - `eliminar` en `Cliente`/`Proveedor` es DELETE físico (no baja lógica, sin bloqueo por relaciones) porque hoy no tienen ninguna relación en el schema. Esto se **va a revisar en la Etapa 4/5** cuando `Proyecto`/`OrdenCompra` los referencien — ahí se decide el `onDelete` real y si corresponde un chequeo de negocio como el de `Sectores`.
- ✅ **Etapa 4 — Proyectos y cotizaciones**: completa. Decisiones tomadas:
  - **`Proyecto`**: solo `nombre` + `clienteId` (relación obligatoria a `Cliente`). Permisos: **todos los endpoints abiertos a cualquier autenticado** (ver nota abajo). `crear`/`actualizar` atrapan `P2003` (FK inválida) y devuelven 404 `CLIENTE_NO_ENCONTRADO` en vez de un error crudo de Prisma. `eliminar` está **bloqueado** (422, `PROYECTO_CON_COTIZACIONES_ASOCIADAS`) si tiene cotizaciones — a diferencia de `Cliente`/`Proveedor` en Etapa 3, acá la relación con `Cotización` es inmediata, no diferible.
  - **`Cotización` es versionada e inmutable**: no tiene `PATCH` ni `DELETE`. Un proyecto tiene una única cotización `ACTIVA` a la vez; crear una nueva (`POST /cotizaciones`, abierto a cualquier autenticado) marca automáticamente la anterior como `REEMPLAZADA` dentro de una `$transaction` (evita que queden dos `ACTIVA` simultáneas). Por eso `ICotizacionesRepositorio` **no extiende** `IRepositorioBase<T>` — el contrato genérico de CRUD no aplica a un modelo que es deliberadamente un historial, no una entidad editable.
  - **Nota sobre permisos (revisión posterior)**: originalmente `Proyecto`/`Cotización` habían quedado restringidos a `ADMIN`/`ENCARGADO` (vía una constante `ROLES_GESTION_*` pensada para poder sumar roles fácil). Se decidió después abrirlo a cualquier autenticado — igual que `Cliente` — y se sacaron esas constantes y los `@Roles(...)` de `crear`/`actualizar`/`eliminar` en los tres controllers. `Proveedor` quedó afuera de este cambio a propósito: sigue restringido en `PATCH`/`DELETE`.
  - **Campos de `Cotización`**: `proyectoId`, `proveedorId` (ambos obligatorios), `montoTotal` (`Decimal @db.Decimal(14,2)`, nunca `Float`, para evitar errores de redondeo binario en dinero), `moneda` (enum `Moneda`: `UYU` | `USD`), `estado` (enum `EstadoCotizacion`: `ACTIVA` | `REEMPLAZADA`), `archivoPdfRuta` (opcional — no todos los proyectos tienen PDF de respaldo, sobre todo montos chicos).
  - **`AlmacenamientoModulo`** (`src/almacenamiento/`): puerto `IAlmacenamiento` (`guardar`/`eliminar`/`leer`) + adaptador `RailwayVolumenAdaptador` que en el fondo es solo I/O a un directorio (`RUTA_ALMACENAMIENTO`) — en Railway ese directorio es el Volume montado, en desarrollo es una carpeta local (`./almacenamiento-local`, gitignored). Se construyó en esta etapa (adelantado de la Etapa 5) porque `Cotización` ya necesita subir PDF, y lo reutiliza `OrdenesCompraModulo` para la factura.
  - `POST /cotizaciones` recibe `multipart/form-data` (campos + archivo opcional vía `FileInterceptor('archivo')`). Validación de archivo con `ParseFilePipe` (`FileTypeValidator` solo PDF + `MaxFileSizeValidator` 10MB, `fileIsRequired: false`). Si falla la creación en la base después de guardar el archivo, el service revierte (borra) el archivo ya escrito para no dejar huérfanos en disco.
  - **Retrofit de Etapa 3**: `ClientesService.eliminar` y `ProveedoresService.eliminar` ahora también bloquean (422) si tienen `Proyecto`/`Cotización` asociados, respectivamente — es el mismo patrón de `Sectores`, aplicado porque la relación real recién aparece en esta etapa.
  - **Pendiente explícito para la Etapa 5**: `GET /proyectos/:id/avance-pago` (monto cotizado vs. pagado) no se implementa todavía porque depende de `OrdenesCompra` en estado `PAGADO`, que no existe hasta la próxima etapa.
- ✅ **Etapa 5 — Órdenes de compra (núcleo)**: completa. Se revisaron `OC Articulos.xlsm` y `OC Servicios.xlsm` (las planillas reales) antes de diseñar el schema — cambió varios supuestos del plan original:
  - **Sin Factory**: los dos Excel resultaron ser estructuralmente idénticos (mismas columnas, mismo formulario) — no hay variación real entre "servicio" y "artículo" que amerite un Factory con variantes. `tipo` (`TipoOC`: `ARTICULO` | `SERVICIO`) quedó como un campo descriptivo simple en `OrdenCompra`, igual que `rol` en `Usuario` — no cambia comportamiento ni estructura.
  - **Sin ítems detallados**: la planilla real usa un solo campo `concepto` (texto libre) y un `monto` total único por OC, no una tabla de líneas con cantidad/precio unitario como decía el plan original.
  - **Modelo `Tarea` nuevo** (no estaba planeado): un Proyecto tiene una cotización **general** (`tareaId = null`) y además puede dividirse en Tareas (Electricidad, Construcción, etc.), cada una con su propia cotización versionada independientemente — pueden convivir varias `ACTIVA` a la vez dentro del mismo proyecto, una por tarea. Ver "Modelo de dominio" más arriba.
  - **Campos nuevos descubiertos en el Excel real, agregados a `OrdenCompra`**: `formaPago` (enum `FormaPago`: `CONTADO_CONTRA_ENTREGA` | `TARJETA_CREDITO` | `DIFERIDO` | `GIRO_RED_COBRANZA` | `TRANSFERENCIA_BANCARIA`), `pagaIva`/`ivaIncluido` (booleanos independientes), `sectorId` (obligatorio — el sector que compra, determina a quién se le manda el mail de aprobación en el proceso manual actual).
  - **Retrofit de enums compartidos**: `Moneda` pasa a tener `EUR` además de `UYU`/`USD` (afecta también a `Cotización`, ya creada en Etapa 4). `TipoCuentaBancaria` (en `Proveedor`, Etapa 3) suma `EXTERIOR`.
  - **Diseño "derivar en vez de confiar"**: `OrdenCompra` guarda `clienteId`/`proyectoId`/`tareaId` para poder filtrar/reportar sin joins, pero **el cliente HTTP nunca los manda** — el service los deriva automáticamente navegando desde `cotizacionId` (si viene) hacia `Cotización.proyectoId`/`tareaId` y `Proyecto.clienteId`. Evita la clase entera de bugs de "IDs redundantes que no coinciden entre sí".
  - **Chain of Responsibility real** (`src/ordenes-compra/validaciones/`): dos eslabones con reglas de negocio genuinas (no solo "campo no vacío", eso ya lo hace el DTO):
    1. `ValidarProveedorCoincideCotizacionEslabon`: si hay `cotizacionId`, el `proveedorId` de la OC debe coincidir con el de esa cotización.
    2. `ValidarMontoNoExcedeCotizacionEslabon`: si hay `cotizacionId`, la suma de OCs ya cargadas contra ella (excluyendo `ANULADO`, y excluyéndose a sí misma en un `PATCH`) más el monto nuevo no puede superar `Cotizacion.montoTotal`.
  - **Número correlativo**: secuencia nativa de Postgres (`numero_orden_compra_seq`), no `autoincrement()` de Prisma. Como Prisma no puede generar el `CREATE SEQUENCE` desde el schema, la migración se generó con `--create-only` y se editó a mano para insertar esa línea antes del `CREATE TABLE`. Campo `numero` con `@default(dbgenerated("nextval('numero_orden_compra_seq')"))`.
  - **Factura opcional**: `POST /ordenes-compra` acepta `multipart/form-data` con factura opcional (mismo patrón que `Cotización`). Además hay `PATCH /ordenes-compra/:id/factura` para adjuntar/reemplazar después (borra el archivo viejo del disco si había uno), y `GET /ordenes-compra/:id/factura` / `GET /cotizaciones/:id/archivo` para descargar (usan `StreamableFile` de Nest). Si la creación falla después de guardar el archivo, se revierte (se borra) para no dejar huérfanos.
  - **Permisos**: todo abierto a cualquier autenticado (crear/editar/eliminar en `BORRADOR`), igual que `Cliente`/`Proyecto`/`Cotización`.
  - **Retrofit de eliminar() en cascada**: `Sectores`, `Clientes`, `Proveedores` y `Proyectos` ahora también bloquean (422) si tienen `OrdenCompra` asociadas. `Proyectos` además bloquea si tiene `Tarea` asociadas (relación que apareció recién en esta etapa). `Tareas` (nuevo) bloquea si tiene cotizaciones u OCs asociadas.
  - **Pendiente explícito para la Etapa 6**: `GET /proyectos/:id/avance-pago` sigue sin implementarse — aunque `OrdenCompra` ya existe, el campo `estado` recién se puede transicionar a `PAGADO` cuando se construya el motor de aprobación.
- ✅ **Etapa 6 — Motor de aprobación**: completa. Decisiones tomadas:
  - **Sin Strategy/Registry**: el plan original preveía un `RegistroAprobacion` para poder registrar distintos tipos de documento (OC, y a futuro rendición de gastos) con su propia estrategia de transiciones. Como rendición de gastos todavía no existe ni está diseñada, se simplificó — una tabla de transiciones (`TRANSICIONES_VALIDAS_OC: Record<EstadoOC, EstadoOC[]>`, en `src/ordenes-compra/aprobacion/transiciones-oc.ts`) definida directamente para OC, sin capa de indirección. Se agrega el Registry cuando el segundo tipo de documento exista de verdad — mismo criterio que ya se aplicó con el Factory de `TipoOC` en la Etapa 5.
  - **`HistorialEstadoOC`**: tabla de auditoría específica de transiciones de OC (estado anterior, estado nuevo, usuario que la hizo, motivo opcional, fecha). Se escribe atómicamente junto con el cambio de `estado` de la OC, dentro de un único `$transaction` en `OrdenesCompraRepositorio.cambiarEstado()` (mismo repositorio, no uno separado — la tabla de historial está fuertemente acoplada a `OrdenCompra`, no amerita su propio módulo).
  - **Endpoints de transición** (`OrdenesCompraAprobacionController`, comparte el prefijo `/ordenes-compra` con `OrdenesCompraController` pero es un controller separado — CRUD vs. flujo de aprobación quedan en archivos distintos):
    - `POST /ordenes-compra/:id/enviar` (BORRADOR→PENDIENTE) — cualquier autenticado
    - `POST /ordenes-compra/:id/aprobar` / `rechazar` (PENDIENTE→APROBADO/RECHAZADO) — `ENCARGADO`, y además debe ser del **mismo sector** que la OC (`usuario.sectorId === orden.sectorId`, chequeado en el service, no alcanza con el `@Roles` del guard). `rechazar` exige `motivo`.
    - `POST /ordenes-compra/:id/observar-pago` (APROBADO→PAGO_OBSERVADO, motivo obligatorio) y `confirmar-pago` (→PAGADO) — `PAGOS`
    - `POST /ordenes-compra/:id/resolver-observacion` (PAGO_OBSERVADO→APROBADO, motivo opcional) — `PAGOS`, endpoint nuevo que no estaba en el diagrama original (el diagrama no decía qué pasaba después de `PAGO_OBSERVADO`)
    - `POST /ordenes-compra/:id/anular` (cualquier estado antes de `PAGADO`→ANULADO, motivo obligatorio) — `ADMIN` sin restricción, o `ENCARGADO` también limitado a su sector
    - `GET /ordenes-compra/:id/historial` — cualquier autenticado
  - **`EN_CONSULTA` ↔ `PENDIENTE` ya están en la tabla de transiciones**, pero todavía no tienen un endpoint HTTP propio — se disparan desde el módulo de Comentarios (Etapa 7: crear un comentario pasa a `EN_CONSULTA`, responder vuelve a `PENDIENTE`), que va a llamar al mismo service.
  - **Retrofit de `AuthModulo`**: el JWT ahora lleva `sectorId` (ver nota en "Auth y roles" más arriba) — necesario para el chequeo de sector en `aprobar`/`rechazar`/`anular`.
  - **Nota para la Etapa 8 (Notificaciones)**: en el proceso real, además de a quien corresponda aprobar, siempre hay personas en copia en el mail (coincide con lo visto en la hoja "INSTRUCCIONES DE USO" del Excel: Franco Rodríguez, Lorena Albornoz, Natalia Melonio) — pendiente para cuando se construya ese módulo.
  - **Gotcha de migraciones con `dbgenerated()`**: se repitió el problema de la Etapa 5 con la secuencia de `numero` (ver sección "Prisma" más arriba, ahora con el procedimiento documentado paso a paso).
- ✅ **Etapa 7 — Comentarios**: completa. Decisiones tomadas:
  - **Retrofit necesario, descubierto al diseñar la etapa**: `OrdenCompra` no tenía ningún campo que identificara a quien la creó. Se agregó `solicitanteId` (obligatorio, `@relation` a `Usuario`), derivado automáticamente del usuario autenticado en `OrdenesCompraService.crear()` — igual criterio "derivar en vez de confiar" que ya se usaba para `clienteId`/`proyectoId`/`tareaId` en la Etapa 5. El cliente HTTP nunca lo manda. Esto obligó a que `OrdenesCompraController.crear()` empiece a leer `@Req()` (antes no lo necesitaba).
  - **`Comentario` es inmutable**: sin `PATCH`/`DELETE`, mismo criterio que `Cotización`/`HistorialEstadoOC` — es un hilo de conversación (historial), no una entidad editable. `IComentariosRepositorio` **no extiende** `IRepositorioBase<T>` por la misma razón que `ICotizacionesRepositorio` no lo hace.
  - **La transición automática de estado NO es "cualquier comentario cambia el estado"**: se dispara solo por combinación rol+estado, decidida explícitamente para evitar transiciones no deseadas (ej. un ADMIN opinando no debería mover el flujo de aprobación):
    - OC en `PENDIENTE` + comenta el `ENCARGADO` **del mismo sector** que la OC (`usuario.sectorId === orden.sectorId`, mismo chequeo que en `aprobar`/`rechazar` de la Etapa 6) → pasa a `EN_CONSULTA`.
    - OC en `EN_CONSULTA` + comenta **el solicitante** (por identidad: `usuario.id === orden.solicitanteId`, no por rol) → vuelve a `PENDIENTE`.
    - Cualquier otro comentario (un ADMIN, una segunda pregunta del mismo encargado antes de que respondan, etc.) queda en el hilo sin alterar el estado de la OC.
  - **Se puede comentar en cualquier estado de la OC** (útil para dudas post-aprobación, ej. Lore preguntando algo estando en `PAGO_OBSERVADO`). Solo los dos casos de arriba disparan la transición automática; el resto de los comentarios simplemente se guardan.
  - **Límite de módulo respetado**: `ComentariosModulo` importa `OrdenesCompraModulo` y usa únicamente lo que ese módulo exporta — no importa nada del `aprobacion/` interno directamente (esa carpeta no está exportada como archivos sueltos). Por eso `ComentariosService` compara `orden.estado` directamente contra `EstadoOC.PENDIENTE`/`EstadoOC.EN_CONSULTA` en vez de reusar `TRANSICIONES_VALIDAS_OC` (archivo interno de `ordenes-compra/aprobacion/`, nunca exportado). **Actualizado en la Etapa 8**: para escribir el cambio de estado, `ComentariosService` ya no llama a `cambiarEstado()` del repositorio directamente — ahora `OrdenesCompraModulo` también exporta la clase `OrdenesCompraAprobacionService`, y `ComentariosService` llama a sus métodos públicos `marcarEnConsulta()`/`responderConsulta()`. Sigue siendo comunicación solo por lo que el módulo exporta, ahora son dos cosas exportadas (el token del repositorio + ese service) en vez de una.
  - **Endpoints**: `POST /ordenes-compra/:id/comentarios` y `GET /ordenes-compra/:id/comentarios`, ambos abiertos a cualquier autenticado (igual criterio que el resto del sistema desde la Etapa 4). `ComentariosController` comparte el prefijo `/ordenes-compra` con `OrdenesCompraController` y `OrdenesCompraAprobacionController`, como controller separado (mismo patrón que la Etapa 6).
  - **Probado end-to-end manualmente** (login real + Postgres local): comentario de `ADMIN` en `PENDIENTE` no cambia el estado; comentario del `ENCARGADO` del sector correcto en `PENDIENTE` pasa a `EN_CONSULTA`; comentario del solicitante en `EN_CONSULTA` vuelve a `PENDIENTE`; el hilo lista los 3 comentarios en orden cronológico.
  - **Pendiente explícito para la Etapa 8 (Notificaciones)**: cada comentario nuevo debería notificar a la otra parte (mismo patrón "notifica a X" ya anotado para las transiciones de la Etapa 6) — no se implementó en esta etapa porque el módulo de notificaciones todavía no existe.
- ✅ **Etapa 8 — Notificaciones**: completa. Se revisó primero el repo hermano `mvp-control-de-equipos-seg` para no inventar el patrón (cliente Microsoft Graph vía client-credentials flow, fail-soft; un solo evento genérico emitido desde el service). Decisiones tomadas:
  - **Un solo punto de emisión del evento**: se agregaron los métodos públicos `marcarEnConsulta(id, usuario)` y `responderConsulta(id, usuario)` en `OrdenesCompraAprobacionService` (mismo shape que `enviar()`), y `ComentariosService` los usa en vez de llamar directo a `ordenesCompraRepositorio.cambiarEstado()`. Así **todas** las transiciones —tanto las de los endpoints de aprobación como las disparadas por comentarios— pasan por el mismo `ejecutarTransicion()` privado, que es el único lugar que emite el evento `EVENTOS.ORDEN_COMPRA_ESTADO_CAMBIADO` (`src/ordenes-compra/eventos/`). `OrdenesCompraModulo` ahora exporta también la clase `OrdenesCompraAprobacionService` (antes solo el token del repositorio).
  - **Un solo evento genérico, no uno por transición**: desviación deliberada del plan original de este documento (que preveía 5 archivos `.oyente.ts`, uno por tipo de transición) — se siguió el patrón real y ya probado del repo hermano (`equipo.estado.cambiado`): un evento con `estadoAnterior`/`estadoNuevo` en el payload, y un único oyente que ramifica internamente.
  - **`OrdenCompraEstadoCambiadoOyente`** (`src/notificaciones/oyentes/`): escucha el evento, resuelve destinatarios reales por tipo (`SOLICITANTE`, `ENCARGADO_SECTOR`, `ROL_PAGOS`) usando el nuevo `IUsuariosRepositorio.buscarActivosPorRol(rol, sectorId?)`, les suma la copia fija de `EMAILS_EN_COPIA` (variable de entorno, lista separada por comas — se aplica a **todas** las notificaciones de OC, no solo a las que van al encargado), deduplica y llama a `CorreoService.enviar(...)`.
  - **`plantillas-orden-compra.ts`**: mapea `estadoNuevo` (con un caso especial en `APROBADO`, que además mira `estadoAnterior` porque se llega desde `PENDIENTE` — notifica a `PAGOS` — o desde `PAGO_OBSERVADO` vía `resolverObservacion` — notifica a solicitante+encargado, mismo destinatario que el resto de transiciones sin destinatario definido en el diagrama original, `→PAGADO`/`→ANULADO`, decidido por consistencia) a destinatarios + asunto/cuerpo del mail.
  - **`CorreoService`** (`src/notificaciones/correo.service.ts`): mismo client-credentials flow que el repo hermano, pero usando `ConfigService` inyectado (no `process.env` directo, siguiendo la convención ya usada en `RailwayVolumenAdaptador`) para `AZURE_TENANT_ID`/`AZURE_CLIENT_ID`/`AZURE_CLIENT_SECRET`/`EMAIL_REMITENTE`. Si falla el envío, **loguea con `Logger.error` y no relanza** — un mail caído nunca rompe la operación que lo disparó.
  - **`NotificacionesModulo`** sin controllers ni exports: se conecta con el resto del sistema únicamente a través del evento (Observer), desacoplado a propósito — ningún otro módulo lo importa.
  - **"Notificación de próximo pago de compromiso"** (mencionada en el plan original, con `@nestjs/schedule`): **dejada explícitamente afuera de esta etapa**. No existe ningún campo de fecha de vencimiento en `OrdenCompra` ni `Cotización` que la respalde — construirla habría sido inventar un dato sin proceso real confirmado. `@nestjs/schedule` no se instaló. Si se retoma en el futuro, primero hay que definir y agregar ese campo (candidato: `fechaVencimientoPago` opcional en `OrdenCompra`) confirmando el proceso real con el usuario.
  - **Probado end-to-end manualmente** (login real + Postgres local, sin credenciales reales de Azure AD): se repitió el flujo de comentarios de la Etapa 7 y se confirmó en los logs que el oyente se disparó las 3 veces esperadas (enviar→PENDIENTE, comentario del encargado→EN_CONSULTA, respuesta del solicitante→PENDIENTE), intentó pedir el token de Azure, falló (esperado, `AZURE_TENANT_ID` vacío) y quedó logueado como error **sin romper ninguna respuesta HTTP** — confirma el comportamiento fail-soft.
  - **Pendiente para más adelante (no es de esta etapa)**: cargar `AZURE_CLIENT_ID`/`AZURE_CLIENT_SECRET`/`AZURE_TENANT_ID` reales (permiso `Mail.Send` en Azure AD) y `EMAILS_EN_COPIA` con los emails reales de Franco Rodríguez, Lorena Albornoz y Natalia Melonio, para poder probar el envío real.

---

## Plan de etapas

### Etapa 1 — Scaffolding y configuración base
Inicializar proyecto NestJS. Configurar Prisma 7 con adaptador PrismaPg. Configurar Jest. Configurar variables de entorno. Estructura de carpetas base. Módulo `PrismaModulo`. Filtro global de excepciones. Pipe global de validación.

### Etapa 2 — Auth
Módulo `AuthModulo` completo. JWT + Passport. `JwtGuardia` y `RolesGuardia`. Decorator `@Roles`. Endpoints: `POST /auth/login`, `GET /auth/perfil`. Seed con usuarios de prueba por rol.

### Etapa 3 — Catálogos base
Módulos `UsuariosModulo`, `SectoresModulo`, `ProveedoresModulo`, `ClientesModulo`. CRUD completo con repositorios e interfaces. Alta on-the-fly de proveedores y clientes desde el formulario de OC.

### Etapa 4 — Proyectos y cotizaciones
Módulos `ProyectosModulo` y `CotizacionesModulo`. Un proyecto pertenece a un cliente, tiene varias cotizaciones (pueden cambiar con el tiempo). Una cotización tiene proveedor, monto total y moneda. El sistema calcula automáticamente el avance de pago por proyecto sumando las OCs pagadas contra el monto cotizado.

### Etapa 5 — Órdenes de compra (núcleo)
Módulo `OrdenesCompraModulo`. Factory, Repository, Chain of Responsibility para validaciones. CRUD. Número correlativo con secuencia PostgreSQL. Relaciones con proveedor, cliente, proyecto, cotización (todas opcionales salvo proveedor). Upload de factura PDF con almacenamiento en Railway Volumes (puerto/adaptador igual que `mvp-control-de-equipos-seg`). Validación: solo PDF, máximo 10MB.

### Etapa 6 — Motor de aprobación
Strategy + Registry. Transiciones de estado incluyendo `PAGO_OBSERVADO`. Historial de estados. Endpoints de transición (`/enviar`, `/aprobar`, `/rechazar`, `/observar-pago`, `/confirmar-pago`, `/anular`). Validación de rol por transición: solo `PAGOS` puede transicionar a `PAGO_OBSERVADO` y `PAGADO`.

### Etapa 7 — Comentarios
Módulo `ComentariosModulo`. Hilo por OC. Crear comentario cambia estado a `EN_CONSULTA`. Responder del solicitante vuelve a `PENDIENTE`.

### Etapa 8 — Notificaciones
Módulo `NotificacionesModulo`. Microsoft Graph. Oyentes Observer por evento. Mails en cada transición de estado. Notificación de próximo pago de compromiso con `@nestjs/schedule`.

### Etapa 9 — Auditoría
Decorator `@Auditable`. `AuditoriaServicio`. Endpoint `GET /auditoria` solo para ADMIN.

### Etapa 10 — Seed de datos reales y ajustes finales
Seed con sectores, usuarios reales (sin contraseñas reales), proveedores del historial Excel. Migración de historial de OCs existente. Deploy en Railway.
