# CHK_2026-06-12_05 — Fecha de creación en panel de cliente y detalle

## Fecha
2026-06-12

## ID
IMPL-20260612-04

## SPEC
`context/SPECs/SPEC_ARCH-20260612-04_fecha_creacion_cliente_panel_detalle.md`

## Estado
[✓] Fecha de creación del cliente visible en `/clientes`, header del proyecto y (opcionalmente) tarjeta del portal del cliente, con fallback "Fecha no disponible".

## Entregables

### Archivos modificados
- `Bridge/lib/assets.ts` — `getClientsByTenant` ahora selecciona `created_at` (la columna ya se usaba en `ORDER BY`).
- `Bridge/lib/clients.ts` — `ClientSummary` expone `createdAt: string | null`; `getClientDirectory` lo propaga.
- `Bridge/lib/client-portal.ts` — nueva función pura exportada `formatClientCreatedAt` (formato `DD/MMM/YY`, es-MX, tz `America/Mexico_City`, fallback `null`); `ClientRow` incluye `created_at`; `fetchClientById` lo selecciona; `ProjectStatusSummary` añade `clientCreatedAt: string | null` y se rellena en los tres puntos donde se construye (empty portal, ruta brief→project, ruta brief→client fallback).
- `Bridge/components/client-list.tsx` — línea `Creado: <DD MMM YY>` (text-[10px], uppercase, muted) bajo el nombre del cliente; muestra "Fecha no disponible" si la fecha es null.
- `Bridge/app/cliente/proyecto/[projectId]/page-v2.tsx` — header del proyecto añade línea `Cliente: <name> · Desde <DD MMM YY>` (text-[10px], uppercase, muted) con fallback "Fecha no disponible".
- `Bridge/lib/client-portal.test.ts` — 8 tests nuevos para `formatClientCreatedAt` (formato básico, zona horaria, null, undefined, ISO inválido, cadena vacía, longitud esperada, abreviaturas localizadas ene/dic).

## Criterios de Aceptación Cumplidos

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Listado de clientes muestra fecha en formato `DD/MMM/YY` bajo el nombre | ✅ |
| 2 | Detalle de proyecto muestra la fecha en el header del proyecto | ✅ |
| 3 | Formato corto localizado a es-MX | ✅ |
| 4 | Sin impacto en permisos (operador ve todas, cliente solo la suya) | ✅ |
| 5 | Sin joins adicionales (campo ya en `clients.created_at`, mismo select) | ✅ |
| 6 | Responsive (header mantiene `truncate` y se reacomoda en mobile) | ✅ |
| 7 | Tests unitarios verifican formato y fallback | ✅ (8 tests nuevos, 26/26 en `client-portal.test.ts`) |

## Gates Validados

- [x] **Compilación**: `pnpm build` — Sin errores TypeScript
- [x] **Testing**: `pnpm test` — 452 tests pasan, 26/26 en `client-portal.test.ts` (incluye 8 nuevos)
- [⚠] **Lint**: `pnpm lint` no ejecutable — el proyecto no tiene `eslint.config.*` ni `.eslintrc*` y `next lint` requiere configuración interactiva. Estado **pre-existente**, no introducido por esta implementación.
- [x] **Revisión**: Diff revisado contra la SPEC; sin desviaciones de scope; no se modifican dashboards V2 (Operador/Diseñador) ni permisos.
- [x] **Documentación**: Este checkpoint.

> Nota: Los 3 tests que fallan en `pnpm test` (`preregistro.test.tsx`, `bridge-data.test.ts`, `designer-workspace.test.ts`) son **fallos pre-existentes** no relacionados con esta SPEC (paquete `@testing-library/react` ausente y desajustes en score de diseñador y lista de módulos P0).

## Decisiones Técnicas

1. **`formatClientCreatedAt` como helper puro y exportado** en `lib/client-portal.ts`: permite que el operador (`client-list.tsx`) y el cliente (`page-v2.tsx`) compartan exactamente la misma lógica de formato, y que `client-portal.test.ts` lo pruebe de forma aislada sin tocar DOM ni mocks de Supabase.

2. **Sin nuevos joins**: el campo `created_at` ya estaba disponible en `clients` (la query de `getClientsByTenant` ordenaba por `created_at` desde antes). Solo se amplió el `select` para incluirlo en la respuesta.

3. **Fallback "Fecha no disponible"** se aplica a nivel de UI (no en la lib) cuando `formatClientCreatedAt` retorna `null`. Esto evita que la capa de datos invente fechas y mantiene el contrato de la SPEC: "si falta el campo, mostrar fallback explícito".

4. **Estilo consistente con el codebase**: `text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]` para no romper la densidad de información. Coincide con badges y metadatos secundarios ya existentes en `client-list.tsx` y `page-v2.tsx`.

5. **No se tocó el V1 `components/client-portal.tsx`**: aunque consume `ProjectStatusSummary`, no es importado por ninguna ruta activa (V2 re-exporta V2). Extender el tipo es backward-compatible y no requiere migración de la V1.

## Cambios fuera de scope (intencionalmente NO modificados)

- `Bridge/app/cliente/page.tsx` — Solo hace redirect a `/cliente/proyecto/[id]`; no renderiza tarjeta de cliente.
- `Bridge/components/operator-cabin-v2.tsx`, `designer-workspace-v2.tsx` — Dashboards V2 ya completados; la SPEC no requiere cambios ahí.
- `Bridge/components/client-portal.tsx` (V1) — Componente huérfano; sin ruta activa que lo consuma.
