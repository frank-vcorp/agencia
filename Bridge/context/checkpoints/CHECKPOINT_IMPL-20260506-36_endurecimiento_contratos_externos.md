# Checkpoint IMPL-20260506-36
## Endurecimiento de Contratos Externos V1

**Fecha:** 2026-05-06
**ID de Intervención:** IMPL-20260506-36
**Agente:** SOFIA - Builder
**SPEC de respaldo:** context/SPECs/SPEC_ARCH-20260506-36_endurecimiento_contratos_externos_v1.md
**Commit:** `faa7e36`

---

## Hipótesis falsada

La capa `externalContracts` tenía dos puntos de fragilidad estructural verificables:

1. **`handoffRef`** (`"<entityType>@<snapshotAt>"`) estaba implementado como template literal duplicado en 4 builders independientes. Un consumidor remoto no podía reproducir el formato sin inspeccionar la implementación.
2. **`contractVersion: "1.0"`** estaba hardcodeado 4 veces sin constante exportada, expuesto a drift silencioso.

Ambos puntos fueron eliminados. La hipótesis se validó implementando las primitivas y verificando con tests explícitos.

---

## Cambios implementados

### `lib/agent-context.ts`
- **Watermark actualizada:** `IMPL-20260506-36` + respaldo a SPEC-36 agregados al bloque JSDoc de cabecera.
- **`EXTERNAL_CONTRACT_VERSION`** exportada como `"1.0" as const`. Los 4 builders (`buildBriefExternalContract`, `buildLeadExternalContract`, `buildQuotationExternalContract`, `buildAssetExternalContract`) ahora referencian esta constante.
- **`buildHandoffRef(entityType, snapshotAt)`** exportada como función pura canónica. Los 4 builders delegan en ella en lugar de usar el template literal inline.
- Bloque de sección nuevo: `// ─── Constantes canónicas de contratos externos ───`.

### `lib/agent-context.test.ts`
- **Watermark actualizada:** `IMPL-20260506-36` + respaldo SPEC-36.
- **Import actualizado:** agrega `buildHandoffRef`, `EXTERNAL_CONTRACT_VERSION`.
- **11 tests nuevos** en 3 suites:
  - `buildHandoffRef (función canónica)`: formato, determinismo, discriminación por entidad, discriminación por timestamp.
  - `EXTERNAL_CONTRACT_VERSION (constante canónica)`: valor literal, invariante en builders individuales, invariante en colección.
  - `handoffRef consistencia con buildHandoffRef`: coherencia por las 4 entidades.

### `app/contexto-agentes/page.tsx`
- **Watermark actualizada:** referencia a SPEC-36 agregada. Sin cambios funcionales en la UI (la superficie de inspección no se rompe).

---

## Resultados de validación

| Gate | Estado | Detalle |
|------|--------|---------|
| **Gate 1 — Compilación** | ✅ Verde | `npx tsc --noEmit` sin errores; `npm run build` limpio |
| **Gate 2 — Testing** | ✅ Verde | 188 tests / 188 pasando (76 en agent-context, +11 nuevos) |
| **Gate 3 — Revisión** | ✅ Verde | Cambios acotados a 3 archivos; compatibilidad mantenida |
| **Gate 4 — Documentación** | ✅ Verde | Watermarks actualizadas; SPEC referenciada en todos los archivos tocados |

**Archivos modificados:** 3
**Tests nuevos:** 11
**Tests totales:** 188

---

## Resumen técnico del endurecimiento

| Antes | Después |
|-------|---------|
| `handoffRef: \`brief@${handoff.snapshotAt}\`` (duplicado ×4) | `handoffRef: buildHandoffRef("brief", handoff.snapshotAt)` |
| `contractVersion: "1.0"` (literal duplicado ×4) | `contractVersion: EXTERNAL_CONTRACT_VERSION` |
| Sin test de invariante de versión en colección | Test: todos los contratos de `buildExternalContracts` usan `EXTERNAL_CONTRACT_VERSION` |
| Sin test de formato canónico del ref | 4 tests de determinismo y discriminación en `buildHandoffRef` |

La capa `externalContracts` ahora cumple los 5 atributos de la decisión arquitectónica:
1. **Derivada** ✅ — sigue derivando de los handoffs sin tocar fuentes primarias.
2. **Consistente** ✅ — `handoffRef` y `contractVersion` tienen fuente única.
3. **Trazable** ✅ — `buildHandoffRef` es inspectable y testeable de forma independiente.
4. **Reusable** ✅ — `EXTERNAL_CONTRACT_VERSION` y `buildHandoffRef` son exportaciones públicas.
5. **Compatible** ✅ — la UI de `/contexto-agentes` no fue alterada.

---

## Estado de la V1 y nota de cierre de corte

Este corte (36) completa el endurecimiento contractual que faltaba para declarar la V1 realmente lista para consumidores remotos más estrictos.

**¿La V1 está lista para cierre?**

Sí, con una matiz: los contratos externos están estructuralmente sólidos y trazables. Lo que queda fuera del scope definido (API pública final, versionado mayor, webhooks, permisos distribuidos) está correctamente documentado como trabajo futuro en la SPEC. La V1 del sistema de conocimiento derivado (cortes 30–36) puede declararse **cerrada** si INTEGRA confirma que no hay otra pieza concreta en el backlog activo que bloquee ese cierre.

**Pieza concreta pendiente (si existe):** ninguna en este corte. El backlog activo debe ser consultado con CRONISTA para confirmar estado global.
