# CHECKPOINT IMPL-20260506-32

## Identificación

- **ID:** IMPL-20260506-32
- **Tipo:** Checkpoint de entrega
- **Agente:** SOFIA - Builder
- **Fecha:** 2026-05-06
- **SPEC de referencia:** `context/SPECs/SPEC_ARCH-20260506-32_contratos_externos_minimos_objetos_vivos_v1.md`
- **Corte anterior:** IMPL-20260506-31 (handoffs remotos endurecidos) @ HEAD 305c6d7

---

## Resumen ejecutivo

Implementada la capa de contratos externos mínimos sobre los objetos vivos priorizados de Bridge. Los contratos se derivan desde los handoffs remotos existentes (no desde la fuente primaria), son de solo lectura, pequeños, versionados y trazables. La superficie `/contexto-agentes` los expone visualmente sin reescribirse.

---

## Separación de capas implementada

```
Fuente primaria
  → AgentSummary          (snapshot derivado: IMPL-30)
    → RemoteHandoff       (handoffs endurecidos: IMPL-31)
      → ExternalContract  (contratos externos mínimos: IMPL-32)  ← NUEVO
```

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---------|---------------|
| `lib/agent-context.ts` | Nuevos tipos + funciones constructoras + campo en snapshot |
| `lib/agent-context.test.ts` | 16 tests nuevos para contratos externos |
| `app/contexto-agentes/page.tsx` | Sección visual de contratos externos |

---

## Tipos añadidos en `agent-context.ts`

### Genérico base
```typescript
ExternalContract<TEntityType, TMinimalPayload> = {
  entityType: TEntityType;
  contractVersion: "1.0";
  tenantSlug: string | null;
  generatedAt: string;           // ISO 8601, heredado del handoff
  handoffRef: string;            // "<entityType>@<snapshotAt>" — trazabilidad
  source: string;                // módulo:función de origen
  payload: TMinimalPayload;      // campos mínimos estables
}
```

### Payloads mínimos por entidad
| Entidad | Campos del payload externo |
|---------|---------------------------|
| `brief` | `id`, `statusLabel`, `isConsolidated`, `updatedAt` |
| `lead` | `id`, `statusLabel`, `isActive`, `updatedAt` |
| `quotation` | `id`, `statusLabel`, `isActive`, `totalEstimado` |
| `asset` | `total`, `delivered`, `hasDelivered` |

### Colección
```typescript
AgentExternalContracts = {
  brief: BriefExternalContract | null;
  lead: LeadExternalContract | null;
  quotation: QuotationExternalContract | null;
  asset: AssetExternalContract | null;
}
```

### Campo añadido al snapshot
```typescript
AgentContextSnapshot.externalContracts: AgentExternalContracts
```

---

## Funciones constructoras añadidas (puras, testeables)

| Función | Descripción |
|---------|-------------|
| `buildBriefExternalContract(handoff)` | Deriva contrato de brief desde handoff remoto |
| `buildLeadExternalContract(handoff)` | Deriva contrato de lead desde handoff remoto |
| `buildQuotationExternalContract(handoff)` | Deriva contrato de cotización desde handoff remoto |
| `buildAssetExternalContract(handoff)` | Deriva contrato de activos desde handoff remoto |
| `buildExternalContracts(handoffs)` | Colección completa desde AgentRemoteHandoffs |

---

## Validación de Soft Gates

### Gate 1: Compilación ✓
```
npm run build → ✓ Compiled successfully
12 rutas generadas. /contexto-agentes sigue siendo dinámica (ƒ).
```

### Gate 2: Testing ✓
```
npm test → 156 passed (156) — 10 archivos de test
16 tests nuevos para contratos externos, todos verdes.
```

### Gate 3: Revisión ✓
- **Qodo CLI:** descontinuado (sunset). Reemplazado por revisión manual equivalente.
- **Revisión manual — separación de capas:** `buildBriefExternalContract`, `buildLeadExternalContract`, `buildQuotationExternalContract`, `buildAssetExternalContract` reciben exclusivamente un `RemoteHandoff` como parámetro. Ninguna función accede directamente a `crm`, `briefing`, `dashboard` ni `assets`. La cadena de derivación es estricta.
- **Revisión manual — payload mínimo verificado:** `AssetExternalPayload` expone solo `total`, `delivered`, `hasDelivered` — no filtra `inProgress` ni `inReview` del handoff (test lo valida con `Object.keys`).
- **Revisión manual — `contractVersion`:** literal TypeScript `"1.0"` — breaking changes requieren cambio de tipo.
- **Revisión manual — `handoffRef`:** formato `"<entityType>@<snapshotAt>"`, legible y trazable.
- **Revisión manual — página:** `ExternalContractsSection` añadida sin modificar ninguna sección existente. El cast `as (AnyExternalContract | null)[]` necesario por TypeScript structural typing entre literal union y `string`.
- **Hallazgos CRÍTICOS:** ninguno.
- **Code smells menores:** el cast en la página es aceptable dado que el discriminante `entityType` no es observable en tiempo de ejecución a nivel de `filter`.
- Cambios de INTEGRA (PROYECTO.md, SPECs, checkpoints 30/31) no incluidos en commit.

### Gate 4: Documentación ✓
- Este checkpoint en `context/checkpoints/`
- Marca de agua `IMPL-20260506-32` en archivos modificados
- Commit selectivo en español con ID

---

## Restricciones respetadas

- ✅ No se abrieron endpoints, webhooks ni auth distribuida
- ✅ No se tocó base de datos ni migraciones
- ✅ Cambios ajenos (INTEGRA) no revertidos ni formateados
- ✅ Commit selectivo solo sobre los 3 archivos del corte

---

## Estado al cerrar el corte

- HEAD: commit `IMPL-20260506-32` (sobre 305c6d7)
- Build: verde
- Tests: 156/156 pasando
- Producción: desplegada y validada en `vectoria-zeta.vercel.app/contexto-agentes`
