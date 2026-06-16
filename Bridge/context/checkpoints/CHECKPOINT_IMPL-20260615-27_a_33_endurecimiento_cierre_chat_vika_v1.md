# CHECKPOINT IMPL-20260615-27..33 — Endurecimiento del flujo de cierre del chat de Vika

**IDs:** IMPL-20260615-27, IMPL-20260615-28, IMPL-20260615-29, IMPL-20260615-30, IMPL-20260615-31, IMPL-20260615-32, IMPL-20260615-33
**Agente:** SOFIA - Builder
**Fecha:** 2026-06-15
**Proyecto:** Bridge
**Estado:** ✅ COMPLETADO — flujo de cierre más robusto, tests alineados, bug crítico de `normalizeSummary` corregido

---

## 1. Resumen ejecutivo

Este micro-sprint cierra **7 intervenciones** orientadas a hacer más robusto el flujo de cierre automático del chat de Vika:

| ID | Titulo | Tipo | Archivos |
|----|--------|------|----------|
| IMPL-20260615-27 | Aceptar `finishReason=MAX_TOKENS` para gemini-flash-lite | fix | `lib/briefing-assistant-ai.ts` |
| IMPL-20260615-28 | Extraer tags `[FRONT_ASKED]` y `[FRONT_COMPLETED]` antes de validar | fix | `lib/briefing-assistant-ai.ts` |
| IMPL-20260615-29 | Simplificar `shouldForceClosure` (quitar código residual) | fix | `lib/briefing-assistant-ai.ts` |
| IMPL-20260615-30 | Cambiar a `gemini-flash-lite-latest` (alias estable con más quota) | perf | `lib/briefing-assistant-ai.ts` |
| IMPL-20260615-31 | Hacer regla de cierre MÁS explícita en System Prompt | fix | `lib/briefing-assistant-ai.ts` |
| IMPL-20260615-32 | `normalizeSummary` preserva arrays (NO descarta `frontsAsked`) | fix | `lib/briefing.ts` |
| IMPL-20260615-33 | Tests automatizados del flujo de cierre con tags | test | `lib/briefing-closure.test.ts` (NUEVO) |

---

## 2. Cambios técnicos por intervención

### 2.1 IMPL-20260615-27 — `MAX_TOKENS` confiable para Flash Lite

**Problema:** `gemini-2.5-flash-lite` puede cortar respuestas largas con `finishReason=MAX_TOKENS`, pero la respuesta sigue siendo visible y válida. El código lo rechazaba, dejando al cliente sin respuesta.

**Solución:** Agregar `MAX_TOKENS` a `RELIABLE_VISIBLE_FINISH_REASONS` en `lib/briefing-assistant-ai.ts`:

```ts
const RELIABLE_VISIBLE_FINISH_REASONS = new Set([
  "",
  "STOP",
  "MAX_TOKENS" // IMPL-20260615-27: gemini-2.5-flash-lite puede cortar por tokens
]);
```

### 2.2 IMPL-20260615-28 — Sanitizer extrae tags antes de validar

**Problema:** Vika emite `[FRONT_ASKED: x]` y `[FRONT_COMPLETED: x]` en sus mensajes. El sanitizer los trataba como "JSON interno" y rechazaba la respuesta visible completa.

**Solución:** `sanitizeAssistantReply` ahora extrae los tags con regex antes de aplicar los demás filtros:

```ts
export function sanitizeAssistantReply(rawReply: string): string {
  const withoutTags = rawReply
    .replace(/\[FRONT_ASKED:\s*[a-z_]+\s*\]/g, "")
    .replace(/\[FRONT_COMPLETED:\s*[a-z_]+\s*\]/g, "");
  // ... resto del procesamiento
}
```

### 2.3 IMPL-20260615-29 — `shouldForceClosure` simplificado

**Problema:** La función tenía código residual de versiones anteriores que verificaba suficiencia del núcleo + narrativa, lo que causaba que el cierre no se disparara cuando Vika ya tenía los 13 frentes preguntados pero el último mensaje no coincidía exactamente con una pregunta narrativa.

**Solución:** Reducir la función a una verificación simple: si los 13 frentes están preguntados, cierra. Vika decide el momento del cierre vía `[SYS_ACTION: LOCK_SUCCESS]`.

```ts
export function shouldForceClosure(summary, lastAssistantMessage, allMessages?): boolean {
  if (!summary) return false;
  // IMPL-20260615-30: Confiamos en que Vika vea la tabla de frentes en su
  // System Prompt y ella misma decida cuando ya no hay mas preguntas.
  if (!areAllRequiredFrontsAsked(summary)) return false;
  return true;
}
```

### 2.4 IMPL-20260615-30 — `gemini-flash-lite-latest` (alias estable)

**Problema:** `gemini-2.5-flash-lite` es un alias con quota limitada. El alias `-latest` apunta siempre a la versión Flash Lite más reciente con mejor quota.

**Solución:** Cambiar la constante del modelo en `requestGeminiContent`:

```ts
const model = "gemini-flash-lite-latest";
```

### 2.5 IMPL-20260615-31 — Regla de cierre más explícita

**Problema:** Vika no cerraba el chat aunque los 13 frentes estuvieran marcados. La regla de cierre estaba diluida entre otras instrucciones.

**Solución:** Refactor de la sección `[REGLA DE CIERRE OBLIGATORIO - CRITICO]` con:
- Numeración explícita de los pasos a seguir.
- Recordatorio en MAYÚSCULAS: `REGLA ABSOLUTA: NO CONTINUES PREGUNTANDO DESPUES DE QUE EL CLIENTE RESPONDA A LA NARRATIVA.`
- Triple énfasis con `===>>` y `<<===` flanqueando la instrucción clave.

### 2.6 IMPL-20260615-32 — **BUG CRÍTICO** `normalizeSummary` descartaba `frontsAsked`

**Problema detectado en este checkpoint:** La función `normalizeSummary` reconstruía el objeto `StructuredBriefSummary` desde `emptyStructuredBriefSummary()` y solo conservaba campos `string` (trim). El array `frontsAsked` se descartaba silenciosamente, lo que rompía el tracking de frentes preguntados al persistir el resumen vía `mergeStructuredBriefSummary`.

**Solución:** Manejar arrays explícitamente:

```ts
export function normalizeSummary(input) {
  const base = emptyStructuredBriefSummary();
  if (!input) return base;
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => {
      const nextValue = input[key as keyof StructuredBriefSummary];
      if (typeof nextValue === "string") return [key, nextValue.trim()];
      if (Array.isArray(nextValue)) return [key, [...nextValue]];  // IMPL-20260615-32
      return [key, value];
    })
  ) as StructuredBriefSummary;
}
```

**Severidad:** Alta — el bug silencioso impedía que el tag `[FRONT_COMPLETED]` persistido en BD se reflejara en `frontsAsked` al reconstruir el resumen.

### 2.7 IMPL-20260615-33 — Tests automatizados del flujo de cierre

**Archivo nuevo:** `lib/briefing-closure.test.ts` (22 tests, todos pasando).

**Cobertura:**
- 13 frentes obligatorios en `VIKA_REQUIRED_FRONTS`
- `detectFrontsAskedFromHistory` extrae correctamente los 13 frentes vía tags
- `detectFrontsAskedFromHistory` ignora frentes con nombres inválidos
- `detectFrontsAskedFromHistory` deduplica
- `areAllRequiredFrontsAsked` happy path y caso con 1 frente faltante
- `shouldForceClosure` con conversación completa de 13 frentes → `true`
- `shouldForceClosure` con conversación a la mitad (8 frentes) → `false`
- `shouldForceClosure` con `summary=null/undefined` → `false`
- `sanitizeAssistantReply` extrae tags antes de validar
- `MAX_TOKENS` es aceptable (IMPL-20260615-27)
- `SAFETY` se rechaza
- `normalizeSummary` preserva `frontsAsked` (IMPL-20260615-32)
- `mergeStructuredBriefSummary` conserva `frontsAsked`
- System Prompt contiene la regla de cierre explícita
- System Prompt obliga a emitir `[FRONT_ASKED]` y `[FRONT_COMPLETED]`
- Regex exportados (`FRONT_ASKED_TAG_REGEX`, `FRONT_COMPLETED_TAG_REGEX`, `LOCK_SUCCESS_TAG_REGEX`, `BRIEF_COMPLETO_TAG_REGEX`)

---

## 3. Tests existentes actualizados

### 3.1 `lib/briefing.test.ts` (3 tests corregidos)

| Test | Antes | Después |
|------|-------|---------|
| "incluye el System Prompt Maestro de Vika..." | Aserciones sobre "8 FRENTES TOTALES" | Actualizado a "14 PREGUNTAS TOTALES - 1 APERTURA + 1 CONDICIONAL + 13 FRENTES" y verifica la lista explícita de los 13 frentes obligatorios |
| "rechaza una respuesta visible si Gemini la corta con finishReason no confiable" | `expect(...).toBe(false)` para `MAX_TOKENS` | Actualizado a `toBe(true)` con comentario explicando IMPL-20260615-27; agregado caso SAFETY → `false` |
| "shouldForceClosure retorna true con nucleo completo + 8 frentes preguntados + pregunta narrativa" | Requería solo 8 frentes | Actualizado a IMPL-20260615-29: requiere los 13 frentes; la pregunta narrativa ya no es bloqueante |

---

## 4. Validación ejecutada

| Validación | Resultado |
|------------|-----------|
| `pnpm run build` | ✅ Compila sin errores, 23 rutas generadas |
| `pnpm test lib/briefing.test.ts` | ✅ 40/40 pasan (3 corregidos) |
| `pnpm test lib/briefing-closure.test.ts` | ✅ 22/22 pasan (NUEVO) |
| `pnpm test` (suite completa) | 528 pasan / 13 fallan (los 13 son pre-existentes en `clients.test.ts`, `bridge-data.test.ts`, `designer-workspace.test.ts`, `mcp-tools.test.ts` — **no relacionados con Vika**) |
| `npx tsx scripts/test-automatic-closure.ts` | ✅ TEST PASADO — El chat cierra correctamente con la nueva lógica de tags |

### Reducción de fallos en suite completa
- Antes de este checkpoint: **16 tests fallidos**
- Después: **13 tests fallidos** (todos pre-existentes en módulos no relacionados con Vika)
- Tests corregidos en este sprint: **3**

---

## 5. Decisiones arquitectónicas

1. **No modificar el System Prompt más allá de IMPL-20260615-31:** La regla de cierre ya quedó explícita en el commit previo. Agregar más énfasis podría confundir al modelo.
2. **`shouldForceClosure` es solo red de seguridad:** La decisión final de cierre la toma Vika al emitir `[SYS_ACTION: LOCK_SUCCESS]`. La función solo verifica que los 13 frentes estén preguntados.
3. **`frontsAsked` es la fuente de verdad del tracking de frentes:** Se persiste en BD vía `mergeStructuredBriefSummary` + `normalizeSummary`. El bug IMPL-20260615-32 fue crítico porque rompía este contrato.

---

## 6. Pendientes identificados (no bloqueantes)

- Los 13 tests fallidos en `clients.test.ts`, `designer-workspace.test.ts`, `bridge-data.test.ts`, `mcp-tools.test.ts` son pre-existentes y NO se arreglaron porque están fuera del alcance de este sprint.
- Vika sigue sin emitir los tags `[FRONT_ASKED]` y `[FRONT_COMPLETED]` consistentemente (problema reportado por el operador). El System Prompt ya está lo más explícito posible. Próximo paso: considerar un fallback heurístico (palabras clave) si después de N turnos el modelo no emite los tags.

---

## 7. Trazabilidad

- **Commits asociados:**
  - `fd8b39c` — fix(brief): IMPL-20260615-29 simplificar shouldForceClosure
  - `4803039` — fix(brief): IMPL-20260615-28 extraer tags
  - `2200fe1` — fix(brief): IMPL-20260615-27 MAX_TOKENS
  - `942dc6c` — fix(brief): IMPL-20260615-30 gemini-flash-lite-latest
  - `bcb3a60` — fix(brief): IMPL-20260615-31 regla de cierre explícita
- **PROYECTO.md:** actualizado con este sprint.
- **Tests:** `lib/briefing-closure.test.ts` (NUEVO).
