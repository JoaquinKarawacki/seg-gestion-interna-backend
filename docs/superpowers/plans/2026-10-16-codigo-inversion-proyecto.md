# Código de Inversión en Proyecto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el identificador autoincremental `#N` del Proyecto por el **código de inversión (PI)** del "Generador de códigos" (ej. `26002PI01`), cargado manualmente, obligatorio y único.

**Architecture:** Flujo 100% manual (sin integración entre apps todavía). Se agrega un campo string `codigoInversion` a `Proyecto` (obligatorio, único, validado por formato) y se elimina la columna `numero`. El `id` uuid sigue siendo la PK interna. El código PI pasa a ser el único identificador visible en la UI. Toca dos repos: primero `gestion-interna-backend`, después `gestion-interna-frontend` (el frontend depende del nuevo contrato del backend).

**Tech Stack:** NestJS + Prisma 6 + PostgreSQL (backend) · Next.js 16 + React 19 + React Query + react-hook-form (frontend).

## Global Constraints

- **Idioma:** todo en español (código, rutas, mensajes, columnas vía `@map`). Excepciones solo técnicas (decoradores NestJS, env vars).
- **Formato del código PI:** `{AA}{NNN}PI{NN}` → regex `^\d{5}PI\d{2}$` (5 dígitos de OPC + `PI` + 2 dígitos). Ej. válido: `26002PI01`. Se normaliza a mayúsculas antes de persistir/validar.
- **Obligatorio y único:** todo proyecto nuevo exige `codigoInversion`; no puede repetirse.
- **No editable tras crear:** el código es el vínculo de identidad; no se modifica desde `PATCH /proyectos/:id` (queda fuera de `ActualizarProyectoDto`).
- **Códigos HTTP (convención del repo):** `201` creado · `400` datos inválidos (formato) · `409` conflicto (código duplicado) · `404` referencia inexistente (cliente/sector).
- **Verificación real del backend:** `npm run build` (nest build) + `npm run lint` + script de humo por API con `fetch` contra el backend corriendo. **NO** se usa `npm run test:e2e` (jest): está documentado que no bootea por el gotcha `ts-jest` + imports `.js` de Prisma bajo `nodenext`.
- **Verificación real del frontend:** `npx tsc --noEmit` + `npm run lint` + `npm run build`.
- **Next.js 16:** el `AGENTS.md` del frontend advierte breaking changes; estos cambios son triviales (un input de texto y mostrar un string), no tocan APIs nuevas de Next.
- **Commits frecuentes**, uno por tarea, en el repo que corresponda. Mensajes en español. Cerrar los commits con la línea de atribución:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## File Structure

**Backend (`gestion-interna-backend`):**
- `prisma/schema.prisma` — modelo `Proyecto`: +`codigoInversion`, −`numero`.
- `prisma/migrations/<timestamp>_agregar_codigo_inversion_proyecto/migration.sql` — add column + drop column (nueva).
- `src/proyectos/dtos/crear-proyecto.dto.ts` — +campo validado `codigoInversion`.
- `src/proyectos/dtos/respuesta-proyecto.dto.ts` — +`codigoInversion`, −`numero`.
- `src/proyectos/interfaces/proyectos-repositorio.interface.ts` — `DatosCrearProyecto` += `codigoInversion`.
- `src/proyectos/proyectos.service.ts` — `mapearRespuesta` mapea `codigoInversion` (no `numero`); manejo de P2002 (código duplicado).

**Frontend (`gestion-interna-frontend`):**
- `lib/proyectos/tipos.ts` — `Proyecto`: +`codigoInversion`, −`numero`; `CrearProyectoDto` += `codigoInversion`.
- `components/proyectos/ModalProyecto.tsx` — input "Código de inversión (PI)" con validación de formato; solo en alta.
- `components/proyectos/TablaProyectos.tsx` — celda de la columna "Código": mostrar `codigoInversion` en vez de `#{numero}`.
- `app/(app)/proyectos/[id]/page.tsx` — encabezado del detalle: mostrar `codigoInversion` en vez de `#{numero}`.

---

## ⚠️ Prerrequisito operativo (antes de migrar)

La migración agrega `codigo_inversion TEXT NOT NULL UNIQUE`. Un `ADD COLUMN NOT NULL` sin default **falla si la tabla `proyectos` tiene filas**. Por eso la tabla debe estar vacía al migrar:

- **Local (dev):** usar `npx prisma migrate reset` (borra y re-siembra) en la Task 1. Esto deja la base limpia; está OK en testing con datos falsos.
- **Producción (Railway):** antes del deploy que aplica esta migración, **vaciar los proyectos y sus dependientes** (órdenes de compra, órdenes de pago, cotizaciones, tareas) con el script de limpieza existente (`prisma/limpiar-datos-demo.ts` o equivalente). Esto coincide con el reset de datos de testing ya previsto (se preservan proveedores, clientes, usuarios y sectores). El `CMD` del Dockerfile corre `prisma migrate deploy` en cada deploy: asegurarse de que proyectos esté vacío antes de ese deploy.

---

# PARTE A — Backend (`gestion-interna-backend`)

### Task 1: Schema + migración (DB)

**Files:**
- Modify: `prisma/schema.prisma` (modelo `Proyecto`)
- Create: `prisma/migrations/<timestamp>_agregar_codigo_inversion_proyecto/migration.sql`

**Interfaces:**
- Produces: columna `codigo_inversion` (TEXT, NOT NULL, UNIQUE) en tabla `proyectos`; se elimina columna `numero`. Modelo Prisma `Proyecto` expone `codigoInversion: string` y ya no `numero`.

- [ ] **Step 1: Editar el modelo `Proyecto` en `prisma/schema.prisma`**

Quitar la línea de `numero` y agregar `codigoInversion`. El modelo queda:

```prisma
model Proyecto {
  id            String        @id @default(uuid())
  codigoInversion String      @unique @map("codigo_inversion")
  nombre        String
  clienteId     String        @map("cliente_id")
  cliente       Cliente       @relation(fields: [clienteId], references: [id])
  sectorId      String?       @map("sector_id")
  sector        Sector?       @relation(fields: [sectorId], references: [id])
  tareas        Tarea[]
  cotizaciones  Cotizacion[]
  ordenesPago   OrdenPago[]
  ordenesCompra OrdenCompra[]
  creadoEn      DateTime      @default(now()) @map("creado_en")
  actualizadoEn DateTime      @updatedAt @map("actualizado_en")

  @@map("proyectos")
}
```

- [ ] **Step 2: Validar el schema**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

- [ ] **Step 3: Resetear la base local y generar la migración**

Run: `npx prisma migrate reset --force` (vacía la base local; necesario porque la columna nueva es NOT NULL — ver Prerrequisito operativo)
Luego: `npx prisma migrate dev --name agregar_codigo_inversion_proyecto`
Expected: crea la carpeta de migración y aplica sin error. Revisar que el `migration.sql` generado contenga un `DROP COLUMN "numero"` y un `ADD COLUMN "codigo_inversion" TEXT NOT NULL` + índice único.

- [ ] **Step 4: Regenerar el client Prisma (si el watch lo dejó bloqueado)**

Run: `npx prisma generate`
Expected: "Generated Prisma Client". (Gotcha conocido: si `migrate dev` no regeneró el client por el lock del watch, este paso lo arregla.)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Proyecto: reemplazar numero por codigo de inversion (schema + migracion)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: DTOs, repositorio, service y manejo de duplicado

**Files:**
- Modify: `src/proyectos/dtos/crear-proyecto.dto.ts`
- Modify: `src/proyectos/dtos/respuesta-proyecto.dto.ts`
- Modify: `src/proyectos/interfaces/proyectos-repositorio.interface.ts:6-10` (`DatosCrearProyecto`)
- Modify: `src/proyectos/proyectos.service.ts` (`mapearRespuesta` + manejo P2002)

**Interfaces:**
- Consumes: modelo Prisma `Proyecto` con `codigoInversion` (de Task 1).
- Produces: `POST /proyectos` acepta y exige `codigoInversion` validado por formato; devuelve `RespuestaProyectoDto { id, codigoInversion, nombre, clienteId, sectorId }` (sin `numero`). Código duplicado → `409 { error: 'CODIGO_INVERSION_DUPLICADO', mensaje }`.

- [ ] **Step 1: Agregar el campo validado a `crear-proyecto.dto.ts`**

```typescript
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

const FORMATO_CODIGO_INVERSION = /^\d{5}PI\d{2}$/;

export class CrearProyectoDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(FORMATO_CODIGO_INVERSION, {
    message:
      'El código de inversión debe tener el formato AANNN PI NN (ej. 26002PI01)',
  })
  codigoInversion!: string;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsUUID()
  clienteId!: string;

  @IsOptional()
  @IsUUID()
  sectorId?: string;
}
```

> Nota: `ActualizarProyectoDto` **no** se toca — el código no es editable (Global Constraints).

- [ ] **Step 2: Actualizar `respuesta-proyecto.dto.ts`**

```typescript
export class RespuestaProyectoDto {
  id!: string;
  codigoInversion!: string;
  nombre!: string;
  clienteId!: string;
  sectorId!: string | null;
}
```

- [ ] **Step 3: Agregar `codigoInversion` a `DatosCrearProyecto`**

En `src/proyectos/interfaces/proyectos-repositorio.interface.ts`, dejar `DatosCrearProyecto` así (no tocar `DatosActualizarProyecto`):

```typescript
export interface DatosCrearProyecto {
  codigoInversion: string;
  nombre: string;
  clienteId: string;
  sectorId?: string;
}
```

- [ ] **Step 4: Mapear `codigoInversion` y manejar el duplicado en `proyectos.service.ts`**

(4a) En `mapearRespuesta`, reemplazar `numero` por `codigoInversion`:

```typescript
  private mapearRespuesta(proyecto: ProyectoModel): RespuestaProyectoDto {
    return {
      id: proyecto.id,
      codigoInversion: proyecto.codigoInversion,
      nombre: proyecto.nombre,
      clienteId: proyecto.clienteId,
      sectorId: proyecto.sectorId,
    };
  }
```

(4b) Agregar el import de `ConflictException` (de `@nestjs/common`) y la constante del código de unicidad arriba, junto a `CODIGO_REFERENCIA_INVALIDA`:

```typescript
const CODIGO_UNICIDAD_VIOLADA = 'P2002';
```

(4c) En `ejecutarOMapearReferenciaInvalida`, dentro del `catch`, antes del chequeo de P2003, mapear P2002 del código de inversión:

```typescript
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === CODIGO_UNICIDAD_VIOLADA
      ) {
        throw new ConflictException({
          error: 'CODIGO_INVERSION_DUPLICADO',
          mensaje: 'Ya existe un proyecto con ese código de inversión',
        });
      }
```

(La única constraint única en `crear` es `codigoInversion`, así que no hace falta inspeccionar `meta` para este caso.)

- [ ] **Step 5: Compilar y lintear**

Run: `npm run build`
Expected: compila sin errores (si quedara alguna referencia a `proyecto.numero`, el build falla acá).
Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 6: Escribir el script de humo por API**

Crear el script en el scratchpad (NO en el repo): `<scratchpad>/humo-codigo-inversion.mjs`. Requiere Node 18+ (fetch global) y el backend corriendo en `http://localhost:3000`. Completar `ADMIN_EMAIL`/`ADMIN_PASSWORD` con credenciales reales del entorno local.

```javascript
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@seg.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Cambiar123!';

async function j(res) { return { status: res.status, body: await res.json().catch(() => null) }; }

const login = await j(await fetch(`${BASE}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: ADMIN_EMAIL, contrasena: ADMIN_PASSWORD }),
}));
if (login.status !== 200 && login.status !== 201) throw new Error('Login falló: ' + JSON.stringify(login));
const token = login.body.datos?.token ?? login.body.token ?? login.body.datos?.accessToken;
const auth = { 'content-type': 'application/json', authorization: `Bearer ${token}` };

const clientes = await j(await fetch(`${BASE}/clientes`, { headers: auth }));
const clienteId = (clientes.body.datos ?? clientes.body)[0].id;

const codigo = '26002PI' + String(Math.floor(Math.random() * 90) + 10);

// 1) Formato inválido -> 400
const malo = await j(await fetch(`${BASE}/proyectos`, {
  method: 'POST', headers: auth,
  body: JSON.stringify({ codigoInversion: 'NO-VALE', nombre: 'X', clienteId }),
}));
console.log('formato inválido ->', malo.status, malo.status === 400 ? 'OK' : 'FALLO');

// 2) Alta válida -> 201
const ok = await j(await fetch(`${BASE}/proyectos`, {
  method: 'POST', headers: auth,
  body: JSON.stringify({ codigoInversion: codigo, nombre: 'Proyecto humo', clienteId }),
}));
console.log('alta válida ->', ok.status, ok.status === 201 ? 'OK' : 'FALLO', ok.body?.datos?.codigoInversion);

// 3) Duplicado -> 409
const dup = await j(await fetch(`${BASE}/proyectos`, {
  method: 'POST', headers: auth,
  body: JSON.stringify({ codigoInversion: codigo, nombre: 'Proyecto humo 2', clienteId }),
}));
console.log('duplicado ->', dup.status, dup.status === 409 ? 'OK' : 'FALLO', dup.body?.error);
```

- [ ] **Step 7: Correr el backend y el script de humo**

En una terminal: `npm run start:dev` (o `npm run start:prod` con `dist/` ya compilado).
En otra: `node <scratchpad>/humo-codigo-inversion.mjs`
Expected: las tres líneas imprimen `OK` (400 formato inválido, 201 alta válida con el código devuelto, 409 duplicado con `CODIGO_INVERSION_DUPLICADO`).

- [ ] **Step 8: Commit**

```bash
git add src/proyectos
git commit -m "Proyecto: exigir y validar codigo de inversion en el alta de la API

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# PARTE B — Frontend (`gestion-interna-frontend`)

### Task 3: Tipos, formulario y visualización

**Files:**
- Modify: `lib/proyectos/tipos.ts`
- Modify: `components/proyectos/ModalProyecto.tsx`
- Modify: `components/proyectos/TablaProyectos.tsx:67`
- Modify: `app/(app)/proyectos/[id]/page.tsx:80`

**Interfaces:**
- Consumes: `POST /proyectos` con `codigoInversion` (backend Task 2); respuesta `Proyecto { id, codigoInversion, nombre, clienteId, sectorId }`.
- Produces: alta de proyecto con campo "Código de inversión (PI)" validado; tabla y detalle muestran el código en vez de `#N`.

- [ ] **Step 1: Actualizar `lib/proyectos/tipos.ts`**

```typescript
export interface Proyecto {
  id: string;
  codigoInversion: string;
  nombre: string;
  clienteId: string;
  sectorId: string | null;
}

export interface CrearProyectoDto {
  codigoInversion: string;
  nombre: string;
  clienteId: string;
  sectorId?: string;
}

export interface ActualizarProyectoDto {
  nombre?: string;
  clienteId?: string;
  sectorId?: string;
}
```

- [ ] **Step 2: Agregar el campo al formulario en `ModalProyecto.tsx`**

(2a) Extender `DatosFormulario` y los `defaultValues`:

```typescript
interface DatosFormulario {
  codigoInversion: string;
  nombre: string;
  clienteId: string;
  sectorId: string;
}
```

```typescript
    defaultValues: {
      codigoInversion: proyecto?.codigoInversion ?? "",
      nombre: proyecto?.nombre ?? "",
      clienteId: proyecto?.clienteId ?? "",
      sectorId: proyecto?.sectorId ?? SIN_SECTOR,
    },
```

(2b) Reescribir `alEnviar` para que, en alta, mande `codigoInversion` normalizado a mayúsculas, y en edición **no** lo mande (no es editable):

```typescript
  async function alEnviar(datos: DatosFormulario) {
    const sectorId = datos.sectorId === SIN_SECTOR ? undefined : datos.sectorId;
    if (proyecto) {
      await actualizarProyecto.mutateAsync({
        nombre: datos.nombre,
        clienteId: datos.clienteId,
        sectorId,
      });
    } else {
      await crearProyecto.mutateAsync({
        codigoInversion: datos.codigoInversion.trim().toUpperCase(),
        nombre: datos.nombre,
        clienteId: datos.clienteId,
        sectorId,
      });
    }
    onCerrar();
  }
```

(2c) Agregar el input. En **alta** es editable con validación de formato; en **edición** se muestra deshabilitado (el código no cambia). Insertar como primer campo del `<form>`, antes de "Nombre":

```tsx
          <Campo
            etiqueta="Código de inversión (PI)"
            placeholder="26002PI01"
            disabled={!!proyecto}
            error={errors.codigoInversion?.message}
            {...register("codigoInversion", {
              required: proyecto ? false : "Requerido",
              pattern: {
                value: /^\d{5}PI\d{2}$/i,
                message: "Formato esperado: 26002PI01",
              },
            })}
          />
```

> Verificar que el componente `Campo` acepte `placeholder` y `disabled` (es un wrapper de `<input>`; reenvía props vía `...register`/rest). Si no soporta `disabled`, mostrar en edición el código como texto estático en vez del input.

- [ ] **Step 3: Mostrar el código en la tabla (`TablaProyectos.tsx:67`)**

Reemplazar:

```tsx
              <TablaCelda className="font-semibold text-gray-500">#{proyecto.numero}</TablaCelda>
```

por:

```tsx
              <TablaCelda className="font-semibold text-gray-500">{proyecto.codigoInversion}</TablaCelda>
```

(La columna del encabezado ya se llama "Código" — no cambia.)

- [ ] **Step 4: Mostrar el código en el detalle (`app/(app)/proyectos/[id]/page.tsx:80`)**

Reemplazar:

```tsx
          <span className="text-gray-400">#{proyecto.data.numero}</span> {proyecto.data.nombre}
```

por:

```tsx
          <span className="text-gray-400">{proyecto.data.codigoInversion}</span> {proyecto.data.nombre}
```

- [ ] **Step 5: Verificar tipos, lint y build**

Run: `npx tsc --noEmit`
Expected: sin errores (si quedara alguna referencia a `.numero`, falla acá).
Run: `npm run lint`
Expected: sin errores nuevos.
Run: `npm run build`
Expected: compila (el fetch de Google Fonts puede fallar offline; eso es esperado y no es un fallo del cambio).

- [ ] **Step 6: Commit**

```bash
git add lib/proyectos/tipos.ts components/proyectos/ModalProyecto.tsx components/proyectos/TablaProyectos.tsx "app/(app)/proyectos/[id]/page.tsx"
git commit -m "Proyectos: cargar y mostrar el codigo de inversion (PI) en vez de #N

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Verificación end-to-end manual

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Levantar backend + frontend locales**

Backend corriendo en `:3000` (con la migración de Task 1 aplicada); frontend con `npm run dev`.

- [ ] **Step 2: Alta feliz**

En `/proyectos` → "Nuevo proyecto": cargar `26002PI03`, un nombre, un cliente. Guardar.
Expected: se crea; aparece en la tabla con `26002PI03` en la columna "Código" (no `#N`).

- [ ] **Step 3: Validación de formato**

Intentar crear con `abc` en el código.
Expected: el form muestra "Formato esperado: 26002PI01" y no envía.

- [ ] **Step 4: Duplicado**

Intentar crear otro proyecto con `26002PI03`.
Expected: el backend responde 409 y el modal muestra el error "Ya existe un proyecto con ese código de inversión".

- [ ] **Step 5: Detalle**

Abrir el proyecto creado.
Expected: el encabezado muestra `26002PI03` + nombre. Al editarlo, el campo de código aparece deshabilitado.

---

## Self-Review

**1. Spec coverage:**
- Campo que relaciona con el PI → `codigoInversion` (Task 1 schema, Task 2 DTO). ✅
- Obligatorio → NOT NULL + `@IsNotEmpty`/`required` (Task 1, 2, 3). ✅
- Único → `@unique` + manejo 409 (Task 1, Task 2 step 4c). ✅
- Validación de formato (M2) → `@Matches` backend + `pattern` frontend + normalización a mayúsculas (Task 2 step 1, Task 3 step 2). ✅
- Eliminar `#N` (opción limpia) → drop `numero` + reemplazo en tabla/detalle (Task 1, Task 3 steps 3-4). ✅
- No editable tras crear → fuera de `ActualizarProyectoDto`, input deshabilitado en edición (Global Constraints, Task 3). ✅

**2. Placeholder scan:** Sin TODOs ni "manejar errores" genéricos. Las credenciales del script de humo son específicas del entorno (se completan con valores reales), no lógica pendiente.

**3. Type consistency:** `codigoInversion: string` usado igual en `schema.prisma`, `RespuestaProyectoDto`, `DatosCrearProyecto`, `CrearProyectoDto` (back) y `Proyecto`/`CrearProyectoDto` (front). `numero` eliminado de todos los puntos (schema, respuesta DTO, mapearRespuesta, tipos front, tabla, detalle). Regex idéntica (`^\d{5}PI\d{2}$`) en ambos lados.

## Puntos abiertos para el lunes (automatización — fuera de este plan)

- Relacionar `nombreFantasia` (OPC) ↔ `Cliente` para pre-filtrar/autocompletar el dropdown.
- Handoff por link desde el Generador (`/proyectos/nuevo?codigo=...`) o lookup contra su API (M3) para verificar existencia real del PI.
