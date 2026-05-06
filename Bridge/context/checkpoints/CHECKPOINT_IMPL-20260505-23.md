# CHECKPOINT IMPL-20260505-23

**ID de Intervención:** IMPL-20260505-23  
**Agente:** SOFIA - Builder  
**Fecha:** 2026-05-05  
**SPEC de Referencia:** ARCH-20260505-23  
**Estado:** ✅ Completado — listo para commit y publicación

---

## Resumen de Entrega

Implementación del corte de cotizaciones versionadas V1 sobre el `project` activo de Bridge. El operador puede crear versiones borrador, marcar una como vigente y el cliente ve la propuesta vigente en `/cotizaciones`.

---

## Archivos Tocados

### Nuevos (untracked → staged)
| Archivo | Descripción |
|---------|-------------|
| `supabase/migrations/20260506000000_quotations_versionadas_v1.sql` | Tablas `quotations` + `quotation_versions`, índices, RLS, trigger `updated_at`, seed demo Vectoria |
| `lib/quotations.ts` | Tipos, helpers de etiquetas, funciones server-side: `getQuotationWorkspace`, `createQuotationDraftVersion`, `setQuotationActiveVersion` |
| `lib/quotations.test.ts` | 5 tests unitarios: etiquetas de estado, `nextVersionNumber` con lista vacía, lista normal y con gaps |
| `context/COTIZACIONES_VERSIONADAS_V1.md` | Regla operativa cerrada de cotizaciones versionadas |
| `context/SPECs/SPEC_ARCH-20260505-23_cotizaciones_versionadas_v1.md` | SPEC del corte |

### Modificados
| Archivo | Descripción |
|---------|-------------|
| `app/cotizaciones/page.tsx` | UI completa: resumen comercial, estado administrativo, historial, formulario crear versión, acción marcar vigente |
| `PROYECTO.md` | Micro-sprint actualizado al corte 23, estado comprobable actualizado, backlog ajustado |

---

## Validación de Soft Gates

### Gate 1 — Compilación
```
✓ Compiled successfully in 1569ms
✓ Linting and checking validity of types
✓ Generating static pages (13/13)
/cotizaciones → ƒ (Dynamic, server-rendered on demand)
```
**Resultado:** ✅ PASA

### Gate 2 — Tests
```
✓ lib/quotations.test.ts    (5 tests) — NUEVOS
✓ lib/briefing.test.ts      (4 tests)
✓ lib/identity.test.ts      (2 tests)
✓ lib/tenant-runtime.test.ts(2 tests)
✓ lib/bridge-data.test.ts   (3 tests)

Test Files  5 passed (5)
Tests      16 passed (16)
```
**Resultado:** ✅ PASA

### Gate 3 — Revisión de Código
Qodo CLI en sunset. Revisión manual realizada:

- Inputs de server actions saneados con `.trim()` y validación de campos requeridos antes de ejecutar.
- `postgrest()` usa `SUPABASE_SERVICE_ROLE_KEY` con fallback a `anonKey` — nunca expuesto al cliente.
- RLS activo en ambas tablas (`quotations`, `quotation_versions`): lectura pública restringida a tenants activos, escritura solo para `service_role`.
- `active_version_id` resuelto en memoria desde el array de versiones ya cargado — sin query extra.
- No hay SQL crudo expuesto al cliente ni interpolación de strings en queries.
- Seed idempotente: verifica existencia antes de insertar.

**Resultado:** ✅ PASA (sin hallazgos críticos)

### Gate 4 — Documentación
- Watermark JSDoc `IMPL-20260505-23` en todos los archivos del corte.
- SPEC referenciada en cada archivo.
- `PROYECTO.md` actualizado con estado comprobable, backlog y último corte cerrado.
- Este checkpoint generado en `context/checkpoints/`.

**Resultado:** ✅ PASA

---

## Migración Remota

```
supabase db push --linked --include-all
→ Remote database is up to date.
```

La migración `20260506000000_quotations_versionadas_v1.sql` fue aplicada remotamente. El tenant `vectoria` tiene cotización demo con versión V1 `approved` marcada como vigente y ligada al `project` demo activo.

---

## Criterios de Aceptación (SPEC ARCH-20260505-23)

| # | Criterio | Estado |
|---|---------|--------|
| 1 | Existen tablas y seed mínima de cotizaciones versionadas | ✅ |
| 2 | El tenant `vectoria` tiene cotización demo real ligada al `project` demo | ✅ |
| 3 | `/cotizaciones` muestra versión vigente y estado administrativo del caso activo | ✅ |
| 4 | El operador puede crear una nueva versión y marcarla como vigente | ✅ |
| 5 | El modelo queda listo para que activos y aprobaciones usen la cotización vigente | ✅ |
| 6 | Build y tests pasan | ✅ |

---

## Fuera de Alcance (respetado)

- ❌ Facturación real — no implementado
- ❌ Pagos — no implementado
- ❌ Firma o aceptación jurídica — no implementado
- ❌ Módulo completo de cobranza — no implementado

---

## Mensaje de Commit Sugerido

```
feat(cotizaciones): implementar cotizaciones versionadas V1 sobre project activo

- Migración 20260506000000: tablas quotations + quotation_versions con RLS
- lib/quotations.ts: tipos, helpers y capa server-side mínima
- app/cotizaciones/page.tsx: UI completa con historial, crear versión y marcar vigente
- lib/quotations.test.ts: 5 tests unitarios (16/16 suite completa pasa)
- Seed demo Vectoria: cotización V1 approved ligada al project demo activo
- PROYECTO.md actualizado al micro-sprint ARCH-20260505-23

IMPL-20260505-23
```

---

## Estado para Publicación

**Listo para commit y push a `main`.**

Todos los Soft Gates validados. Migración aplicada remotamente. Build limpio. Suite completa verde.
