# Categoría de OC + refactor (fuera Tarea/Rubro) + PDF por umbral USD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o superpowers:executing-plans. Steps con checkbox (`- [ ]`).

## Goal

Que una Orden de Compra (OC) tenga una **categoría**, y refactorizar el modelo alrededor de eso:

1. **Categoría** (enum nuevo, 7 valores). `PROYECTOS_ESCO` → OC con **proyecto + cliente**; las otras 6 (`PRODUCTOS_STOCK`, `PRODUCTOS_REPOSICION`, `INTERNO_SEG`, `OTROS`, `SEG_GREENPOWER`, `SEG_HELIOTEC`) → **sin proyecto ni cliente**.
2. **Eliminar Tarea y Rubro** por completo. La **Cotización cuelga directo de la OC** (1:1) y, en ESCO, del proyecto.
3. **Cotización: siempre.** Toda OC crea su cotización 1:1, sin importar categoría ni monto.
4. **PDF adjunto condicional.** El adjunto PDF es **obligatorio solo si el monto sin IVA ≥ 1000 USD**; por debajo es opcional. Aplica a la OC y a su cotización.

`tipo` (ARTICULO/SERVICIO) se mantiene intacto — es otro concepto, no confundir con `categoria`.

## Reglas de negocio

- **Monto sin IVA (neto)**, en la moneda de la OC: `(pagaIva && ivaIncluido) ? monto / (1 + 0.22) : monto`. Tasa IVA Uruguay 0.22 (ya existe `TASA_IVA_URUGUAY` en el front `lib/iva.ts`; se replica como constante en el backend).
- **Conversión a USD** con `tipos-cambio` (`TipoCambio.valorEnUyu` = valor de 1 unidad de esa moneda en UYU; UYU es base = 1, no tiene fila): `montoUyu = neto * valorEnUyu(monedaOC)`; `montoUsd = montoUyu / valorEnUyu(USD)`. Si falta el tipo de cambio de la moneda de la OC o de USD → 422 `TIPO_CAMBIO_NO_DISPONIBLE`.
- **Umbral**: `UMBRAL_PDF_USD = 1000`. Si `montoUsd >= 1000` ⇒ PDF obligatorio (si no viene → 422 `ADJUNTO_REQUERIDO`). Si `< 1000` ⇒ PDF opcional.
- **Proyecto/cliente** dependen SOLO de la categoría (no del monto). **Cotización** se crea SIEMPRE. **PDF** depende SOLO del monto (no de la categoría). Son ejes independientes.

## Architecture

- Enum `CategoriaOrdenCompra` + campo `categoria` en `OrdenCompra`.
- `OrdenCompra`: `proyectoId?`, `clienteId?`, `archivoPdfRuta?` (opcionales); `cotizacionId` obligatorio (@unique); se eliminan `tareaId` y `rubroId`.
- `Cotizacion`: `proyectoId?` (opcional), `archivoPdfRuta?` (ya era opcional); se elimina `tareaId`.
- `OrdenPago`: se elimina `tareaId`.
- Se eliminan las entidades `Tarea` y `Rubro` (modelos, tablas, módulos, endpoints, front).
- Un solo camino de creación en el repositorio: `crearConCotizacion` (siempre crea cotización; `proyectoId`/`clienteId` nullable). No hay `crearSimple`.
- Service: deriva proyecto/cliente de la categoría (`requiereProyecto`), valida el PDF por umbral USD (nuevo helper + `tipos-cambio`), y siempre crea la cotización.
- Detalle de proyecto: solo las OC ESCO tienen proyecto → sus cotizaciones se listan **planas** (1:1 con cada OC), sin agrupar (ya no hay Tarea/Rubro).

**Tech Stack:** NestJS 11, Prisma 7.9.1 (`prisma-client`), PostgreSQL 16, Next.js 16 + React 19 + TS, React Query, React Hook Form.

## Global Constraints

- **Todo en español** (salvo decoradores Nest, `layout.tsx`/`page.tsx`, env vars).
- **Verificación**: por tarea `npx tsc --noEmit` + `npx eslint .`; comportamiento con E2E por API real (Node 22 `fetch`). No hay jest e2e que bootee. Ver [[feedback_claude_in_chrome_no_conecta]].
- **No pushear/mergear** hasta que el usuario lo pida. Rama `categoria-orden-compra` (de `main`) en cada repo. Ver [[feedback_flujo_ramas_testing]].
- **Aplicar/deployar al final**: nada en uso todavía; se codea todo y recién al final se aplica la migración y se deploya (prod, vía push → Railway `migrate deploy`). Migración **destructiva** (dropea `rubros`, `tareas`, columnas `tarea_id`/`rubro_id`) → confirmar antes de pushear.
- **Migración a mano**: `migrate dev` roto (shadow DB, `setval` de `20261007120000`). Una sola migración para todo el feature, aplicar con `migrate deploy` + `prisma generate`.
- **`.env` local manda mails REALES** en transiciones OC/OP. En E2E: crear (POST) no manda mail; aprobar/enviar sí → avisar. Ver [[feedback_mail_creds_activas_local]].
- **Mostrar el código completo en el chat** al editar. Ver [[feedback_mostrar_funciones_completas]].
- **Enum + etiquetas**: `PROYECTOS_ESCO`=Proyectos ESCO · `PRODUCTOS_STOCK`=Productos - Stock · `PRODUCTOS_REPOSICION`=Productos - Reposición · `INTERNO_SEG`=Interno SEG · `OTROS`=Otros · `SEG_GREENPOWER`=SEG Greenpower · `SEG_HELIOTEC`=SEG Heliotec.

---

## Estado de avance (parcial — revisar antes de seguir)
- **Schema**: hecho enum + `categoria` + rubro fuera + Tarea fuera + `proyectoId`/`clienteId` opcionales en OC. **FALTA ajustar**: `OrdenCompra.cotizacionId` → obligatorio; `OrdenCompra.archivoPdfRuta` → opcional; `Cotizacion.proyectoId` → opcional.
- **Migración**: escrita con categoria/rubro/tarea. **FALTA ajustar**: NO dropear not-null de `cotizacion_id`; SÍ dropear not-null de `ordenes_compra.archivo_pdf_ruta` y `cotizaciones.proyecto_id`.
- **DTO** (`crear-orden-compra`): hecho (`categoria`, `proyectoId` condicional, sin rubro).
- **Constante** `ordenes-compra.constantes.ts`: hecho `CATEGORIAS_CON_PROYECTO`/`requiereProyecto`. FALTA `UMBRAL_PDF_USD` + helper de monto.
- **Repositorio OC**: `crearConCotizacion` sin Tarea (hecho) — FALTA quitar `crearSimple` y que `proyectoId` sea nullable; `eliminar` ya guarda cotización.
- **Service OC**: imports/constructor sin rubro (hecho), `requiereProyecto` importado. **FALTA** reescribir `crear` (camino único + validación PDF) y quitar `resolverRubro` (quedó roto).
- **OP** `derivarJerarquia`: acepta `string|null` (hecho). FALTA quitar `tareaId`.

---

## Tasks (backend)

### Task 1: Schema + migración
- [ ] `schema.prisma`: `OrdenCompra.cotizacionId` → `String @unique` (obligatorio) + `cotizacion Cotizacion` (no opcional); `OrdenCompra.archivoPdfRuta` → `String?`; `Cotizacion.proyectoId` → `String?` + `proyecto Proyecto?`. (Lo demás ya hecho: categoria, rubro/tarea fuera, proyectoId/clienteId OC opcionales.)
- [ ] Migración `20261105120000_...`: dejar categoria add+backfill+drop default; `ordenes_compra.proyecto_id` DROP NOT NULL; **`ordenes_compra.archivo_pdf_ruta` DROP NOT NULL**; **`cotizaciones.proyecto_id` DROP NOT NULL**; NO tocar `cotizacion_id`; drop `rubro_id` + `DROP TABLE rubros`; drop `tarea_id` (cotizaciones/ordenes_pago/ordenes_compra) + `DROP TABLE tareas`.
- [ ] `prisma validate` + `prisma generate`.

### Task 2: Constantes + helper de monto + DTO
- [ ] `ordenes-compra.constantes.ts`: `CATEGORIAS_CON_PROYECTO`/`requiereProyecto` (hecho) + `UMBRAL_PDF_USD = 1000` + `TASA_IVA = 0.22`.
- [ ] Helper `montoNeto(monto, pagaIva, ivaIncluido)` (en constantes o util propio).
- [ ] DTO `crear-orden-compra`: hecho. (El adjunto se maneja en el controller/service, no en el DTO.)

### Task 3: Repositorio OC
- [ ] `crearConCotizacion`: `proyectoId: string | null`; cotización con `proyectoId` (nullable) + `archivoPdfRuta: string | null`; OC con `archivoPdfRuta: string | null`. Quitar `crearSimple` (interface + impl).
- [ ] Interface: un solo `DatosCrearOrdenCompra extends DatosBaseOrdenCompra { clienteId: string|null; proyectoId: string|null }`; `archivoPdfRuta: string | null` en la base.
- [ ] `eliminar` (ya guarda `cotizacionId`): como ahora siempre hay cotización, el guard queda inocuo; dejar o simplificar.

### Task 4: Service OC — camino único + validación de PDF por umbral USD
- [ ] Inyectar `TIPOS_CAMBIO_REPOSITORIO`. Quitar `resolverRubro`.
- [ ] `crear`: validar pago único; calcular `montoNetoUsd` (helper + tipos de cambio, 422 si falta); si `>= UMBRAL_PDF_USD` y no hay adjunto → 422 `ADJUNTO_REQUERIDO`; guardar adjunto si vino; derivar proyecto/cliente si `requiereProyecto`; **siempre** `crearConCotizacion` (proyecto/cliente null si no-ESCO; `archivoPdfRuta` null si no vino).
- [ ] Helper privado `calcularMontoNetoUsd(dto, tiposCambio)`.

### Task 5: Controller (adjunto opcional) + Mapper + Respuesta DTO
- [ ] `ordenes-compra.controller.ts`: el `POST` multipart deja el archivo **opcional** (sin `ParseFilePipe` obligatorio / `fileIsRequired: false`), pasa `adjunto?` al service.
- [ ] Respuesta DTO + mapper: `+categoria`, `proyectoId/cotizacionId/archivoPdfRuta` nullable donde corresponda, **quitar `tareaId` y `rubroId`**.

### Task 6: Mail de OC
- [ ] `ETIQUETAS_CATEGORIA` en `etiquetas-correo.ts`. `plantillas-orden-compra.ts`: `proyecto` nullable → asunto/filas condicionales; agregar `Categoría`; quitar `Rubro`.

### Task 7: Cotizaciones — sacar Tarea
- [ ] Controller: eliminar rutas `/tareas/:tareaId/cotizaciones[/activa]`. Repositorio: eliminar `buscarPorTarea`/`buscarActivaPorTarea`, quitar include `tarea`, dejar de derivar `rubroNombre`. Service: eliminar `listarPorTarea`/`buscarActivaPorTarea`. DTOs: quitar `tareaId`/`rubroNombre`. Interface: idem.

### Task 8: Ordenes de Pago — sacar tareaId
- [ ] `derivarJerarquia` devuelve `{clienteId, proyectoId}` (sin tareaId); create OP sin tareaId; mapper/respuesta DTO/interface sin `tareaId`.

### Task 9: Proyectos — quitar refs a tareas
- [ ] `proyectos.repositorio.ts`/`service.ts`/interface: quitar includes/counts de `tareas`.

### Task 10: Borrar módulos + limpieza
- [ ] Borrar `src/tareas/` y `src/rubros/`. `app.module.ts`: quitar `TareasModulo`/`RubrosModulo`. `acciones-auditoria.constantes.ts`: quitar acciones Rubro (y Tarea si hay). `prisma/seed.ts` + `importar-*.ts` + `verificar-*.ts` + `limpiar-*.ts`: quitar rubros/tareas; OC/cotizaciones del seed con `categoria`, sin `tareaId`/`rubroId`.
- [ ] `npm run build` + `eslint` limpios; `grep -rni "tarea\|rubro" src` sin refs vivas.

### Task 11: E2E backend
- [ ] Casos: ESCO ≥1000 USD con PDF (201, con proyecto/cliente/cotización); ESCO <1000 USD sin PDF (201); no-ESCO ≥1000 sin PDF (422 ADJUNTO_REQUERIDO); no-ESCO <1000 sin PDF (201, sin proyecto/cliente, con cotización); ESCO sin proyectoId (400); moneda sin tipo de cambio (422). GET/DELETE. Transiciones solo avisando (mails).

## Tasks (frontend)

### Task 12: tipos + presentación + api OC
- [ ] `lib/ordenes-compra/tipos.ts`: `+CategoriaOrdenCompra`, `+categoria`, `proyectoId` nullable/opcional, `archivoPdfRuta` nullable, quitar `rubroId`/`tareaId`. `presentacion.ts`: `ETIQUETAS_CATEGORIA`, `categoriaRequiereProyecto`. `api.ts`: FormData con `categoria`, `proyectoId` solo ESCO, adjunto solo si hay. Borrar `lib/rubros/` y `lib/tareas/`.

### Task 13: Formulario OC
- [ ] `<Select>` Categoría arriba; proyecto (+cliente) solo si ESCO; quitar `SelectorRubro`. PDF: exigirlo en el form solo si el monto neto en USD ≥ 1000 (usar `lib/iva.ts` + `GET /tipos-cambio`); si no, permitir enviar sin adjunto. La validación dura la hace el backend.

### Task 14: Listados/detalles OC y OP
- [ ] Tabla OC: quitar Rubro, mostrar Categoría. Detalle OC/OP: quitar rubro/tarea, mostrar Categoría, guardar null proyecto/cliente/cotización/adjunto.

### Task 15: Detalle de proyecto — fuera pestaña Rubros
- [ ] Quitar pestaña "Rubros" (tareas) + `components/tareas/*`. Cotizaciones del proyecto = lista plana. Ajustar `ResumenFilaProyecto`/`TablaProyectos`/`TarjetaComprometido` si cuentan tareas.

### Task 16: Verify frontend
- [ ] `tsc` + `eslint` + `next build` (solo se acepta el fallo de Google Fonts offline).

## Riesgos / decisiones cerradas
- Cotización siempre; PDF condicional a monto neto ≥ 1000 USD (conversión vía tipos-cambio; 422 si falta el tipo de cambio).
- No-ESCO sin tope de monto en OP (el eslabón ya hace early-return sin cotización — pero ahora siempre hay cotización en la OC; igual la OP valida contra la cotización de su OC cuando existe).
- Datos históricos (Osmosis) pierden el vínculo a tarea en el drop; aceptado (nada en uso).
- Migración destructiva en prod: confirmar antes de pushear.
- `tipo` (ARTICULO/SERVICIO) intacto.
