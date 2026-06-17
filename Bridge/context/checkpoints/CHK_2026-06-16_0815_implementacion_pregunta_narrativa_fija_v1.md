# CHK_2026-06-16_0815_implementacion_pregunta_narrativa_fija_v1

**ID:** IMPL-20260615-40
**Fecha:** 2026-06-16 08:15 CST
**Agente:** SOFIA (Constructora Principal)
**Estado:** En progreso

---

## Objetivo

Persistir la pregunta narrativa fija ("¿Qué ha sido lo más difícil?") como el **último frente obligatorio** antes del cierre. Esto evita que Vika se confunda o se salte la narrativa por variabilidad del modelo.

## Cambios planificados

### 1. `Bridge/lib/briefing.ts`

- Agregar 2 campos a `StructuredBriefSummary`:
  - `narrativeQuestionAsked: string | null`
  - `narrativeAnswer: string | null`
- Crear constante exportada: `VIKA_NARRATIVE_QUESTION = "¿Qué ha sido lo más difícil?"` (sin variaciones)
- Inicializar ambos campos en `null` en `emptyStructuredBriefSummary()`
- Asegurar que `normalizeSummary()` los preserva (revisar el fix IMPL-20260615-32 para arrays)

### 2. `Bridge/lib/briefing-assistant-ai.ts`

- Reemplazar `VIKA_NARRATIVE_QUESTIONS` (array de 2) por `VIKA_NARRATIVE_QUESTION` (constante única)
- Modificar `shouldForceClosure()`:
  - Verificar que `summary.narrativeAnswer` tenga valor no vacío
  - Si es null o vacío → retornar false
- Modificar el System Prompt de Vika:
  - Eliminar la segunda pregunta ("¿Cómo te animaste?")
  - Hacer MUY explícito que DESPUÉS de los 13 frentes, DEBE hacer la pregunta narrativa fija
  - Y DESPUÉS de que el cliente responda, en el SIGUIENTE turno DEBE cerrar
  - Eliminar la instrucción de tags [FRONT_ASKED]/[FRONT_COMPLETED]

### 3. `Bridge/app/cliente/brief/[projectId]/actions.ts`

- Detectar cuando Vika hizo la pregunta narrativa (en el último mensaje del asistente)
- Detectar cuando el cliente respondió a la narrativa (es el primer mensaje del cliente después)
- Persistir `narrativeQuestionAsked` y `narrativeAnswer` en el resumen

### 4. Tests

- `briefing.test.ts`: tests de `narrativeAnswer` preservación en `normalizeSummary()`
- `briefing-closure.test.ts`: tests de `shouldForceClosure` con/sin `narrativeAnswer`

## Validación

- `pnpm run build` pasa
- `pnpm test lib/briefing.test.ts` pasa
- `pnpm test lib/briefing-closure.test.ts` pasa
- Commit + push a origin/main

## Reglas (NO cambiar)

- NO cambiar el modelo Gemini (sigue en `gemini-2.5-flash-lite`)
- NO cambiar la lógica de detección de frentes (`detectFrontsAskedFromHistory`)
- NO cambiar la lógica de `MAX_TOKENS`
- La pregunta narrativa DEBE ser EXACTAMENTE: `¿Qué ha sido lo más difícil?`
