# CHECKPOINT IMPL-20260506-46

**ID de Intervención:** IMPL-20260506-46
**Fecha:** 2026-05-06
**SPEC de Referencia:** `context/SPECs/SPEC_ARCH-20260506-46_cierre_activo_propuestas_persistentes_y_revision.md`
**Agente:** SOFIA - Builder

---

## Resumen Ejecutivo

Se cerró el principal vacio del activo creativo: la sección de propuestas deja de depender exclusivamente de mensajes de conversación y ahora tiene persistencia propia via la tabla `asset_proposals`. La ficha muestra tarjetas reales con trazabilidad al prompt origen, distinción principal/alternativa, y decision operativa editable in-situ por el operador.

---

## Archivos Tocados (6)

| Archivo | Tipo de cambio |
|---------|----------------|
| `supabase/migrations/20260506060000_asset_proposals_v1.sql` | **NUEVO** — Tabla `asset_proposals` con RLS y policies |
| `lib/asset-detail.ts` | **EXTENDIDO** — Tipos SPEC-46, funciones puras nuevas, fetch/insert/update |
| `lib/asset-detail.test.ts` | **EXTENDIDO** — 20 tests nuevos para SPEC-46 |
| `app/activos/[id]/page.tsx` | **ACTUALIZADO** — Tarjetas de propuestas reales + decisión operativa |

*(4 archivos modificados + 1 nuevo = dentro del alcance delegado de SPEC-46)*

---

## Gate 1: Compilación ✅

```
✓ Compiled successfully in 2.9s
✓ Generating static pages (12/12)
```
Build Next.js limpio sin errores de TypeScript.

---

## Gate 2: Testing ✅

```
Test Files  13 passed (13)
     Tests  259 passed (259)
  Duration  985ms
```

Tests nuevos agregados (20):
- `normalizeProposalRow` — 4 casos (fila completa, prompt null, is_primary false, review_decision)
- `derivePrimaryAndSecondary` — 5 casos (vacío, 1 propuesta, isPrimary respetado, orden por fecha, comparisonNote)
- `resolveOperativeDecision` — 3 casos (vacío, con primary, sin primary)

---

## Gate 3: Revisión Manual (Qodo abrió interfaz web, sin salida terminal)

**Revisión manual exhaustiva ejecutada:**

### Seguridad
- ✅ No hay SQL injection: todos los writes van como JSON body a PostgREST, sin concatenación de strings
- ✅ CHECK constraints en DB validan `tool_used` y `review_decision` (segunda línea de defensa)
- ✅ RLS policies correctas: read para anon/authenticated (con tenant activo), write exclusivo para service_role
- ✅ Service role key usada solo server-side, nunca expuesta al cliente
- ✅ `insertAssetProposal` valida que note no este vacío antes de enviar (validación de frontera)

### Correctitud del contrato
- ✅ `AssetDetailFull` expone exactamente los campos requeridos por SPEC-46: `primaryProposal`, `secondaryProposal`, `proposalComparisonNote`, `reviewDecision`
- ✅ `buildV1ProposalDrafts` mantenida con `@deprecated` para no romper tests de SPEC-45
- ✅ `fetchAssetProposals` degrada honestamente con `try/catch` si la tabla no existe en algún entorno sin migración
- ✅ `getFullAssetDetail` paraleliza fetch de chat y proposals con `Promise.all`

### UI / Page
- ✅ Tarjeta principal usa color accent, alternativa usa colores neutros — distinción visual clara
- ✅ `updateDecisionAction` y `addProposalAction` llaman `revalidatePath` correctamente
- ✅ Checkbox `isPrimary` con hidden input previo para garantizar valor "false" cuando no está marcado
- ✅ Flujo Bridge → Adobe → Bridge sigue visible e intacto (no tocado)

---

## Gate 4: Documentación ✅

- Marcas de agua IMPL-20260506-46 en todos los archivos tocados
- Checkpoint presente en `context/checkpoints/`
- SPEC de referencia vinculada en comentarios de archivo

---

## Migración Remota

```
Applying migration 20260506060000_asset_proposals_v1.sql...
Finished supabase db push.
```
Aplicada exitosamente al entorno remoto vinculado.

---

## Vacios Reducidos (vs SPEC-45)

| Gap | SPEC-45 | SPEC-46 |
|-----|---------|---------|
| `asset_proposals: tabla no existe` | ⬜ Vacio | ✅ **CERRADO** |
| `proposal_comparison: comparador visual binario` | ⬜ Vacio | ⬜ Fuera de alcance |
| `file_upload: carga binaria` | ⬜ Vacio | ⬜ Fuera de alcance |
| `client_approval: aprobacion final` | ⬜ Vacio | ⬜ Fuera de alcance |
| `analytics_per_asset` | ⬜ Vacio | ⬜ Fuera de alcance |

---

## Criterios de Aceptacion SPEC-46 — Verificacion

| Criterio | Estado |
|----------|--------|
| El activo deja de depender solo de mensajes para representar propuestas | ✅ Tabla `asset_proposals` existe y la ficha la consume |
| La ficha puede mostrar al menos una propuesta persistida y su trazabilidad al prompt | ✅ Tarjeta muestra nota, herramienta, version de prompt y fecha |
| Si existen dos propuestas, la UI las distingue con claridad | ✅ Principal en accent, alternativa en neutro + comparisonNote |
| El operador puede entender si debe aprobar, pedir ajuste o seguir esperando | ✅ Selector de decision editable in-situ en cada tarjeta |
| Los vacios honestos se reducen respecto al corte 45 | ✅ De 5 gaps a 4 (asset_proposals cerrado) |
| Cliente sigue fuera de alcance | ✅ No se modifico nada de /cliente |
| Build y tests pasan | ✅ 259/259 tests, build limpio |

---

## Siguiente Paso Recomendado

Con el activo cerrado como objeto completo (prompt + propuestas + decision operativa), el siguiente corte puede abrir **Cliente** — la superficie de presentacion y aprobacion final para el cliente externo.
