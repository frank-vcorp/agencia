# CHECKPOINT IMPL-20260506-44
## Workspace del Disenador Guiado — SPECs 40 y 41

**Fecha:** 2026-05-06  
**ID:** IMPL-20260506-44  
**Commit:** b8c28aa

---

## Resumen

Reemplazo completo de `/disenador` de `RoleWorkspace` estatico a workspace de produccion real,
siguiendo las SPECs ARCH-20260506-40 (modelo de ejecucion con sesiones y estados) y
ARCH-20260506-41 (workspace guiado por IA).

---

## Archivos Tocados

| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| `lib/designer-workspace.ts` | Nuevo | Capa de datos: tipos, funciones puras, `getDesignerWorkspace` |
| `lib/designer-workspace.test.ts` | Nuevo | 18 tests de funciones puras |
| `components/designer-workspace.tsx` | Nuevo | UI: 7 secciones del workspace segun SPEC-41 |
| `app/disenador/page.tsx` | Modificado | Reemplaza `RoleWorkspace` por server component real |

---

## Soft Gates

| Gate | Estado | Detalle |
|------|--------|---------|
| 1. Compilacion | ✓ | `npm run build` limpio, 12 rutas, `/disenador` = ƒ (dynamic) |
| 2. Testing | ✓ | 224/224 tests pasando (18 nuevos para designer-workspace) |
| 3. Revision | ✓ | Fidelidad a SPEC-40 y SPEC-41 verificada campo por campo |
| 4. Documentacion | ✓ | Vacios V1 documentados en `gaps[]`, JSDoc con IDs |

---

## Contrato de Datos

### Tipos principales

```typescript
DesignerTaskStatus = "ready_to_start" | "in_progress" | "blocked" | "completed" | "ready_for_review"
CreativeTool = "firefly" | "adobe_express" | "photoshop" | "other"
DesignerAction = "start" | "block" | "resume" | "finish" | "ready_for_review"
```

### Estructura del workspace

- `activeTask`: primer activo con status `in_progress` (score 50+15)
- `nextSuggestedTask`: primer `ready_to_start` o `ready_for_review` con mayor score
- `taskQueue`: todos los no-completados ordenados por score desc
- `dailyStats`: conteo por estado derivado de assets (sin filtro de fecha en V1)

---

## Logica de Scoring

| Estado | Puntos base | Con prompt activo |
|--------|-------------|-------------------|
| in_progress | 50 | +15 = 65 |
| ready_for_review | 30 | +15 = 45 |
| ready_to_start | 20 | +15 = 35 |
| completed/blocked | 0 | +15 si tiene |

---

## Herramienta Creativa Sugerida

| Tipo de pieza | Herramienta |
|---------------|-------------|
| imagen, portada, banner | Firefly |
| carousel, historia, reel, video | Adobe Express |
| copy, anuncio_texto | other (texto) |
| resto | Photoshop |

---

## Flujo Bridge → Adobe → Bridge

La UI representa explicitamente el flujo hibrido segun SPEC-40:
1. Bridge entrega el prompt y el contexto
2. Disenador salta a estacion Adobe (Firefly → Express → Photoshop segun pieza)
3. Disenador regresa propuestas a Bridge para revision del operador

---

## Vacios V1 Documentados (gaps[])

1. `work_sessions`: tabla no existe — duracion y tiempo efectivo no disponible
2. `designer_tasks`: tabla no existe — estado `blocked` no persiste, depende de asset status
3. `asset_proposals`: tabla no existe — propuestas de regreso se registran manualmente
4. `daily_time_filter`: completedCount incluye todos los completados, no solo los de hoy

---

## Acciones de Sesion V1

Los botones de control (iniciar, bloquear, retomar, terminar) redirigen a `/activos` en V1.
La persistencia de sesion quedara habilitada cuando exista tabla `work_sessions`.
Cada boton muestra etiqueta "V1 — acciones disponibles en modulo Activos".

---

## Riesgos y Huecos Restantes

| Riesgo | Nivel | Proximo corte |
|--------|-------|---------------|
| Sin persistencia de sesiones | Medio | Requiere SPEC para tabla `work_sessions` |
| Blocked no persiste en DB | Bajo | V1 documentado — no rompe flujo |
| Propuestas manuales | Bajo | V1 documentado — tabla `asset_proposals` pendiente |
| `completedCount` sin filtro de fecha | Bajo | V1 documentado |
| Cliente/proyecto "desconocido" si assets sin proyecto activo | Bajo | Depende de datos limpios en DB |

---

## Estado PROYECTO.md

- SPEC-40: Implementado (capa de datos y logica de estados)
- SPEC-41: Implementado (UI workspace completo 7 secciones)
- Proximo paso natural: SPEC-42 (cliente ligero guiado) o SPEC para `work_sessions`
