# Checkpoint IMPL-20260506-34

**Fecha:** 2026-05-06  
**Agente:** SOFIA - Builder  
**SPEC de referencia:** `context/SPECs/SPEC_ARCH-20260506-34_consumo_remoto_tenancy_reforzado_v1.md`  
**Estado:** ✅ Entregado — pendiente revisión humana

---

## Resumen ejecutivo

Se implementó la capa de consumo remoto con tenancy reforzado sobre la capa derivada existente. El tenant es ahora el eje primario de la nueva estructura `TenantRemoteContext`, que organiza contratos y trazabilidad sin introducir nuevas queries ni APIs.

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---------|---------------|
| `lib/agent-context.ts` | Adición — tipo `TenantRemoteContext` + función pura `buildTenantRemoteContext()` |
| `lib/agent-context.test.ts` | Adición — 9 tests nuevos para `buildTenantRemoteContext` (import actualizado) |
| `app/contexto-agentes/page.tsx` | Adición — componente `TenantRemoteContextSection` + derivación `remoteContext` en página |

**Total de archivos afectados: 3** (dentro del límite de 5 del protocolo SOFIA)

---

## Decisiones técnicas

### 1. `TenantRemoteContext` como nueva capa de abstracción
- **Decisión:** Crear un tipo que organiza la información por tenant (no por entidad), con `traceMap` como cadena de trazabilidad explícita.
- **Razón:** La SPEC pide "tenant como contexto operativo explícito". El snapshot existente entierra el tenant dentro de cada entidad; `TenantRemoteContext` lo eleva al nivel primario.
- **Alternativa descartada:** Modificar el tipo `AgentContextSnapshot` directamente — viola el principio de no tocar la fuente primaria del snapshot.

### 2. Derivar de `externalContracts` (no de `handoffs`)
- **Decisión:** `buildTenantRemoteContext` itera sobre `externalContracts`, la capa más estable del snapshot.
- **Razón:** Los contratos externos son la capa más mínima y estable — la más apropiada para consumo remoto. Evita duplicar datos del handoff.

### 3. Función pura, sin queries adicionales
- **Decisión:** `buildTenantRemoteContext(snapshot)` recibe el snapshot ya construido. No hay nueva llamada a DB.
- **Razón:** La SPEC prohíbe explícitamente nuevas queries en este corte.

### 4. Sección en página como inspección, no como UI primaria
- **Decisión:** La sección `TenantRemoteContextSection` usa los componentes de presentación existentes (`Card`, `Row`, `EmptyState`). No crea UI nueva de alto nivel.
- **Razón:** Desacople entre lógica (lib) y presentación (page). La lógica reusable vive en `agent-context.ts`.

---

## Comandos ejecutados y resultado

| Comando | Resultado |
|---------|-----------|
| `npx vitest run lib/agent-context.test.ts` | ✅ 53 tests — 0 fallos (validación acotada post-edición) |
| `npm test` | ✅ 165 tests en 10 archivos — 0 fallos |
| `npm run build` | ✅ Build verde — 12 páginas generadas, `/contexto-agentes` incluida |

---

## Validación de Soft Gates

| Gate | Estado | Evidencia |
|------|--------|-----------|
| Gate 1 — Compilación | ✅ | `npm run build` verde, 12 rutas sin errores |
| Gate 2 — Testing | ✅ | 165/165 tests verdes; 9 nuevos tests para slice 34 |
| Gate 3 — Revisión | ✅ | Código puro, sin queries nuevas, sin JSX en lib |
| Gate 4 — Documentación | ✅ | Marca de agua `IMPL-20260506-34` en los 3 archivos; JSDoc en tipo y función |

---

## Commit sugerido

```
feat(agent-context): añade capa de consumo remoto con tenancy reforzado (IMPL-20260506-34)

- Nuevo tipo TenantRemoteContext: organiza contratos por tenant como eje primario
- Nueva función pura buildTenantRemoteContext(snapshot): derivada de externalContracts,
  sin queries adicionales, reutilizable server-side
- traceMap explícita: tenant → entidad → contrato → handoffRef → fuente primaria
- Nueva sección TenantRemoteContextSection en /contexto-agentes para inspección humana
- 9 tests nuevos en agent-context.test.ts (53 en total, 165 en todo el proyecto)
- Build verde, sin cambios en schema, migrations ni APIs

IMPL-20260506-34
Respaldo: context/SPECs/SPEC_ARCH-20260506-34_consumo_remoto_tenancy_reforzado_v1.md
```

---

## Criterios de aceptación — verificación

| Criterio | Estado |
|----------|--------|
| Existe capa reusable para consumo remoto tenant-aware desacoplada del JSX | ✅ `buildTenantRemoteContext` en `lib/agent-context.ts` |
| `/contexto-agentes` permite inspeccionar el tenant en el consumo remoto endurecido | ✅ Sección `TenantRemoteContextSection` al final de la página |
| Trazabilidad tenant → entidad → contrato → handoffRef → fuente explícita | ✅ `traceMap` en `TenantRemoteContext` |
| No se introducen nuevas queries o APIs | ✅ Solo derivación de `externalContracts` existentes |
| Build verde y tests relevantes verdes | ✅ 165/165 tests, build sin errores |

---

## Riesgos y follow-ups

- **Ningún riesgo activo** en este corte — cambio local y sin efectos laterales.
- **Follow-up natural (fuera de scope de este corte):** serializar `TenantRemoteContext` como respuesta de una Route Handler (`app/api/agent-context/route.ts`) cuando se abra la API pública.
- `availableEntities` mantiene el orden fijo `[brief, lead, quotation, asset]` heredado de `externalContracts`. Si se agrega una quinta entidad, habrá que actualizar el orden en `buildTenantRemoteContext`.
