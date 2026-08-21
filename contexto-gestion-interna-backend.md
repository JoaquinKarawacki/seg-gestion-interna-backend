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
- **Estrategia de ID en todas las tablas: UUID** (`@id @default(uuid())`), no autoincrement (esto es solo para los `id` — el campo `numero` de `OrdenCompra` sí usa `autoincrement()`, ver más abajo)
- **Scripts que importan el cliente generado (ej. `prisma/seed.ts`) deben ejecutarse con `tsx`, no con `ts-node`.** El cliente generado usa imports internos con extensión `.js` explícita apuntando a archivos `.ts` (convención moderna de TypeScript para `moduleResolution: "nodenext"`). `ts-node` en modo CommonJS no resuelve esa sustitución de extensión y falla con `MODULE_NOT_FOUND`; `tsx` sí. Por eso `package.json` tiene `"seed": "tsx prisma/seed.ts"` en vez de usar `ts-node`.

### Gotcha de `@default(dbgenerated(...))` — resuelto (2026-08-20)

**Historia (ya no aplica, queda como referencia):** el campo `numero` de `OrdenCompra` usaba `@default(dbgenerated("nextval('numero_orden_compra_seq')"))` (una secuencia creada a mano porque en su momento se creyó que Prisma no podía generar el `CREATE SEQUENCE` desde `autoincrement()`). Cada `prisma migrate dev` — tocara o no `OrdenCompra` — volvía a proponer "resetear" ese default, porque Prisma no rastrea bien los `dbgenerated()` entre migraciones. Había que limpiar el SQL a mano en cada migración nueva (procedimiento documentado históricamente en versiones previas de este archivo).

**Resuelto**: se cambió el campo a `numero Int @unique @default(autoincrement())`. Resultó que la secuencia ya existente (`numero_orden_compra_seq`, con su valor actual) es estructuralmente idéntica a lo que Prisma espera de `autoincrement()` — el diff contra la base real quedó **vacío** (`prisma migrate diff --from-config-datasource ... --to-schema ...`), no hizo falta ninguna migración física ni tocar el valor de la secuencia. Confirmado con `prisma migrate dev --create-only` corriendo limpio sin pedir nada, y con una OC de prueba real que siguió numerando correctamente a continuación de la última (`numero: 20`, sin colisión). En el camino también se corrigió el checksum de la migración de Etapa 7 (`_prisma_migrations`, ver "riesgos operacionales" más abajo) — **`prisma migrate dev` ya no está bloqueado**, funciona normal para migraciones futuras.

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

**Corrección 2 (2026-08-20):** la "Cotización GENERAL" (`tareaId = null`) que describía este diagrama antes ya no existe — se reemplazó por una entidad separada, `PropuestaInversion` (ver detalle más abajo). `Cotizacion.tareaId` es obligatorio desde entonces: toda Cotización pertenece a una Tarea.

```
Cliente
  └── Proyecto (uno o varios)
        ├── Propuesta de Inversión (una ACTIVA a la vez, versionada,
        │     puramente informativa — NO se vincula a ninguna OC)
        │     ├── Costo total aproximado + Ahorro mensual + Cantidad de
        │     │     meses + % que se queda SEG
        │     ├── Honorarios (calculado: meses × ahorro mensual × %SEG,
        │     │     no se persiste como columna)
        │     └── Archivo adjunto opcional (PDF, Word o imagen)
        └── Tarea (una o varias, ej. "Electricidad", "Construcción")
              └── Cotización DE LA TAREA (una ACTIVA a la vez, versionada
                    independientemente de las otras tareas — `tareaId`
                    obligatorio, ya no existe la cotización general)
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

Las Cotizaciones de cada Tarea del mismo proyecto pueden estar todas `ACTIVA` al mismo tiempo — el versionado (marcar `REEMPLAZADA`) es independiente por cada Tarea. La Propuesta de Inversión versiona por separado, a nivel de todo el Proyecto (una `ACTIVA` a la vez por proyecto, sin dimensión de tarea).

**Consecuencia aceptada explícitamente (2026-08-20):** como `Cotizacion.tareaId` ahora es obligatorio y `PropuestaInversion` no se vincula a `OrdenCompra`, ya no existe el caso "OC a nivel proyecto sin tarea" — toda OC vinculada a una `Cotizacion` (vía `cotizacionId`) va a derivar siempre un `tareaId`. Una OC sigue pudiendo existir "suelta" (sin `cotizacionId`, sin Cliente/Proyecto/Tarea).

### Avance de pago por proyecto

**Estado (2026-08-20): resuelto por otro camino, `GET /proyectos/:id/avance-pago` decidido no implementar por ahora** — ver detalle en el punto 8 de "Bugs confirmados" más abajo. Queda esta sección igual (en vez de borrarla) como referencia de qué iba a calcular ese endpoint, por si en el futuro hace falta retomarlo server-side.

El plan original preveía que el sistema calculara automáticamente para cada proyecto, expuesto en `GET /proyectos/:id/avance-pago`:
- Monto total cotizado (suma de cotizaciones activas)
- Monto pagado hasta ahora (suma de OCs en estado PAGADO vinculadas al proyecto)
- Monto pendiente (diferencia)
- Porcentaje de avance

**Actualización 2026-08-19**: se implementó una versión de esto (tarjeta "Comprometido" del detalle de Proyecto), pero **sin este endpoint** — el cálculo (costo aproximado, honorarios, costo SEG, gastado, margen de equipo) se hace 100% client-side en el frontend (`lib/proyectos/presentacion.ts`, `calcularResumenCostos`), reusando los listados de cotizaciones/OC del proyecto que la pantalla ya trae. Cambios reales de backend para esto:
- ~~`Cotizacion.honorarios` (`Decimal?`) — solo válido en la cotización GENERAL (`tareaId` null)~~ — **reemplazado el 2026-08-20**, ver más abajo.
- `Proyecto.costoSegManual` (`Decimal?`) — override manual de "costo SEG" (por defecto se calcula como la suma de cotizaciones de tarea activas). Se setea vía `PATCH /proyectos/:id`, se limpia (vuelve a `null`, o sea "recalcular") vía `POST /proyectos/:id/recalcular-costo-seg`.
- **Actualización 2026-08-20**: ya no es "una cotización general" la fuente de la moneda de referencia — desde el cambio de `PropuestaInversion` (ver más arriba), el costo aproximado/honorarios salen de la propuesta de inversión activa del proyecto, y las cotizaciones de tarea/OC pagadas en otra moneda se convierten (no se excluyen) usando `TipoCambio`.

**Actualización 2026-08-19 (mismo día, ajuste posterior)**: se agregó conversión real de moneda — el ítem "Tipo de cambio / conversión de moneda" que estaba pendiente en `contexto-gestion-interna-frontend.md` desde la Fase 2 (con el enfoque ya decidido ahí: lo administra un ADMIN dentro de la app) quedó implementado. Modelo nuevo `TipoCambio { moneda: Moneda @unique, valorEnUyu: Decimal }` — solo tiene filas para `USD`/`EUR` (UYU es la base, tasa 1 implícita, sin fila propia); se seedean en 1 (`prisma/seed.ts`) para que `GET /tipos-cambio` nunca truene antes de que un ADMIN las actualice. Módulo nuevo `src/tipos-cambio/` (mismo patrón que `sectores/`): `GET /tipos-cambio` (cualquier rol autenticado), `PATCH /tipos-cambio/:moneda` (`@Roles(ADMIN)`, rechaza `UYU` con 422 `MONEDA_NO_EDITABLE`). El frontend ahora convierte (no excluye) montos entre monedas usando estas tasas — ver `lib/proyectos/presentacion.ts` en el repo hermano.

**Actualización 2026-08-20 (cambio de modelo: Propuesta de Inversión reemplaza a la cotización general)**: el usuario pidió separar la propuesta comercial que se le pasa al cliente (a nivel de todo el proyecto) de las cotizaciones de proveedores por tarea, que hasta ahora vivían mezcladas en la misma entidad `Cotizacion` (la "cotización general", `tareaId = null`, con su campo `honorarios` opcional). Cambios de backend:
- `Cotizacion.tareaId` pasa a ser **obligatorio** (antes `String?`, ahora `String`) — ya no se puede crear una cotización sin tarea. Se eliminó la columna `Cotizacion.honorarios` por completo (migración `20260820135933_agregar_propuesta_inversion_y_tarea_obligatoria`, que primero limpia las filas de prueba con `tarea_id IS NULL` — confirmado con el usuario que no había datos reales en juego, solo pruebas propias). Se eliminó también `CotizacionesRepositorio.buscarActivaGeneralPorProyecto()` y la ruta `GET /proyectos/:proyectoId/cotizaciones/activa` (ya no tiene sentido, no hay más cotización a nivel proyecto).
- Módulo nuevo `src/propuestas-inversion/` (mismo patrón de módulo simple y versionado inmutable que `cotizaciones/`, `PropuestasInversionRepositorio.crearNuevaVersion()` versiona solo por `proyectoId`, sin dimensión de tarea). Modelo `PropuestaInversion`: `proyectoId`, `costoTotalAproximado`, `ahorroMensual`, `cantidadMeses` (Int), `porcentajeSeg` (`Decimal(5,2)`, 0-100), `moneda`, `estado` (reusa el enum `EstadoCotizacion`), y tres campos de archivo (`archivoRuta`, `archivoMimeType`, `archivoNombreOriginal`). `honorarios` **no es columna** — se calcula en `PropuestasInversionService.mapearRespuesta()` (`ahorroMensual × cantidadMeses × porcentajeSeg/100`) y se devuelve ya calculado en la respuesta, para no duplicar la fórmula en el frontend.
- **Puramente informativa**: a diferencia de la vieja cotización general, `PropuestaInversion` NO tiene relación con `OrdenCompra` — decisión explícita del usuario. Consecuencia: ya no existe la posibilidad de una OC "a nivel proyecto sin tarea" (ver nota en el diagrama de arriba).
- **Archivo adjunto amplío**: a diferencia de `Cotizacion`/factura de OC (ambas hardcodeadas a `application/pdf` en el `FileTypeValidator` del controller y en el `Content-Type`/nombre de la descarga), `PropuestasInversionController` acepta PDF, Word (`.doc`/`.docx`) e imagen (`jpeg`/`png`) vía un `FileTypeValidator` con regex, y la descarga usa el `mimeType`/nombre de archivo reales guardados en las columnas nuevas — no hardcodea nada. **Gotcha de test confirmado en esta sesión**: el `FileTypeValidator` de esta versión de Nest valida por **número mágico real** (paquete `file-type`, lee los bytes del archivo), no solo por el `Content-Type` que manda el cliente — un archivo `.docx`/`.png` de prueba con contenido falso (texto plano) es rechazado aunque el `Content-Type` del `curl -F` diga lo correcto; hace falta un archivo genuino (magic bytes reales) para que pase, igual que ya pasaba silenciosamente con el `application/pdf` de `Cotizacion` (un PDF real arranca con `%PDF`, sí tiene magic number válido).
- `ProyectosRepositorio` ganó `contarPropuestasInversionAsociadas()`, mismo patrón que `contarCotizacionesAsociadas()` — bloquea `DELETE /proyectos/:id` con 422 `PROYECTO_CON_PROPUESTAS_INVERSION_ASOCIADAS` si el proyecto tiene alguna propuesta cargada.
- `ACCIONES_AUDITORIA` ganó `CREAR_PROPUESTA_INVERSION`.
- Verificado end-to-end con los 4 usuarios de prueba: creación con PDF/Word/imagen genuinos, rechazo de tipo inválido, cálculo de honorarios, versionado (REEMPLAZADA automática), descarga con `Content-Type`/nombre reales, bloqueo de `DELETE`, y filtro de auditoría — todo confirmado contra el backend real, no solo `tsc`/`eslint`.

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
# Start command real en Railway (railway.json → deploy.startCommand):
npm run start:prod   # = node dist/src/main (ver gotcha de rootDir más abajo)

# Seeds (ejecutar contra DATABASE_PUBLIC_URL desde fuera de Railway):
DATABASE_URL=<public_url> npx tsx prisma/seed.ts
```

**Gotcha de build**: el `tsc`/`nest build` de este repo compila a `dist/src/main.js`, no `dist/main.js`, porque hay archivos `.ts` fuera de `src/` (`prisma.config.ts`, `prisma/seed.ts`) que fuerzan a TypeScript a inferir `rootDir` como la raíz del proyecto. `package.json`'s `start:prod` ya está ajustado a `node dist/src/main`.

**`prisma migrate deploy` NO corre automáticamente en el boot** (a diferencia de lo que decía antes este documento) — contra el Postgres real de Railway (template `postgres-ssl`), el comando quedaba colgado sin salir nunca, lo que rompía la cadena `&&` y el contenedor no llegaba a levantar el server (causa no diagnosticada del todo). Se sacó del `startCommand`. **Cualquier migración nueva de Prisma hay que aplicarla a mano** contra producción (por ejemplo con un TCP proxy temporal + `psql`/`prisma migrate deploy` apuntando a la `DATABASE_PUBLIC_URL`, o reagregando `prisma migrate deploy &&` al `startCommand` por un solo deploy y revirtiendo después).

**Builder**: Dockerfile propio (`Dockerfile` en la raíz del repo), no Nixpacks — Nixpacks no ofrecía una versión de Node suficientemente nueva para el mínimo de Prisma 7.9.1 (necesita 22.12+). La imagen es `node:22-slim` + `apt-get install openssl` (el motor de Prisma necesita OpenSSL, que la imagen slim no trae por defecto).

### Despliegue actual en producción (Railway)

Un solo proyecto Railway (`gestion-interna-seg`) con 3 servicios: `backend`, `frontend`, `Postgres` (template `postgres-ssl`).

| Servicio | URL |
|---|---|
| Backend | `https://backend-production-dc81.up.railway.app` |
| Frontend | `https://frontend-production-cbe52.up.railway.app` |

`NEXT_PUBLIC_API_URL` (frontend) y `FRONTEND_URL` (backend, usado para CORS) ya están cruzados correctamente entre sí. Ambos servicios tienen auto-deploy en push a `main` de su repo respectivo.

**Credenciales de prueba (mismos 4 usuarios que en local, ya seedeados en la base de Railway)** — contraseña `Cambiar123!` para todos:

| Rol | Email |
|---|---|
| ADMIN | `admin@segingenieria.com` |
| ENCARGADO | `encargado@segingenieria.com` |
| PAGOS | `pagos@segingenieria.com` |
| SOLICITANTE | `solicitante@segingenieria.com` |

**Pendiente — notificaciones por mail no están activas en producción todavía.** El código (`src/notificaciones/`) ya está completo y funciona contra Microsoft Graph (Outlook/365 real, no un mock) vía client credentials de una app de Azure AD, pero en Railway no están seteadas `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `EMAIL_REMITENTE` ni `EMAILS_EN_COPIA`. Sin esas variables, `CorreoService.enviar()` falla silenciosamente (try/catch que solo logea, a propósito no rompe la transición de estado que lo disparó) — hoy no sale ningún mail real. Para activarlo:
1. Alguien con acceso al admin de Azure AD/Microsoft 365 de la empresa tiene que registrar una app con permiso de **aplicación** `Mail.Send` (con consentimiento de admin) y elegir la casilla desde la que se manda.
2. Con tenant id / client id / client secret / casilla remitente, setear esas 4-5 variables en el servicio `backend` de Railway (`railway variable set --service backend ...`).
3. Una vez seteadas, no hace falta tocar código — el disparo ya está armado (cubre exactamente el caso de "el encargado comenta una OC pendiente → EN_CONSULTA → mail al solicitante" y "el solicitante responde → PENDIENTE → mail al encargado del sector", además de aprobar/rechazar/pagar/anular).

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

## Estado actual (actualizado 2026-08-03, cierre de Etapa 9)

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
- ✅ **Etapa 9 — Auditoría**: completa. Se revisó primero el repo hermano `mvp-control-de-equipos-seg` para no inventar el patrón. Decisiones tomadas:
  - **Sin decorator `@Auditable`**: desviación deliberada del plan original (que preveía un decorator envolviendo los métodos del service, ver sección "Decorator — Auditoría automática" más arriba). Un decorator de método TypeScript se aplica sobre el prototipo de la clase, **antes** de que exista la instancia con las dependencias inyectadas por Nest — no hay forma limpia de que alcance una instancia de `AuditoriaService` sin un registro estático global, que rompe el patrón de DI. El repo hermano tenía el mismo decorator en su plan en papel, pero en la implementación real tampoco existe: cada service llama explícitamente `await this.auditoriaService.registrar({...})` justo después de que la escritura tuvo éxito. Se siguió ese patrón real y probado, mismo criterio que ya se usó para desviarse del plan en la Etapa 6 (sin Strategy/Registry) y la Etapa 8 (un solo evento genérico, no 5 oyentes).
  - **Alcance: todas las escrituras del sistema**, no solo lo crítico de OC — se audita crear/actualizar/eliminar en `Usuarios`, `Sectores`, `Proveedores`, `Clientes`, `Proyectos`, `Tareas`, `Cotizaciones` (solo `crear`, es inmutable), `OrdenesCompra` (crear/actualizar/eliminar/adjuntar factura), las 9 transiciones de `OrdenesCompraAprobacionService` y `crear` de `Comentarios`. Retrofit grande: hubo que agregar `@Req()` a varios controllers que antes no lo necesitaban (`usuarios`, `sectores`, `proveedores`, `clientes`, `proyectos`, `tareas`, `cotizaciones`, `ordenes-compra`) para poder pasar el `UsuarioAutenticado` hasta el service.
  - **Modelo `Auditoria`**: a diferencia del hermano (que usa `usuarioId` nullable sin relación FK, más `usuarioEmail` como snapshot), aquí `usuarioId` es **obligatorio con relación FK** a `Usuario` — en este sistema toda escritura pasa por `JwtGuardia`, siempre hay un usuario autenticado, no hace falta nullable. Se mantiene `usuarioEmail` como snapshot igual que el hermano, porque `PATCH /usuarios/:id` puede cambiar el email después y el registro de auditoría debe reflejar el email tal como era en el momento de la acción, no el actual. Sin `PATCH`/`DELETE` (es un log de auditoría, inmutable) — `IAuditoriaRepositorio` no extiende `IRepositorioBase<T>`, mismo criterio que `Comentario`/`Cotizacion`/`HistorialEstadoOC`.
  - **`AuditoriaModulo` es `@Global()`**: mismo criterio que `PrismaModulo` — como casi todos los módulos de escritura necesitan `AuditoriaService`, se declaró global para no tener que agregar el módulo al `imports` de cada uno.
  - **`ACCIONES_AUDITORIA`**: constante única con todas las acciones auditables (evita strings sueltos con typos), en `src/auditoria/acciones-auditoria.constantes.ts`.
  - **`GET /auditoria`**: solo `ADMIN` (definido así desde el plan original, a diferencia del hermano que lo deja abierto a cualquier autenticado), con filtros opcionales por query params (`accion`, `entidad`, `usuarioEmail`), mismo envoltorio `{datos, total, pagina, porPagina}` que el resto de los listados (sin paginación real todavía).
  - **La auditoría nunca rompe la operación que la dispara**: `AuditoriaService.registrar()` tiene su propio `try/catch` que solo loguea con `Logger.error` y nunca relanza — mismo patrón fail-soft que `CorreoService` en la Etapa 8.
  - **Gotcha nuevo de migraciones**: `npx prisma migrate dev` quedó bloqueado con `The migration <etapa7> was modified after it was applied` — consecuencia de haber editado a mano esa migración después de aplicada, en la Etapa 7. La migración de esta etapa se generó sin pasar por `migrate dev`: `npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script` para obtener el SQL (recortando las líneas espurias de la secuencia `numero_orden_compra_seq`, mismo gotcha ya documentado), y se aplicó con `npx prisma migrate deploy` (que no hace la validación de historial que sí hace `migrate dev`). **Si se necesita volver a generar una migración nueva más adelante, usar este mismo camino** (`migrate diff` + `migrate deploy`) en vez de `migrate dev`, que seguirá bloqueado mientras no se corrija el checksum de la migración de Etapa 7 en `_prisma_migrations`.
  - **Probado end-to-end manualmente** (login real + Postgres local): flujo completo solicitante→enviar→comentario del encargado (a `EN_CONSULTA`)→intento de aprobar fallido (409, correctamente **sin** registro de auditoría, confirma que solo se audita después de éxito)→respuesta del solicitante (a `PENDIENTE`)→aprobar. Los 7 registros esperados aparecieron en orden en `GET /auditoria?entidad=OrdenCompra`. Se confirmó también que `SOLICITANTE` recibe 403 al intentar `GET /auditoria`.

---

## Auditoría de QA y arquitectura (post-Etapa 9, 2026-08-03)

Pase de revisión independiente (no una etapa nueva de funcionalidad) hecho con dos agentes en paralelo: uno de QA haciendo pruebas dinámicas contra el servidor real + revisión estática, otro haciendo una revisión de arquitectura senior sobre todo el código y este documento. Los hallazgos críticos e importantes fueron verificados manualmente en el código antes de quedar acá — no son solo la palabra del agente. Instalado también el paquete de skills `superpowers` (`github.com/obra/superpowers`) como referencia de proceso de QA/revisión, clonado en `.agents/vendor/superpowers/` y enlazado en `.claude/skills/`.

### Bugs confirmados — pendientes de arreglo

**Crítico:**
1. ~~**Un usuario dado de baja lógica conserva acceso completo con su JWT viejo hasta que expire (hasta 7 días, `JWT_EXPIRACION`).** `JwtStrategy.validate()` (`src/auth/jwt.estrategia.ts:18`) solo decodifica el payload del token, nunca consulta la base para chequear `activo`.~~ — **descartado, no se va a arreglar (decisión explícita del usuario, reconfirmada 2026-08-21)**: SEG Ingeniería es una empresa chica (~35 empleados que se conocen entre sí, sin usuarios externos ni maliciosos esperados). El escenario de riesgo es un ex-empleado dado de baja abusando de un token viejo durante hasta 7 días — se considera un riesgo teórico, no uno real a mitigar en este contexto. Queda documentado acá para que no se vuelva a levantar como pendiente en una futura revisión; solo reabrir si cambia el contexto (empresa crece, se agregan usuarios externos, etc.).

**Importante:**
2. **`OrdenesCompraService.actualizar()`/`eliminar()` no verifican `orden.estado === BORRADOR`**, contradiciendo lo ya documentado en Etapa 5 ("editar/eliminar en BORRADOR"). Confirmado en vivo: se pudo `PATCH` el `concepto` de una OC ya `PAGADA` sin ningún bloqueo. Sumado al punto siguiente, esto significa que hoy el control de quién puede tocar una OC depende del frontend, no del backend.
3. **`OrdenesCompraController` no tiene ningún chequeo de pertenencia** (el solicitante dueño, o un rol que justifique ver/editar todas) en `GET`/`PATCH`/`DELETE` — cualquier autenticado ve y puede intentar modificar OCs de cualquier sector. Mismo patrón que ya usa `validarEncargadoDelSector` en el service de aprobación, pero nunca se replicó en el CRUD normal de OC.
4. **`crear`/`actualizar`/`eliminar` de `OrdenCompra` no atrapan `P2003`** (FK inválida) como sí lo hacen `ProyectosService`/`CotizacionesService` — dan 500 `ERROR_INTERNO` en vez de 404, en un camino de uso normal (ej. `sectorId` con formato válido pero inexistente). Peor: `DELETE` sobre cualquier OC que ya tenga una fila en `HistorialEstadoOC` (o sea, cualquiera que salió de `BORRADOR`) falla con 500 por la FK `ON DELETE RESTRICT` en vez de un 409/422 limpio.
5. ~~**`POST /cotizaciones` no valida que `tareaId` pertenezca al `proyectoId` enviado** — se puede crear una cotización con `proyectoId` de un proyecto y `tareaId` de una tarea de otro proyecto distinto, corrompiendo la jerarquía Cliente→Proyecto→Tarea documentada en "Modelo de dominio".~~ — **resuelto (2026-08-21)**: `CotizacionesService.crear()` ahora llama a `validarTareaPerteneceAlProyecto()` (nuevo método privado) antes de crear, que busca la `Tarea` por `tareaId` (vía `TAREAS_REPOSITORIO`, inyectado ahora en `CotizacionesModulo` importando `TareasModulo`) y rechaza con `422 TAREA_NO_PERTENECE_AL_PROYECTO` si `tarea.proyectoId !== dto.proyectoId`. Mismo patrón/estilo que `ValidarProveedorCoincideCotizacionEslabon` de OC (`UnprocessableEntityException` con código `X_NO_COINCIDE_CON_Y`). Si la tarea no existe directamente, sigue cayendo en el manejo de `P2003` ya existente (404), sin duplicar esa lógica.
6. ~~**`OrdenCompraEstadoCambiadoOyente.cuandoCambiaEstadoOrdenCompra`** (`src/notificaciones/oyentes/`) solo es fail-soft en el envío del mail (`CorreoService.enviar()`) — la resolución de destinatarios (consultas a `UsuariosRepositorio`) no tiene su propio `try/catch`. Como el evento se emite con `emit()` (no `emitAsync()`) y no hay handler global de `unhandledRejection` en `main.ts`, un fallo ahí podría tumbar el proceso completo, no solo esa notificación — contradice el criterio fail-soft que el resto del sistema sí respeta.~~ — **resuelto (2026-08-21)**: todo el cuerpo de `cuandoCambiaEstadoOrdenCompra()` (resolución de destinatarios + envío) quedó envuelto en un único `try/catch` que loguea y no relanza, extendiendo el fail-soft que antes solo cubría `CorreoService.enviar()` a la resolución de destinatarios también.

**Menor/cosmético:**
7. `ParseFilePipe` (subida de factura/PDF) devuelve el mensaje de `FileTypeValidator` aunque el fallo real sea de tamaño (`MaxFileSizeValidator`) — confuso para debugging, es comportamiento del propio Nest al combinar validators.
8. ~~`GET /proyectos/:id/avance-pago`, descrito en presente en la sección "Modelo de dominio" de este documento, **nunca se implementó**~~ — **resuelto por otro camino (2026-08-20)**: la necesidad de negocio (monto cotizado vs. pagado, avance) quedó cubierta por la tarjeta "Costos y rentabilidad" de `/proyectos/[id]` (frontend, 2026-08-19), que calcula todo 100% client-side en `lib/proyectos/presentacion.ts` (`calcularResumenCostos`) reusando los listados de cotizaciones/OC que la pantalla ya trae, sin este endpoint. Se decide **no implementarlo por ahora** — se deja esta nota como referencia si en el futuro hiciera falta el cálculo server-side (ej. otro cliente además de este frontend, o necesidad de mayor precisión/consistencia que un cálculo hecho en el navegador no puede garantizar).

### Confirmado como correcto (cobertura exhaustiva, sin hallazgos)

Probado en vivo con casos límite reales (no solo happy path): derivación server-side de `solicitanteId`/`clienteId`/`proyectoId`/`tareaId` (rechaza con 400 si el cliente intenta mandarlos, gracias a `whitelist`/`forbidNonWhitelisted` del `ValidacionPipe` global), la tabla completa de transiciones válidas/inválidas de OC, las validaciones de monto/proveedor contra cotización (incluidos límites exactos con decimales, sin errores de redondeo binario), autorización por sector en aprobar/rechazar/anular, la transición automática de Comentarios (las combinaciones exactas rol+estado y solo esas), toda la auditoría de la Etapa 9 (registros correctos, nada se audita en operaciones fallidas, `GET /auditoria` es ADMIN-only), baja lógica de `Usuario` vs. baja física de `Cliente`/`Proveedor`, y ausencia total de `toISOString()` en construcción de fechas (la regla de UTC-3 de este mismo documento se respeta).

### Revisión de arquitectura senior — fortalezas señaladas

"Derivar en vez de confiar" bien resuelto; repositorios que no extienden `IRepositorioBase<T>` para entidades inmutables (`Cotizacion`/`Comentario`/`HistorialEstadoOC`/`Auditoria`) es la decisión correcta, no algo a "unificar"; un único punto de emisión de eventos (`ejecutarTransicion()`); las tres desviaciones deliberadas del plan (sin Strategy/Registry en Etapa 6, un evento genérico en vez de 5 oyentes en Etapa 8, sin decorator `@Auditable` en Etapa 9) fueron la decisión madura, no un atajo; cero Prisma fuera de repositorios en todo el proyecto; `ValidacionPipe` global bloquea mass assignment por diseño; dinero manejado con `Decimal(14,2)` en todo lado, nunca `Float`.

### Riesgos operacionales/de producción señalados (no son bugs de comportamiento, son huecos)

- **Sin CORS configurado** (`main.ts` no llama `enableCors()`) — va a bloquear al frontend Next.js separado.
- **Sin rate limiting en `/auth/login`** — vulnerable a fuerza bruta.
- ~~**El parche de migraciones de esta etapa (`migrate diff` + `migrate deploy` a mano) es deuda, no solución permanente** — `migrate dev` sigue bloqueado indefinidamente por el checksum de la migración de Etapa 7.~~ — **resuelto (2026-08-20)**: se corrigió a mano el checksum de la migración de Etapa 7 en `_prisma_migrations` (el archivo en disco no coincidía con el que quedó registrado como aplicado con éxito — confirmado sin drift real contra la base, `prisma migrate status` ya venía limpio). `migrate dev` funciona normal de nuevo. También se resolvió el gotcha de `numero` de OC (ver sección "Prisma" más arriba) — de ahora en más las migraciones nuevas se pueden generar con el flujo estándar (`migrate dev`), sin el atajo manual `migrate diff` + `migrate deploy`.
- **Cero tests automatizados** sobre el motor de aprobación — si hay que priorizar con tiempo limitado: (1) tabla de transiciones válidas/inválidas, (2) `validarEncargadoDelSector`/guards de rol, (3) los eslabones de validación de monto/proveedor, (4) un e2e del flujo completo enviar→consulta→responder→aprobar→pagar.
- Condición de carrera de baja probabilidad en `ValidarMontoNoExcedeCotizacionEslabon` (lee-calcula-compara sin transacción/lock — dos OCs creadas casi simultáneamente contra la misma cotización podrían ambas pasar la validación).
- Sin health check real que verifique conexión a la base, sin índices en `Auditoria` (agregar cuando el volumen lo justifique), sin CI, sin `enableShutdownHooks()`, sin estrategia de backup de la base documentada.

**Antes de arrancar la Etapa 10 (seed real + deploy), priorizar arreglar los puntos 1-4 de "Bugs confirmados"** — son los que definen si el control de acceso real está en el backend o depende de que el frontend no muestre ciertos botones.

### Fixes aplicados post-auditoría (2026-08-17)

Se arreglaron los puntos 2, 3 y 4 de "Bugs confirmados". El punto 1 (JWT de usuario dado de baja sigue vigente hasta que expira) se decidió **no arreglarlo**: es una empresa chica donde todos se conocen, el escenario de un ex-usuario abusando de un token viejo durante hasta 7 días no se considera un riesgo real a mitigar ahora.

- **Punto 2 (editar/eliminar fuera de `BORRADOR`)**: `OrdenesCompraService.actualizar()`/`eliminar()` ahora llaman a `validarEsBorrador()`, que tira `ConflictException` (409, `ORDEN_COMPRA_NO_ES_BORRADOR`) si `orden.estado !== BORRADOR`.
- **Punto 3 (pertenencia)**: se agregó `validarPertenencia()` en `OrdenesCompraService`, usada en `actualizar()`/`eliminar()` (no en `GET`, que se decidió dejar abierto a cualquier autenticado, mismo criterio ya documentado para `Cliente`/`Proyecto`/`Cotización`). Puede editar/eliminar una OC en `BORRADOR`: el solicitante que la creó, cualquier usuario de su mismo sector (`usuario.sectorId === orden.sectorId`), o `ADMIN`. Decisión tomada con el usuario: se prefirió "mismo sector" en vez de "solo el dueño" para permitir que un compañero del sector complete un borrador cargado por otro. Tira `ForbiddenException` (403, `SIN_PERMISO_SOBRE_ORDEN_COMPRA`) si no se cumple ninguna condición.
- **Punto 4 (FK inválida y `DELETE` roto por historial)**:
  - `crear()`/`actualizar()` ahora envuelven la escritura en `ejecutarOMapearReferenciaInvalida()` (mismo patrón que `ProyectosService`/`CotizacionesService`), que atrapa `P2003` y devuelve 404 `PROVEEDOR_O_SECTOR_NO_ENCONTRADO` en vez de 500 — cubre `sectorId`/`proveedorId`, los únicos FKs de `OrdenCompra` que llegan directo del cliente sin haber sido ya validados (`cotizacionId` ya se valida en `derivarJerarquia`, y `solicitanteId`/`clienteId`/`proyectoId`/`tareaId` se derivan server-side).
  - El `DELETE` roto por la FK `ON DELETE RESTRICT` de `HistorialEstadoOC` quedó resuelto como efecto secundario del punto 2: como toda fila de `HistorialEstadoOC` se crea al salir de `BORRADOR` (`cambiarEstado()`), y ahora `eliminar()` exige `estado === BORRADOR`, nunca puede existir una fila de historial para una OC eliminable.
  - Se encontró un segundo camino de 500 no listado explícitamente en la auditoría: `Comentario` sí se puede crear en cualquier estado, incluido `BORRADOR` (`ComentariosService` no restringe por estado), así que una OC en `BORRADOR` con comentarios también rompía el `DELETE` por la misma razón (`ON DELETE RESTRICT`). Se agregó `contarComentariosAsociados()` a `IOrdenesCompraRepositorio`/`OrdenesCompraRepositorio` (mismo patrón de conteo cross-módulo que ya usa `ProyectosRepositorio` contra `Cotizacion`/`Tarea`/`OrdenCompra`), y `eliminar()` bloquea con `UnprocessableEntityException` (422, `ORDEN_COMPRA_CON_COMENTARIOS_ASOCIADOS`) si hay comentarios cargados.
- Verificado: `tsc --noEmit`, `eslint` y `jest` sin errores sobre los archivos tocados (`ordenes-compra.service.ts`, `ordenes-compra.repositorio.ts`, `interfaces/ordenes-compra-repositorio.interface.ts`). No se agregaron tests nuevos — sigue pendiente la deuda de "cero tests automatizados" ya señalada en la auditoría.

### Testing exhaustivo end-to-end (2026-08-20/21)

Pase de testing completo pedido por el usuario ("probá absolutamente todo"), con el criterio explícito de ignorar bugs que requieran un usuario malicioso o con conocimientos técnicos (software interno, 35 personas que se conocen). Claude in Chrome no conectó (mismo problema de siempre, ver `gestion-interna-frontend`) — todo se hizo con ~108 aserciones reales de API (script Node con `fetch` nativo, sin dependencias, logueando los 4 roles de prueba contra el backend local) más lectura de código. Cobertura: catálogos y sus reglas de unicidad/bloqueo de borrado, jerarquía Cliente→Proyecto→Tarea→Cotización, Propuesta de Inversión (cálculo de honorarios, validaciones de rango), ciclo de vida completo de una OC con las 7 transiciones y los permisos por rol/sector (incluidos los negativos: rol equivocado, sector equivocado, estado equivocado), comentarios disparando `EN_CONSULTA`/`PENDIENTE` exactamente en las combinaciones documentadas, auditoría (filtros + paginación real), tipos de cambio, monedas UYU/USD/EUR, montos borde (cero/negativo), archivos reales (PDF con magic number válido, adjuntar/reemplazar factura, rechazo de PDF falso), y manejo de FK inválida (`P2003`). **Resultado: todo el comportamiento coincidió con lo documentado, no se encontró ningún bug nuevo en el backend.**

Confirmado releyendo el código (no solo la palabra del audit anterior) que los puntos **5 y 6** de "Bugs confirmados" seguían sin arreglar en ese momento, sin cambios desde el audit original — **ambos resueltos el 2026-08-21, ver el detalle en esa sección**:
- Punto 5 (`POST /cotizaciones` no valida que `tareaId` pertenezca a `proyectoId`): reproducido con `curl`/API directa (201 en vez de un rechazo). No era explotable por la UI real — `ModalCotizacion.tsx` del frontend solo ofrece tareas ya scopeadas al proyecto actual, así que ningún usuario normal podía armar esta combinación sin llamar la API a mano. Igual se decidió arreglarlo en el backend, no dejarlo solo cubierto por la UI.
- Punto 6 (`OrdenCompraEstadoCambiadoOyente.resolverEmails`/`buscarUsuariosPorTipo` sin `try/catch` propio): confirmado en el código de ese momento (`src/notificaciones/oyentes/orden-compra-estado-cambiado.oyente.ts`), sin cambios hasta el fix.

**Hallazgo nuevo (infraestructura de testing, no de negocio):** `npm run test:e2e` (`test/app.e2e-spec.ts`) **no llega a bootear la aplicación** — falla con `MODULE_NOT_FOUND` al importar `AppModule`→`PrismaModulo`→el cliente Prisma generado (`generated/prisma/client.ts`), porque ese cliente usa imports internos con extensión `.js` explícita (convención `moduleResolution: "nodenext"`, ver sección "Prisma" más arriba) y `ts-jest` (configurado en `package.json`, sin `moduleNameMapper` para esa sustitución de extensión) no los resuelve — mismo gotcha ya documentado para `ts-node` vs `tsx` en scripts sueltos, pero nunca se había verificado que también rompe el harness de e2e. `npm test` (unit, `rootDir: "src"`) sí corre, pero solo hay un `.spec.ts` en todo el repo (el scaffold default de Nest bajo `test/`, que además está roto por lo mismo) — la deuda "cero tests automatizados" señalada en el audit es, en la práctica, "cero tests automatizados y el harness de e2e no arranca". Si se decide pagar esa deuda (prioridad ya sugerida en el audit: transiciones, `validarEncargadoDelSector`, eslabones de validación, e2e del flujo completo), hay que resolver primero este bloqueo de configuración (agregar un `moduleNameMapper` en la config de Jest que mapee `(\\.{1,2}/.*)\\.js$` → `$1`, patrón estándar para proyectos ESM/NodeNext bajo ts-jest).

**Hallazgo menor (cosmético):** `eslint` sobre `src/**` reporta 6 errores, todos de `prettier/prettier` (wrap de argumentos multilínea), sin ningún error de lógica — en `auditoria.controller.ts`, `ordenes-compra.controller.ts`, `tipos-cambio.repositorio.ts`, `tipos-cambio.service.ts`. Corregibles con `npx eslint --fix`, no se tocaron porque no se pidió.

**Nota de sincronización de este documento:** `GET /ordenes-compra` también tiene paginación real (`pagina`/`porPagina`, default 50/máx 200, igual patrón que `/auditoria` documentado en la sección de Fase 4 del contexto del frontend) — no estaba mencionado en este documento como si solo aplicara a Auditoría. El frontend ya lo maneja bien (`useOrdenesCompraPaginadas`, mismo patrón "Cargar más" que Auditoría), así que no es un bug, solo un gap de documentación que quedaba pendiente de corregir acá.

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
