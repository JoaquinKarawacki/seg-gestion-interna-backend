# Multi-rol de Usuario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un `Usuario` pueda tener varios roles a la vez (hoy tiene uno solo), para que Franco Rodriguez (`rodriguez@segingenieria.com`) sea `ENCARGADO` **y** `PAGOS` — pueda aprobar OC/OP de su sector y además confirmar pagos.

**Architecture:** Se reemplaza el campo escalar `Usuario.rol: RolUsuario` por `Usuario.roles: RolUsuario[]` como única fuente de verdad, en backend (Prisma + JWT + guardia + DTOs) y frontend (tipos + gating + formulario). Las comprobaciones de permiso pasan de igualdad (`=== RolUsuario.X`) a pertenencia (`roles.includes(X)`), encapsuladas en helpers `tieneRol`/`tieneAlgunRol`. La migración backfillea `roles = [rol]` antes de borrar `rol`, preservando datos. Shims de compatibilidad (JWT y sesión en localStorage) evitan romper sesiones abiertas durante el despliegue.

**Tech Stack:** NestJS 11, Prisma 7.9.1 (generator `prisma-client`, `moduleFormat=cjs`), PostgreSQL 16, Next.js 16 + React 19 + TypeScript, React Query, React Hook Form.

## Global Constraints

- **Todo en español** (variables, funciones, rutas, mensajes). Excepciones técnicas: decoradores Nest, `layout.tsx`/`page.tsx`, nombres de env vars. Verbatim del contexto.
- **Verificación real de este proyecto** (NO hay jest e2e que bootee — documentado): cada tarea cierra con `npx tsc --noEmit` + `npx eslint .` sin errores en el repo tocado; las tareas de comportamiento cierran además con un chequeo E2E por API real (Node 22 `fetch`) contra el backend local corriendo. No inventar un harness de tests nuevo.
- **No pushear ni mergear** hasta que el usuario lo pida. Todo el trabajo va en una rama nueva `multi-rol` en cada repo (sale de `main`). Ver [[feedback_flujo_ramas_testing]].
- **Migraciones Prisma**: generar con `--create-only` y editar el SQL a mano (backfill) antes de aplicar. En prod, el `CMD` del Dockerfile corre `prisma migrate deploy` solo al deployar — no aplicar a mano salvo gap.
- **El `.env` local manda mails REALES** al disparar transiciones de OC/OP. En los chequeos E2E, crear datos y aprobar/confirmar con usuarios de prueba está OK (el sistema ya manda mails), pero avisar antes de correr un lote grande. Ver [[feedback_mail_creds_activas_local]].
- **Valor objetivo del enum**: `RolUsuario = SOLICITANTE | ENCARGADO | PAGOS | ADMIN` (sin cambios al enum).
- **Mostrar el código en el chat** a medida que se escribe (el usuario está aprendiendo). Al cerrar, preguntas de comprensión.

---

## File Structure

### Backend (`gestion-interna-backend/`)
- `prisma/schema.prisma` — `Usuario.rol` → `Usuario.roles RolUsuario[]`.
- `prisma/migrations/<generada>_usuario_roles_multiples/migration.sql` — add `roles`, backfill, drop `rol` (hand-editada).
- `src/comun/interfaces/usuario-autenticado.interface.ts` — `rol` → `roles`.
- `src/comun/guardias/roles.guardia.ts` — chequeo por intersección.
- `src/comun/autorizacion/roles.util.ts` — **nuevo**: `tieneRol`, `tieneAlgunRol`.
- `src/auth/interfaces/payload-jwt.interface.ts` — `rol` → `roles`.
- `src/auth/jwt.estrategia.ts` — `validate` arma `roles` (con shim legacy).
- `src/auth/auth.service.ts` — token y DTO con `roles`.
- `src/auth/dtos/respuesta-auth.dto.ts` — `UsuarioAutenticadoDto.roles`.
- `src/usuarios/dtos/{crear,actualizar}-usuario.dto.ts` — `roles` array.
- `src/usuarios/dtos/respuesta-usuario.dto.ts` — `roles`.
- `src/usuarios/interfaces/usuarios-repositorio.interface.ts` — `DatosCrear/Actualizar.roles`, firma de `buscarActivosPorRol`.
- `src/usuarios/usuarios.{service,repositorio}.ts` — mapear/crear/actualizar con `roles`.
- `src/comentarios/comentarios.service.ts` — gating por `roles`.
- `src/ordenes-compra/{ordenes-compra.service.ts, aprobacion/ordenes-compra-aprobacion.service.ts}` — gating por `roles`.
- `src/ordenes-pago/{ordenes-pago.service.ts, aprobacion/ordenes-pago-aprobacion.service.ts}` — gating por `roles`.
- `src/ordenes-pago/oyentes/orden-compra-aprobada.oyente.ts` — construye `UsuarioAutenticado` con `roles`.
- `prisma/seed.ts` + `prisma/importar-datos-reales.ts` — usuarios con `roles`.

### Frontend (`gestion-interna-frontend/`)
- `lib/auth/tipos.ts` — `Usuario.roles`, `PayloadJwt.roles`.
- `lib/auth/roles.ts` — **nuevo**: `tieneRol`, `tieneAlgunRol`.
- `lib/auth/api.ts` — login mapea `roles`.
- `lib/auth/almacen-token.ts` — normaliza sesión legacy (`rol` → `[rol]`).
- `lib/usuarios/tipos.ts` — `Usuario.roles`, DTOs con `roles`.
- `lib/usuarios/presentacion.ts` — `ETIQUETAS_ROL` (igual) + `formatearRoles`.
- `lib/ordenes-compra/presentacion.ts`, `lib/ordenes-pago/presentacion.ts` — gating por `roles`.
- `components/layout/{RequiereRol,EncabezadoApp}.tsx` — gating por `roles`.
- `components/usuarios/{ModalUsuario,TablaUsuarios}.tsx` — rol → multi-check + display.
- `app/(app)/{dashboard,ordenes-pago,proveedores}/page.tsx` — gating por `roles`.

---

## Task 1 (Backend): Schema + migración `rol` → `roles[]`

**Files:**
- Modify: `prisma/schema.prisma:39` (modelo `Usuario`)
- Create: `prisma/migrations/<generada>_usuario_roles_multiples/migration.sql`

**Interfaces:**
- Produces: columna `usuarios.roles rol_usuario[] NOT NULL`; tipo generado `UsuarioModel.roles: RolUsuario[]` (ya sin `rol`).

- [ ] **Step 1: Cambiar el campo en el schema**

En `prisma/schema.prisma`, reemplazar la línea 39:
```prisma
  rol                    RolUsuario
```
por:
```prisma
  roles                  RolUsuario[]
```
(No lleva `@default` ni `@map`: la columna se llama `roles` y la migración garantiza NOT NULL con backfill.)

- [ ] **Step 2: Generar la migración vacía (solo carpeta + SQL autogenerado)**

Run: `npx prisma migrate dev --create-only --name usuario_roles_multiples`
Expected: crea `prisma/migrations/<timestamp>_usuario_roles_multiples/migration.sql`. El SQL autogenerado dropea `rol` y agrega `roles` **sin backfill** (perdería datos) — se reescribe en el paso siguiente.

- [ ] **Step 3: Reescribir el SQL de la migración (backfill)**

Reemplazar TODO el contenido de ese `migration.sql` por:
```sql
-- Multi-rol: Usuario.rol (escalar) -> Usuario.roles (array). Preserva datos:
-- cada usuario pasa a tener exactamente el rol que tenía, como lista de uno.

-- 1. Columna nueva, temporalmente con default vacío para poder marcarla NOT NULL
--    sobre las filas existentes.
ALTER TABLE "usuarios"
  ADD COLUMN "roles" "rol_usuario"[] NOT NULL DEFAULT ARRAY[]::"rol_usuario"[];

-- 2. Backfill: roles = [rol] para cada fila.
UPDATE "usuarios" SET "roles" = ARRAY["rol"]::"rol_usuario"[];

-- 3. Baja la columna vieja.
ALTER TABLE "usuarios" DROP COLUMN "rol";

-- 4. Saca el default para que el schema (sin @default) coincida con la DB.
ALTER TABLE "usuarios" ALTER COLUMN "roles" DROP DEFAULT;
```

- [ ] **Step 4: Aplicar la migración y regenerar el cliente**

Run: `npx prisma migrate dev` (aplica la migración pendiente) y luego `npx prisma generate`.
Expected: "migration(s) applied"; sin drift (el estado final de la DB coincide con el schema). Reiniciar el TS server de VS Code después de `generate` (el cliente generado cambió de tipo).

- [ ] **Step 5: Verificar que el schema y la DB quedaron consistentes**

Run: `npx prisma migrate status`
Expected: "Database schema is up to date!". (No commitear todavía: el repo no compila hasta la Task 2, que usa el tipo nuevo.)

---

## Task 2 (Backend): Contrato de autenticación y usuarios con `roles`

**Files:**
- Create: `src/comun/autorizacion/roles.util.ts`
- Modify: `src/comun/interfaces/usuario-autenticado.interface.ts`, `src/comun/guardias/roles.guardia.ts`, `src/auth/interfaces/payload-jwt.interface.ts`, `src/auth/jwt.estrategia.ts`, `src/auth/auth.service.ts`, `src/auth/dtos/respuesta-auth.dto.ts`, `src/usuarios/dtos/{crear,actualizar,respuesta}-usuario.dto.ts`, `src/usuarios/interfaces/usuarios-repositorio.interface.ts`, `src/usuarios/usuarios.service.ts`, `src/usuarios/usuarios.repositorio.ts`

**Interfaces:**
- Produces: `UsuarioAutenticado.roles: RolUsuario[]`; `PayloadJwt.roles: RolUsuario[]`; `tieneRol(usuario, rol)`, `tieneAlgunRol(usuario, roles)`; DTOs y repositorio hablando `roles`.

- [ ] **Step 1: Crear los helpers de autorización**

Crear `src/comun/autorizacion/roles.util.ts`:
```typescript
import { RolUsuario } from '../../../generated/prisma/enums';

interface ConRoles {
  roles: RolUsuario[];
}

export function tieneRol(usuario: ConRoles, rol: RolUsuario): boolean {
  return usuario.roles.includes(rol);
}

export function tieneAlgunRol(
  usuario: ConRoles,
  roles: RolUsuario[],
): boolean {
  return roles.some((rol) => usuario.roles.includes(rol));
}
```

- [ ] **Step 2: `UsuarioAutenticado` y `PayloadJwt` pasan a `roles`**

`src/comun/interfaces/usuario-autenticado.interface.ts` — reemplazar `rol: RolUsuario;` por `roles: RolUsuario[];`.
`src/auth/interfaces/payload-jwt.interface.ts` — reemplazar `rol: RolUsuario;` por `roles: RolUsuario[];`.

- [ ] **Step 3: `JwtStrategy.validate` arma `roles` (con shim legacy)**

En `src/auth/jwt.estrategia.ts`, reemplazar el `return` de `validate` (líneas 18-26) por:
```typescript
  validate(payload: PayloadJwt & { rol?: RolUsuario }): UsuarioAutenticado {
    // Shim de despliegue: un token viejo trae `rol` (singular) en vez de
    // `roles`. Se deriva para no romper sesiones abiertas hasta que expiren.
    const roles = payload.roles ?? (payload.rol ? [payload.rol] : []);
    return {
      id: payload.sub,
      email: payload.email,
      roles,
      sectorId: payload.sectorId,
      sectoresEncargado: payload.sectoresEncargado ?? [],
    };
  }
```
Agregar el import `RolUsuario` si hace falta: `import { RolUsuario } from '../../generated/prisma/enums';`.

- [ ] **Step 4: Guardia de roles por intersección**

En `src/comun/guardias/roles.guardia.ts`, reemplazar el bloque de chequeo (líneas 31-36) por:
```typescript
    const tienePermiso = rolesRequeridos.some((rol) =>
      solicitud.user.roles.includes(rol),
    );

    if (!tienePermiso) {
      throw new ForbiddenException({
        error: 'SIN_PERMISO',
        mensaje: 'No tenés permiso para realizar esta acción',
      });
    }
```

- [ ] **Step 5: `auth.service` genera token y DTO con `roles`**

En `src/auth/auth.service.ts`: en `generarToken` (línea 78) cambiar `rol: usuario.rol,` por `roles: usuario.roles,`; en `mapearUsuarioAutenticado` (línea 93) cambiar `rol: usuario.rol,` por `roles: usuario.roles,`.
En `src/auth/dtos/respuesta-auth.dto.ts`: en `UsuarioAutenticadoDto`, cambiar `rol!: RolUsuario;` por `roles!: RolUsuario[];`.

- [ ] **Step 6: DTOs de usuarios con `roles`**

`src/usuarios/dtos/crear-usuario.dto.ts` — reemplazar el campo `rol` (líneas 23-24) por:
```typescript
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RolUsuario, { each: true })
  roles!: RolUsuario[];
```
y agregar `ArrayNotEmpty` al import de `class-validator`.

`src/usuarios/dtos/actualizar-usuario.dto.ts` — reemplazar el campo `rol` (líneas 21-23) por:
```typescript
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RolUsuario, { each: true })
  roles?: RolUsuario[];
```
y agregar `ArrayNotEmpty` al import.

`src/usuarios/dtos/respuesta-usuario.dto.ts` — cambiar `rol!: RolUsuario;` por `roles!: RolUsuario[];`.

- [ ] **Step 7: Repositorio e interfaz de usuarios con `roles`**

`src/usuarios/interfaces/usuarios-repositorio.interface.ts`:
- `DatosCrearUsuario`: cambiar `rol: RolUsuario;` por `roles: RolUsuario[];`.
- `DatosActualizarUsuario`: cambiar `rol?: RolUsuario;` por `roles?: RolUsuario[];`.
- `buscarActivosPorRol(rol: RolUsuario, sectorId?: string)`: la firma queda igual (busca usuarios que **tengan** ese rol).

`src/usuarios/usuarios.repositorio.ts`: en `buscarActivosPorRol`, cambiar el `where` de `rol,` a `roles: { has: rol },` (filtro de array de Prisma). `crear`/`actualizar` no cambian: ya hacen spread de `...resto`, que ahora incluye `roles` en vez de `rol` (Prisma acepta `roles: RolUsuario[]` en `create`/`update`).

- [ ] **Step 8: `usuarios.service` crea y mapea con `roles`**

`src/usuarios/usuarios.service.ts`: en `crear` (línea 55) cambiar `rol: dto.rol,` por `roles: dto.roles,`; en `mapearRespuesta` (línea 184) cambiar `rol: usuario.rol,` por `roles: usuario.roles,`. `actualizar` pasa `dto` directo al repo (el DTO ya trae `roles`), no cambia.

- [ ] **Step 9: Compilar y lint**

Run: `npx tsc --noEmit && npx eslint .`
Expected: sin errores. (Si `tsc` marca algún `usuario.rol` restante en servicios, es de la Task 3 — se arregla ahí; esta tarea no los toca todavía, así que si aparecen, continuar a Task 3 antes de considerar verde el repo.)

> Nota para el implementador: los `usuario.rol` de `comentarios`/`ordenes-*` (Task 3) harán fallar `tsc` acá. Está previsto. Hacer Task 2 y Task 3 juntas antes de commitear, o commitear recién al final de Task 3.

- [ ] **Step 10: Commit (Task 2 + 3 juntas, ver nota)**

```bash
git add -A
git commit -m "Usuarios: multi-rol (rol -> roles[]) en schema, auth, DTOs y guardia"
```

---

## Task 3 (Backend): Gating de negocio por `roles`

**Files:**
- Modify: `src/comentarios/comentarios.service.ts:69`, `src/ordenes-compra/ordenes-compra.service.ts:221`, `src/ordenes-compra/aprobacion/ordenes-compra-aprobacion.service.ts:106`, `src/ordenes-pago/ordenes-pago.service.ts:378`, `src/ordenes-pago/aprobacion/ordenes-pago-aprobacion.service.ts:173`, `src/ordenes-pago/oyentes/orden-compra-aprobada.oyente.ts:120`

**Interfaces:**
- Consumes: `tieneRol` de `src/comun/autorizacion/roles.util.ts`.

- [ ] **Step 1: Comentarios**

`src/comentarios/comentarios.service.ts:69` — cambiar `usuario.rol === RolUsuario.ENCARGADO &&` por `tieneRol(usuario, RolUsuario.ENCARGADO) &&`. Agregar `import { tieneRol } from '../comun/autorizacion/roles.util';`.

- [ ] **Step 2: Aprobación OC**

`src/ordenes-compra/aprobacion/ordenes-compra-aprobacion.service.ts:106` — cambiar `if (usuario.rol === RolUsuario.ENCARGADO) {` por `if (tieneRol(usuario, RolUsuario.ENCARGADO)) {`. Import del helper (ruta relativa `../../comun/autorizacion/roles.util`).

- [ ] **Step 3: CRUD OC (esAdmin)**

`src/ordenes-compra/ordenes-compra.service.ts:221` — cambiar `const esAdmin = usuario.rol === RolUsuario.ADMIN;` por `const esAdmin = tieneRol(usuario, RolUsuario.ADMIN);`. Import del helper.

- [ ] **Step 4: Aprobación OP**

`src/ordenes-pago/aprobacion/ordenes-pago-aprobacion.service.ts:173` — cambiar `if (usuario.rol === RolUsuario.ENCARGADO) {` por `if (tieneRol(usuario, RolUsuario.ENCARGADO)) {`. Import del helper.

- [ ] **Step 5: CRUD OP (esAdmin)**

`src/ordenes-pago/ordenes-pago.service.ts:378` — cambiar `const esAdmin = usuario.rol === RolUsuario.ADMIN;` por `const esAdmin = tieneRol(usuario, RolUsuario.ADMIN);`. Import del helper.

- [ ] **Step 6: Oyente de pago único**

`src/ordenes-pago/oyentes/orden-compra-aprobada.oyente.ts:120` — en el objeto `UsuarioAutenticado` que arma `resolverAutor`, cambiar `rol: usuario.rol,` por `roles: usuario.roles,`.

- [ ] **Step 7: Compilar y lint**

Run: `npx tsc --noEmit && npx eslint .`
Expected: sin errores en todo el backend.

- [ ] **Step 8: Commit** (si no se juntó con Task 2)

```bash
git add -A
git commit -m "OC/OP/comentarios: gating por roles.includes en vez de rol ==="
```

---

## Task 4 (Backend): Seed e importador con `roles`

**Files:**
- Modify: `prisma/seed.ts` (usuarios de prueba), `prisma/importar-datos-reales.ts`

**Interfaces:**
- Consumes: `UsuarioModel.roles` (Task 1).

- [ ] **Step 1: Seed de usuarios de prueba**

En `prisma/seed.ts`, localizar los upserts de los 4 usuarios de prueba (grep `rol:`), y cambiar cada `rol: RolUsuario.X` (o `rol: 'X'`) por `roles: [RolUsuario.X]` en el `create`/`update` del upsert.

Run: `grep -n "rol" prisma/seed.ts` para encontrarlos todos antes de editar.

- [ ] **Step 2: Importador de datos reales**

`prisma/importar-datos-reales.ts`: la interfaz de usuario (línea ~33 `rol: RolUsuario;`) pasa a aceptar opcionalmente una lista:
```typescript
  rol?: RolUsuario;
  roles?: RolUsuario[];
```
y en el upsert (línea ~71 `rol: usuario.rol,`) derivar la lista:
```typescript
  roles: usuario.roles ?? (usuario.rol ? [usuario.rol] : []),
```
Así los registros del JSON que tienen `rol` (uno solo) siguen funcionando, y se puede declarar `roles` explícito para los multi-rol (Rodriguez, Task 7).

- [ ] **Step 3: Compilar**

Run: `npx tsc --noEmit`
Expected: sin errores. (No se re-corre el seed/import acá para no pisar datos locales; se usa en Task 6/7 de forma controlada.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Seed/import: usuarios con roles[] (compat con rol singular del JSON)"
```

---

## Task 5 (Frontend): Contrato de auth y helpers

**Files:**
- Create: `lib/auth/roles.ts`
- Modify: `lib/auth/tipos.ts`, `lib/auth/api.ts`, `lib/auth/almacen-token.ts`, `lib/usuarios/tipos.ts`, `lib/usuarios/presentacion.ts`

**Interfaces:**
- Produces: `Usuario.roles: RolUsuario[]`; `tieneRol(usuario, rol)`, `tieneAlgunRol(usuario, roles)`; `formatearRoles(roles)`.

- [ ] **Step 1: Tipos de auth**

`lib/auth/tipos.ts`: en `interface Usuario` cambiar `rol: RolUsuario;` por `roles: RolUsuario[];`; en `interface PayloadJwt` cambiar `rol: RolUsuario;` por `roles: RolUsuario[];`.

- [ ] **Step 2: Helpers de roles**

Crear `lib/auth/roles.ts`:
```typescript
import type { RolUsuario, Usuario } from "./tipos";

export function tieneRol(usuario: Usuario, rol: RolUsuario): boolean {
  return (usuario.roles ?? []).includes(rol);
}

export function tieneAlgunRol(usuario: Usuario, roles: RolUsuario[]): boolean {
  return roles.some((rol) => (usuario.roles ?? []).includes(rol));
}
```
(El `?? []` tolera una sesión legacy sin `roles` hasta que se normalice / re-loguee.)

- [ ] **Step 3: Login mapea `roles`**

`lib/auth/api.ts`: en `interface UsuarioSinSector` cambiar `rol: RolUsuario;` por `roles: RolUsuario[];`. El resto (`...respuesta.datos.usuario` + sectorId/sectoresEncargado del JWT) no cambia: el backend ya devuelve `usuario.roles`.

- [ ] **Step 4: Normalizar sesión legacy en localStorage**

`lib/auth/almacen-token.ts`, en `obtenerUsuarioGuardado`, reemplazar el `try` (líneas 22-26) por:
```typescript
  try {
    const usuario = JSON.parse(crudo) as Usuario & { rol?: RolUsuario };
    // Sesión guardada por una versión vieja: tenía `rol` singular. Se deriva
    // `roles` para no desloguear al usuario tras el despliegue del multi-rol.
    if (!usuario.roles && usuario.rol) {
      return { ...usuario, roles: [usuario.rol] };
    }
    return usuario;
  } catch {
    return null;
  }
```
Agregar `RolUsuario` al import de `./tipos`.

- [ ] **Step 5: Tipos y etiquetas de usuarios**

`lib/usuarios/tipos.ts`: en `Usuario`, `CrearUsuarioDto` y `ActualizarUsuarioDto`, cambiar `rol: RolUsuario` / `rol?: RolUsuario` por `roles: RolUsuario[]` / `roles?: RolUsuario[]` respectivamente.
`lib/usuarios/presentacion.ts`: dejar `ETIQUETAS_ROL` igual y agregar:
```typescript
export function formatearRoles(roles: RolUsuario[]): string {
  return roles.map((rol) => ETIQUETAS_ROL[rol]).join(", ");
}
```

- [ ] **Step 6: Compilar** (fallará por el gating de Task 6 — previsto)

Run: `npx tsc --noEmit`
Expected: errores solo en los archivos de Task 6 (gating). Continuar a Task 6 antes de considerar verde.

---

## Task 6 (Frontend): Gating de UI por `roles`

**Files:**
- Modify: `components/layout/RequiereRol.tsx:11`, `components/layout/EncabezadoApp.tsx:38`, `lib/ordenes-compra/presentacion.ts` (43,54,63,64), `lib/ordenes-pago/presentacion.ts` (54,80,84,88,92,99,100), `app/(app)/dashboard/page.tsx` (28,49,69,89,121), `app/(app)/ordenes-pago/page.tsx` (106,115), `app/(app)/proveedores/page.tsx:23`

**Interfaces:**
- Consumes: `tieneRol`, `tieneAlgunRol` de `lib/auth/roles.ts`.

- [ ] **Step 1: `RequiereRol`**

`components/layout/RequiereRol.tsx:11` — cambiar `if (!usuario || !roles.includes(usuario.rol)) {` por `if (!usuario || !tieneAlgunRol(usuario, roles)) {`. Import `import { tieneAlgunRol } from "@/lib/auth/roles";`.

- [ ] **Step 2: `EncabezadoApp` (filtro de nav)**

`components/layout/EncabezadoApp.tsx:38` — cambiar `(item) => !item.roles || (usuario && item.roles.includes(usuario.rol)),` por `(item) => !item.roles || (usuario ? tieneAlgunRol(usuario, item.roles) : false),`. Import `tieneAlgunRol`.

- [ ] **Step 3: Gating de OC**

`lib/ordenes-compra/presentacion.ts` — reemplazos (importar `tieneRol` de `@/lib/auth/roles`):
- línea 43: `usuario.rol === "ADMIN"` → `tieneRol(usuario, "ADMIN")`
- línea 54: `usuario.rol === "ENCARGADO" &&` → `tieneRol(usuario, "ENCARGADO") &&`
- línea 63: `if (usuario.rol === "ADMIN") return true;` → `if (tieneRol(usuario, "ADMIN")) return true;`
- línea 64: `if (usuario.rol === "ENCARGADO") return ...` → `if (tieneRol(usuario, "ENCARGADO")) return ...`

- [ ] **Step 4: Gating de OP**

`lib/ordenes-pago/presentacion.ts` — reemplazos (importar `tieneRol`):
- línea 54: `usuario.rol === "ADMIN"` → `tieneRol(usuario, "ADMIN")`
- línea 80: `usuario.rol === "ENCARGADO"` → `tieneRol(usuario, "ENCARGADO")`
- líneas 84, 88, 92: `usuario.rol === "PAGOS"` → `tieneRol(usuario, "PAGOS")`
- línea 99: `if (usuario.rol === "ADMIN") return true;` → `if (tieneRol(usuario, "ADMIN")) return true;`
- línea 100: `if (usuario.rol === "ENCARGADO") return ...` → `if (tieneRol(usuario, "ENCARGADO")) return ...`

- [ ] **Step 5: Dashboard**

`app/(app)/dashboard/page.tsx` — las 5 condiciones (28,49,69,89,121) `usuario.rol === "X"` → `tieneRol(usuario, "X")`. Import `tieneRol`. (Un multi-rol verá ahora varias secciones a la vez — es lo deseado.)

- [ ] **Step 6: Accesos rápidos de OP y edición de proveedores**

`app/(app)/ordenes-pago/page.tsx` (106,115): `usuario?.rol === "X"` → `usuario ? tieneRol(usuario, "X") : false` (o `usuario && tieneRol(usuario, "X")`). Import `tieneRol`.
`app/(app)/proveedores/page.tsx:23`: `Boolean(usuario && ROLES_EDICION.includes(usuario.rol))` → `Boolean(usuario && tieneAlgunRol(usuario, ROLES_EDICION))`. Import `tieneAlgunRol`.

- [ ] **Step 7: Compilar y lint**

Run: `npx tsc --noEmit && npx eslint .`
Expected: sin errores (salvo los de `ModalUsuario`/`TablaUsuarios` de Task 7 — hacerlas juntas o commitear al final de Task 7).

---

## Task 7 (Frontend): Formulario de usuario multi-rol + display

**Files:**
- Modify: `components/usuarios/ModalUsuario.tsx`, `components/usuarios/TablaUsuarios.tsx:86`

**Interfaces:**
- Consumes: `ETIQUETAS_ROL`, `formatearRoles` (Task 5).

- [ ] **Step 1: Form state del modal**

En `components/usuarios/ModalUsuario.tsx`:
- `interface DatosFormulario`: cambiar `rol: RolUsuario;` por `roles: RolUsuario[];`.
- `defaultValues` (línea 49): cambiar `rol: usuario?.rol ?? "SOLICITANTE",` por `roles: usuario?.roles ?? ["SOLICITANTE"],`.
- `rolSeleccionado` (línea 55): cambiar por `const rolesSeleccionados = useWatch({ control, name: "roles" }) ?? [];`.

- [ ] **Step 2: Enviar `roles`**

En `alEnviar`:
- línea 60-61: cambiar la derivación de sectores a `const sectoresEncargadoIds = datos.roles.includes("ENCARGADO") ? datos.sectoresEncargadoIds : [];`.
- líneas 71 y 81: cambiar `rol: datos.rol,` por `roles: datos.roles,` en ambas ramas (actualizar y crear).

- [ ] **Step 3: Rol como checkboxes (multi) en vez de `<Select>`**

Reemplazar el `<Select etiqueta="Rol" ...>` (líneas 115-121) por un fieldset de checkboxes, mismo patrón visual que "Sectores que puede aprobar":
```tsx
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-sm font-medium text-gray-700">Roles</legend>
              <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
                {Object.entries(ETIQUETAS_ROL).map(([valor, etiqueta]) => (
                  <label key={valor} className="flex items-center gap-2 text-sm text-gray-900">
                    <input
                      type="checkbox"
                      value={valor}
                      className="accent-seg-rojo"
                      {...register("roles", { required: "Elegí al menos un rol" })}
                    />
                    {etiqueta}
                  </label>
                ))}
              </div>
              {errors.roles ? (
                <span className="text-sm text-seg-rojo">{errors.roles.message}</span>
              ) : null}
            </fieldset>
```
(El `<Select etiqueta="Sector">` que estaba al lado queda como estaba, ya no en un grid de 2 columnas con el rol — dejarlo debajo, suelto.)

- [ ] **Step 4: Visibilidad de "Sectores que puede aprobar"**

Cambiar la condición (línea 131) `rolSeleccionado === "ENCARGADO"` por `rolesSeleccionados.includes("ENCARGADO")`.

- [ ] **Step 5: Display en la tabla**

`components/usuarios/TablaUsuarios.tsx:86` — cambiar `{ETIQUETAS_ROL[usuario.rol]}` por `{formatearRoles(usuario.roles)}`. Ajustar el import: `import { formatearRoles } from "@/lib/usuarios/presentacion";` (sumado o en vez de `ETIQUETAS_ROL` según qué use el archivo).

- [ ] **Step 6: Compilar, lint y build**

Run: `npx tsc --noEmit && npx eslint . && npx next build`
Expected: sin errores (el único fallo aceptable es el fetch de Google Fonts offline en `app/layout.tsx`, preexistente y de red).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Usuarios: UI multi-rol (checkboxes de roles) y gating por roles"
```

---

## Task 8 (Integración): Verificación E2E por API real

**Files:** ninguno (solo verificación).

**Interfaces:**
- Consumes: backend local corriendo (`npm run start:dev`, puerto 3000) con la migración de Task 1 aplicada; frontend opcional.

- [ ] **Step 1: Levantar backend local**

Confirmar Docker Postgres arriba (`docker ps` → `seg-gestion-interna-postgres`). Correr `npm run start:dev` en el backend. Confirmar que la migración `usuario_roles_multiples` está aplicada (`npx prisma migrate status`).

- [ ] **Step 2: Crear un usuario multi-rol de prueba y validar el contrato**

Script Node 22 (`fetch`) en el scratchpad: login como `admin@segingenieria.com`/`Cambiar123!`; `POST /usuarios` con `roles: ["ENCARGADO","PAGOS"]`, `sectorId` de un sector de prueba y `sectoresEncargadoIds: [eseSector]`. Afirmar:
- `201`, y `GET /usuarios` devuelve ese usuario con `roles` de longitud 2.
- Login del nuevo usuario → `200`, y el `usuario` de la respuesta trae `roles: ["ENCARGADO","PAGOS"]`.

- [ ] **Step 3: Validar que el multi-rol puede aprobar Y confirmar pago**

Con ese usuario (ENCARGADO+PAGOS del sector de prueba): crear una OC en ese sector (como solicitante o él mismo) → enviar → **aprobar** (endpoint `@Roles(ENCARGADO)`) → debe generar/permitir la OP → sobre la OP, **aprobar** (ENCARGADO) y luego **confirmar-pago** (`@Roles(PAGOS)`). Afirmar que ninguno devuelve `403`. Afirmar que un usuario de un solo rol (`PAGOS` puro) sigue recibiendo `403` al intentar `aprobar`.

- [ ] **Step 4: Regresión de notificaciones**

Afirmar (leyendo logs o con el usuario multi-rol como encargado del sector) que al enviar una OC de ese sector, `buscarActivosPorRol(ENCARGADO, sector)` lo incluye (el mail de PENDIENTE lo toma como destinatario). **Ojo**: esto dispara un mail real — hacerlo una sola vez y avisar. Ver [[feedback_mail_creds_activas_local]].

- [ ] **Step 5: Limpieza de datos de prueba**

Borrar lo creado donde se pueda (usuario multi-rol → baja lógica; OC/OP de prueba no se pueden borrar fuera de BORRADOR, queda como dato de prueba, documentarlo).

---

## Task 9 (Datos): Rodriguez = [ENCARGADO, PAGOS]

**Files:**
- Modify: `prisma/datos-reales/usuarios.json` (entrada de Rodriguez)

**Interfaces:**
- Consumes: importador con `roles` (Task 4); feature desplegada (Tasks 1-7).

- [ ] **Step 1: Dejar el dato correcto en el JSON fuente**

En `prisma/datos-reales/usuarios.json`, en la entrada de `rodriguez@segingenieria.com`, reemplazar `"rol": "PAGOS"` por `"roles": ["ENCARGADO", "PAGOS"]`. (Los demás usuarios siguen con `"rol": "..."` y el importador los envuelve en lista.)

- [ ] **Step 2: Aplicar en la base donde corresponda**

- **Local**: re-correr el importador acotado a usuarios, o editar vía la propia app (ADMIN → editar Rodriguez → tildar roles Encargado y Pagos + tildar sector ADMINISTRACION en "Sectores que puede aprobar"). No dispara mails.
- **Producción** (cuando el usuario autorice el deploy): tras mergear/pushear y que corra la migración, editar a Rodriguez desde la app como ADMIN con los dos roles + sector ADMINISTRACION. Alternativa: `PATCH /usuarios/:id` con `{ roles: ["ENCARGADO","PAGOS"], sectoresEncargadoIds: [<id ADMINISTRACION>] }`.

- [ ] **Step 3: Verificar el efecto buscado**

Con Rodriguez ya ENCARGADO de ADMINISTRACION: al enviar una OC/OP del sector ADMINISTRACION, confirmar (log/mail) que le llega la notificación de pendiente y que puede aprobarla; y que sigue pudiendo confirmar pagos (rol PAGOS). Cierra el problema original.

- [ ] **Step 4: Commit**

```bash
git add prisma/datos-reales/usuarios.json
git commit -m "Datos: Rodriguez pasa a roles [ENCARGADO, PAGOS] (encargado de Administracion)"
```

---

## Despliegue (fuera de las tasks, requiere OK del usuario)

1. Mergear `multi-rol` → `main` en **ambos** repos (coordinado: el JWT cambia de forma; deben ir juntos). El shim legacy de Task 2/5 cubre las sesiones abiertas durante la ventana de deploy.
2. Push → Railway deploya y el `CMD` del Dockerfile corre `prisma migrate deploy` (aplica `usuario_roles_multiples`, que preserva datos). Verificar en logs "migration(s) applied".
3. Aplicar el dato de Rodriguez en prod (Task 9, Step 2).
4. Avisar a los usuarios con sesión abierta que, si algo de permisos se ve raro, cierren y vuelvan a entrar (token viejo).

## Actualizar documentación al cerrar

- `contexto-gestion-interna-backend.md` y `contexto-gestion-interna-frontend.md`: nueva sección "Multi-rol de Usuario (fecha)" — `rol` → `roles[]`, helpers `tieneRol`/`tieneAlgunRol`, guardia por intersección, migración, y que ADMINISTRACION ahora tiene encargado (Rodriguez, doble rol).
- Memoria de proyecto: anotar que el modelo de roles pasó a múltiple.

---

## Self-Review

**Cobertura de spec:**
- "Un usuario con varios roles" → Tasks 1-2 (schema+contrato), 5-7 (frontend).
- "Rodriguez aprueba OC/OP y confirma pagos" → Task 3 (gating backend por `includes`), Task 8 (E2E lo prueba), Task 9 (el dato).
- "Como el resto de sectores: le llega al encargado" → al ser ENCARGADO de ADMINISTRACION, `buscarActivosPorRol(ENCARGADO, ADMINISTRACION)` lo toma (Task 2 Step 7 + Task 9). Verificado en Task 8 Step 4 / Task 9 Step 3.
- Migración sin pérdida de datos → Task 1 Step 3 (backfill).
- Compat de sesiones abiertas → Task 2 Step 3 (JWT) + Task 5 Step 4 (localStorage).

**Consistencia de tipos:** `roles: RolUsuario[]` usado idéntico en `PayloadJwt`, `UsuarioAutenticado`, `UsuarioAutenticadoDto`, `RespuestaUsuarioDto`, DTOs crear/actualizar, `DatosCrear/Actualizar`, y en frontend `Usuario`/`PayloadJwt`/tipos de usuarios. Helpers `tieneRol(usuario, rol)` / `tieneAlgunRol(usuario, roles)` con la misma firma en back y front. `buscarActivosPorRol(rol, sectorId?)` mantiene su firma (filtro `{ has: rol }`).

**Placeholders:** ninguno — cada paso trae el código o el reemplazo exacto con archivo:línea.
