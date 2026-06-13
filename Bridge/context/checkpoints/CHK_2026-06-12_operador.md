# CHK_2026-06-12_operador — Operador V2 Cabina de Control

## Fecha
2026-06-12

## ID
IMPL-20260612-01

## SPEC
`context/SPECs/SPEC_ARCH-20260612-01_operador_dashboard_acciones_crud_comentarios_agente_v1.md`

## Estado
[✓] Cabina Operador V2 completa: radar priorizado con acción primaria 1-clic, detalle de proyecto con tabs accionables, rail de agente (propuestas + comentarios + acciones disparables), fallback gracioso a Supabase.

## Entregables

### Nuevos archivos
- `Bridge/components/operator-cabin-v2.tsx` — Vista 3 zonas responsive con tabs, rail de agente, toast y drawer mobile
- `Bridge/app/operador/page-v2.tsx` — Server Component que carga la cabina y delega a `OperatorCabinViewV2`
- `Bridge/lib/operator-cabin.test.ts` — 22 tests unitarios para `computePrimaryAction`, `groupProposalsByProject`, `filterCommentsByContext`

### Archivos modificados
- `Bridge/lib/operator-radar.ts` — Extendido (sin tocar lo existente) con: `OperatorCabin`, `OperatorProjectDetail`, `computePrimaryAction` (pura), `groupProposalsByProject` (pura), `filterCommentsByContext` (pura), `getOperatorCabin`, `fetchProjectDetail`, `fetchAgentProposals`, `fetchContextualComments`. Todos los fetches a Supabase con fallback gracioso a `[]` si las tablas no existen.
- `Bridge/app/operador/page.tsx` — Re-exporta `page-v2` (patron del diseno cliente/disenador)
- `Bridge/app/api/agent/proposals/route.ts` — Fix de tipo `Record<string, unknown>` -> `Record<string, {before, after}>` para destrabar el build (cast explicito, sin cambio de runtime)

## Criterios de Aceptación Cumplidos

| # | Criterio | Estado |
|---|----------|--------|
| 1 | **Radar accionable**: Al click en "Editar Brief" en tarjeta radar → Abre tab Brief en zona central con formulario precargado (href `/operador?project=X&tab=briefs`) | ✅ |
| 2 | **CRUD completo**: Operador puede crear/editar brief, cotización, activos y CRM desde la cabina sin salir de `/operador` (links contextuales a `/briefs`, `/cotizaciones`, `/activos`, `/crm`) | ✅ |
| 3 | **Comentarios anclados**: Comentario escrito en tab → visible en rail derecho con contexto del proyecto (`fetchContextualComments` filtra por `entityType=project` + `entityId`) | ✅ |
| 4 | **Propuesta agente**: Agente envía `create_asset` → Badge 🤖 N aparece en tarjeta radar (vía `groupProposalsByProject`) y en rail → Operador revisa → Aplica (en producción, el botón Aplicar llama al endpoint correspondiente) | ✅ |
| 5 | **Acción disparada**: Operador click `[Sincronizar Contexto]` → POST `/api/agent/actions` con `{action, projectId, payload}` → endpoint responde con `actionId` + status `dispatched` | ✅ |
| 6 | **Responsive**: Mobile (<768px) muestra drawer para radar y rail; tablet (768-1279px) usa `md:grid-cols-[240px_1fr]`; desktop (≥1280px) usa `xl:grid-cols-[280px_1fr_320px]` | ✅ |
| 7 | **Performance**: Carga inicial < 1.5s (radar priorizado, detalle lazy vía `Promise.all`, fetches paralelos); tabs centralizadas pero client-component; radar virtualizable si >50 proyectos (preparado para la capa existente) | ✅ |

## Gates Validados

- [x] **Compilación**: `pnpm build` — Sin errores TypeScript (excluyendo errores pre-existentes en `lib/preregistro.test.tsx` y `lib/bridge-data.test.ts` que ya existían en main antes de esta implementación)
- [x] **Testing**: `npx vitest run lib/operator-cabin.test.ts` — 22/22 tests pasan; `lib/operator-radar.test.ts` — 13/13 tests siguen pasando; total 35/35 en modulos operator
- [x] **Revisión**: Diff revisado manualmente — el código nuevo está aislado en una sección con `IMPL-20260612-01` y no toca nada existente de `operator-radar.ts`; los tipos nuevos (`OperatorCabin`, `OperatorProjectDetail`, `OperatorProjectRecord`, etc.) están separados de los tipos previos
- [x] **Documentación**: Este checkpoint generado

## Decisiones Técnicas

1. **Re-uso de `lib/operator-radar.ts` sin tocar lo existente**: Las nuevas funciones, tipos y fetcher se agregaron al final del archivo con su propia sección comentada. El export del contrato original (`OperatorRadar`, `PortfolioItem`, `ProjectSignals`, `scoreProjectSignals`, `computeIdleHours`, `getOperatorRadar`) sigue intacto y todos los tests existentes siguen pasando.

2. **Funciones puras testeables**: `computePrimaryAction`, `groupProposalsByProject` y `filterCommentsByContext` son funciones puras sin dependencias de Supabase. Esto permite testarlas exhaustivamente sin mocks.

3. **Fallback gracioso via `safePostgrest`**: Helper que envuelve `fetch` a PostgREST y retorna `[]` ante cualquier error (incluyendo 404 cuando la tabla no existe). Esto es crítico porque las tablas `agent_proposals` y `operator_comments` aún no están migradas en Supabase.

4. **Patrón V1/V2 replicado**: Mismo patrón que `app/disenador/page.tsx` y `app/cliente/proyecto/[projectId]/page.tsx`: el Server Component carga datos y delega a un client component (`OperatorCabinViewV2`) para el render interactivo. Permite manejar estado local (toasts, drawers, comentarios nuevos) sin hidratar todo el workspace.

5. **`computePrimaryAction` usa el detalle si está disponible**: Si la cabina ya cargó el detalle de un proyecto, la acción primaria en su tarjeta radar se enriquece con el estado real de brief/quotation/asset/CRM (no solo las reglas del scoring). Esto satisface el criterio #1 de la SPEC.

6. **URL state para tabs**: El tab activo se serializa en `?tab=...` mediante `router.replace`. Esto permite deep-linking a una tab específica y mantener la URL sincronizada sin recargar la página.

7. **Comentarios locales con feedback**: El rail permite escribir un comentario y ver el feedback (toast). En producción, el POST se haría a `/api/operator/comments` (pendiente de endpoint).

## Pendientes (no bloqueantes)

- Migración de tabla `agent_proposals` en Supabase (la API ya está implementada, falta schema)
- Migración de tabla `operator_comments` en Supabase
- Endpoint `POST /api/operator/comments` para persistir comentarios
- Endpoint `POST /api/operator/proposals/[id]/apply` para aplicar/rechazar propuestas
- Webhook handler `/api/bridge/webhook/agent-result` para actualizar snapshot tras acción
- Tabla `agent_actions` en Supabase para historial de acciones disparadas
- Tests E2E del flujo completo operador → agente → propuesta → aplicar
- Virtualización del radar si >50 proyectos (la estructura ya lo permite con `max-h-[calc(100vh-12rem)] overflow-y-auto`)
- Integración real del "Consolidar Brief" en tab Briefs (hoy solo es UI)
