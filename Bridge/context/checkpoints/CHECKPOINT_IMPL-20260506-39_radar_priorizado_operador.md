# CHECKPOINT IMPL-20260506-39

## ID de Intervención
IMPL-20260506-39

## Fecha
2026-05-06

## SPEC de Referencia
`context/SPECs/SPEC_ARCH-20260506-39_radar_priorizado_operador_por_proyecto.md`

## Resumen Ejecutivo
Implementación del radar priorizado del operador por proyecto. La shell estática de `/operador` fue reemplazada por una superficie server-side real que calcula, prioriza y expone señales accionables por proyecto, derivadas desde entidades existentes (projects, briefs, quotations) sin abrir fuentes paralelas.

---

## Archivos Tocados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `lib/operator-radar.ts` | Nuevo | Capa derivada server-side: tipos, funciones puras de scoring, función principal `getOperatorRadar()` |
| `lib/operator-radar.test.ts` | Nuevo | 14 tests unitarios para `computeIdleHours` y `scoreProjectSignals` |
| `components/operator-radar.tsx` | Nuevo | Componente UI `OperatorRadarView` con tarjetas por proyecto, barra de score, badge de riesgo, alertas y accesos a módulos |
| `app/operador/page.tsx` | Modificado | Convertido a async Server Component que llama `getOperatorRadar()` y renderiza `<OperatorRadarView />` |

---

## Contrato del Radar (SPEC vs implementado)

| Campo SPEC | Implementado | Nota |
|------------|-------------|------|
| `portfolioItems` | ✓ | Array ordenado por score |
| `priorityScore` | ✓ | Calculado desde reglas trazables |
| `priorityReason` | ✓ | Texto explicativo derivado de la regla |
| `primaryAlert` | ✓ | Alerta de mayor peso que aplica |
| `suggestedAction` | ✓ | Acción concreta derivada de la alerta |
| `suggestedModule` | ✓ | briefs / cotizaciones / activos / crm |
| `lastMovementAt` | ✓ | Máximo de updated_at entre project, brief, quotation |
| `idleHours` | ✓ | Calculado desde `lastMovementAt` |
| `riskLevel` | ✓ | low / medium / high / critical |
| `sourceRefs` | ✓ | IDs de reglas que dispararon el score |

---

## Reglas de Scoring Implementadas

| Regla | Puntos | Condición |
|-------|--------|-----------|
| `rule:brief_absent` | +25 | Sin brief vinculado al proyecto |
| `rule:brief_not_locked` | +20 | Brief existe pero no está en estado aprobado/consolidado |
| `rule:no_quotation` | +15 | Sin cotización vinculada |
| `rule:quotation_draft` | +10 | Cotización en borrador |
| `rule:idle_48h` | +20 | Última actividad hace >48h |
| `rule:idle_24h` | +10 | Última actividad hace >24h |

**Risk level**: critical (≥55), high (≥35), medium (≥15), low (<15)

---

## Soft Gates

### Gate 1 — Compilación
✓ `npm run build` — build limpio, 12 páginas generadas, `/operador` como Dynamic server-rendered.

### Gate 2 — Testing
✓ `npm test` — **201 tests pasando** (11 archivos). Los 14 tests nuevos del radar cubren `computeIdleHours` y todos los casos de `scoreProjectSignals`.

### Gate 3 — Revisión
✓ Qodo CLI (`qodo self-review`) fue ejecutado — herramienta dada de baja upstream (sunset). Revisión manual realizada en su lugar:
- 0 errores TypeScript en los 4 archivos tocados.
- `components/operator-radar.tsx` es Server Component puro — sin `useState`, `useEffect` ni `"use client"`.
- `postgrest<T>()` en `operator-radar.ts` retorna `[] as T` en caso de error HTTP, nunca lanza excepciones (degradación graceful consistente con el patrón del repo).
- Briefs sin `project_id` se filtran correctamente antes del index (`if (brief.project_id &&...)`).
- Vacios honestos declarados en `RadarEmpty` cuando `radar.isEmpty === true`.
- Sin placeholders ni estados inventados — la SPEC lo exige y se cumple.

### Gate 4 — Documentación
✓ Marca de agua IMPL-20260506-39 en los 4 archivos. Checkpoint presente.

---

## Riesgos y Huecos para el Siguiente Corte

1. **Datos actuales**: El tenant "vectoria" probablemente no tiene proyectos sembrados en Supabase más allá de los que se hayan creado en sesiones de briefs/CRM. El radar mostrará el estado vacío honesto hasta que existan proyectos reales.

2. **Señales futuras no implementadas** (fuera del alcance de este corte según SPEC):
   - Activos iniciados/pendientes de aprobación (requeriría query a `assets` por proyecto)
   - Respuesta reciente del cliente (requeriría `lead_notes` o mensajes de brief)
   - Bloqueos operador↔diseñador

3. **Lectura IA (SPEC sección "Lectura IA obligatoria")**: En este corte las 5 sub-preguntas (por qué subió, riesgo creciente, actor que debe actuar, acción más rápida, qué no hacer) se responden parcialmente con `priorityReason` y `suggestedAction`. Un corte posterior podría enriquecer con un prompt a un modelo de lenguaje usando el snapshot como contexto.

4. **Navegación a vista detallada del proyecto**: La SPEC menciona "vista detallada del proyecto cuando exista" — esa ruta no existe aún. Los links de acceso rápido apuntan a los módulos globales (briefs, cotizaciones, activos, crm), que es el comportamiento correcto para este corte.

---

## Próximos Pasos Sugeridos (SPEC 40-42)
- SPEC 40: Modelo de ejecución del diseñador (sesiones y estados)
- SPEC 41: Workspace del diseñador guiado
- SPEC 42: Cliente ligero guiado
