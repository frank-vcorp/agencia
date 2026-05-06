# Checkpoint IMPL-20260505-29

## ID de Intervención
`IMPL-20260505-29`

## Fecha
2026-05-05

## SPEC de Referencia
`context/SPECs/SPEC_ARCH-20260505-29_hardening_validacion_cruzada_crm_v1.md`

## Agente
SOFIA - Builder

## Estado
`[✓] Completado` — 4 Soft Gates validados

---

## Resumen de Cambios

### `lib/crm.ts`

**Nuevo tipo exportado:**
- `LeadLinkResolution` — unión discriminada `{ ok: true; clientId; projectId } | { ok: false; error }`.

**Nueva función pura exportada:**
- `resolveLeadLinksFromData(clients, projects, clientId, projectId): LeadLinkResolution`
  - Sin vínculos → ok, ambos null (alta mínima intacta).
  - Solo `clientId` → valida existencia en el tenant.
  - Solo `projectId` → valida existencia y **auto-resuelve** `clientId` desde `project.clientId`.
  - Ambos → valida existencia de ambos y consistencia (proyecto pertenece al cliente).
  - Combinación inválida → `{ ok: false, error: "<descripción clara>" }`.

**Nuevas funciones internas:**
- `fetchCrmLinkDataForTenant(tenantId)` — consulta clientes y proyectos reales del tenant.
- `resolveLeadLinks(tenantId, clientId, projectId)` — wrapper async que delega a la función pura.

**Modificación en `createLeadForDefaultTenant()`:**
- Después de obtener `tenantId`, llama a `resolveLeadLinks()`.
- Si la validación falla → `throw new Error(result.error)` antes de cualquier escritura.
- El payload usa `linkResult.clientId` y `linkResult.projectId` (ya resueltos y validados).

### `lib/crm.test.ts`

**10 tests nuevos** en suite `crm — resolveLeadLinksFromData`:
1. Sin vínculos (null) → ok
2. Sin vínculos (undefined) → ok
3. Solo clientId válido → ok
4. clientId inexistente → error
5. Solo projectId válido → ok, clientId auto-resuelto
6. projectId inexistente → error
7. Ambos consistentes → ok
8. Ambos inconsistentes → error ("no pertenece")
9. clientId inexistente + projectId válido → error
10. Strings vacíos → tratados como ausencia de vínculo

---

## Criterios de Aceptación — Estado

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Lead con clientId+projectId consistentes se persiste | ✓ |
| 2 | Combinación inconsistente rechazada antes de Supabase | ✓ |
| 3 | Solo projectId → relación consistente y predecible | ✓ (auto-resuelve clientId) |
| 4 | Alta mínima sin vínculos sigue funcionando | ✓ |
| 5 | Build y tests pasan | ✓ |

---

## Soft Gates

| Gate | Resultado |
|------|-----------|
| 1. Compilación | ✓ `npm run build` — 13 páginas generadas sin errores |
| 2. Testing | ✓ 84/84 tests pasan (10 nuevos para slice 29) |
| 3. Revisión | ✓ Revisión manual — función pura, wrapper, integración correcta |
| 4. Documentación | ✓ JSDoc en funciones, marca de agua IMPL-20260505-29, checkpoint generado |

---

## Notas Técnicas

- **Principio del Cañón y la Mosca:** Se usó una función pura + wrapper mínimo. Sin nueva arquitectura de errores.
- **Testabilidad sin DB:** `resolveLeadLinksFromData` opera sobre arrays en memoria — no requiere mocking de Supabase.
- **Comportamiento de solo-projectId:** Auto-resuelve `clientId` desde `project.clientId`. Decisión documentada en SPEC (criterio 3).
- **Mecanismo de error:** `throw new Error(mensaje)` desde `createLeadForDefaultTenant`. El server action de Next.js lo maneja como error de servidor. No se inventó arquitectura de errores compleja.
- **Qodo CLI:** Fuera de servicio (sunset). Gate 3 cubierto con revisión manual de código.

---

## Commit
`456cf11` — `feat(crm): validación cruzada server-side de clientId/projectId en createLeadForDefaultTenant`

## Deuda Cerrada
Deuda explícita de `CHECKPOINT_IMPL-20260505-27.md` — "validación cruzada de clientId/projectId pendiente".

## Próximo Slice
Slice 28 — pendiente de apertura (fuera del alcance de este corte).
