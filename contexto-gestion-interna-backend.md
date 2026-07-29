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

---

## Modelo de dominio

```
Cliente
  └── Proyecto (uno o varios)
        └── Cotización (una o varias, pueden cambiar)
              ├── Proveedor
              ├── Monto total + moneda
              └── OC (uno o varios pagos parciales)
                    ├── Ítems (uno o varios)
                    ├── Factura PDF adjunta
                    └── Estado → flujo de aprobación

OC suelta (sin proyecto ni cotización)
  ├── Proveedor
  ├── Ítems
  ├── Factura PDF adjunta
  └── Estado → flujo de aprobación
```

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
- Cada OC tiene exactamente un PDF de factura adjunto
- Se sube al momento de crear o antes de enviar a aprobación
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
NODE_ENV=development
PORT=3000
RUTA_ALMACENAMIENTO=./almacenamiento-local
```

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

## Estado actual (actualizado 2026-07-29)

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
- ⏳ **Etapa 5 — Órdenes de compra (núcleo)**: no iniciada.

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
