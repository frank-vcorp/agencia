# CHECKPOINT IMPL-20260611-02 — Regla condicional de local en el System Prompt de Vika

- **ID:** IMPL-20260611-02
- **SPEC (referencia):** [SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md](../SPECs/SPEC_ARCH-20260611-01_alineacion_chat_vika_a_especificacion_tecnica_v1.md) — sección 3, System Prompt Maestro.
- **Agente:** SOFIA (Constructora Principal)
- **Fecha:** 2026-06-11
- **Tipo:** `feat(brief)` — extensión del System Prompt de Vika

## Objetivo

Incorporar al `VIKA_MASTER_PROMPT` el bloque `[CONDICIONAL DE LOCAL]` que indica a Vika qué pregunta de seguimiento disparar según el tipo de operación del cliente (local físico vs. digital/domicilio), evitando repreguntas duplicadas.

## Archivos modificados (regla de la tarea: SOLO 1 archivo)

### 1. `Bridge/lib/briefing-assistant-ai.ts`

- **Header de intervención**: Agregada línea `IMPL-20260611-02` en el bloque de comentarios superior, preservando el rastro histórico (IMPL-20260611-01, etc.).
- **`VIKA_MASTER_PROMPT`**: Inyectado el bloque `[CONDICIONAL DE LOCAL]` entre `[LÓGICA DE CONTROL Y FILTRO DE CALIDAD]` y `[CHECKLIST DE EXTRACCIÓN (8 PUNTOS OBLIGATORIOS)]`. La posición se eligió porque la decisión es lógica de control (qué preguntar según contexto) y debe leerse antes del checklist.

Bloque añadido (verbatim, con escapes `\u00xx` para conservar el estilo del archivo):

```
[CONDICIONAL DE LOCAL]
- Si el cliente indica que tiene local f\u00edsico, taller o negocio presencial: preguntar "\u00bfD\u00f3nde queda tu negocio? \u00bfEn qu\u00e9 colonia o calle?"
- Si el cliente indica domicilio, online, digital o trabajo a domicilio: preguntar "\u00bfD\u00f3nde publicas actualmente? \u00bfEn Instagram, Facebook, WhatsApp, TikTok?"
- Si ya mencion\u00f3 una plataforma o ubicaci\u00f3n, no volver a preguntar.
```

- **No se modificó** ninguna firma de función, tipo exportado, helper ni prompt de cierre (`buildBriefClosurePrompt`). El cambio es puramente declarativo dentro de la constante.

## Decisiones técnicas

1. **Posición del bloque**: Inmediatamente después de `[LÓGICA DE CONTROL Y FILTRO DE CALIDAD]` y antes de `[CHECKLIST DE EXTRACCIÓN]`. Razón: la regla condicional es lógica de control (cuándo y cómo preguntar) — pertenece al bloque de control, no al checklist de los 8 puntos.
2. **Escapes Unicode**: El archivo usa `\u00xx` para todos los caracteres no-ASCII del prompt (convención del módulo, ver `VIKA_MASTER_PROMPT` original). Se respetó la convención para no introducir inconsistencia.
3. **Alcance mínimo**: Cero cambios en runtime (no se tocó `buildBriefChatSystemPrompt`, `buildBriefClosurePrompt`, sanitización, fallback ni helpers). El bloque se inyecta automáticamente porque vive dentro de `VIKA_MASTER_PROMPT`, que ambas funciones de construcción de prompt ya consumen.
4. **Consistencia con SPEC**: La SPEC ya documenta este bloque en su sección 3 (System Prompt Maestro). Este cambio **alinea la implementación al contrato documentado** — el código estaba rezagado respecto a la SPEC.

## Diff (resumen)

```diff
@@ briefing-assistant-ai.ts — header
+ * IMPL-20260611-02
+ * Respaldo: solicitud de negocio (regla condicional de local en el System Prompt de Vika)
  * IMPL-20260611-01

@@ VIKA_MASTER_PROMPT
 - CALIDAD DE DATOS: ... receta secreta? No avances al siguiente punto si la respuesta no tiene valor comercial.

+[CONDICIONAL DE LOCAL]
+- Si el cliente indica que tiene local f\u00edsico, taller o negocio presencial: preguntar "\u00bfD\u00f3nde queda tu negocio? \u00bfEn qu\u00e9 colonia o calle?"
+- Si el cliente indica domicilio, online, digital o trabajo a domicilio: preguntar "\u00bfD\u00f3nde publicas actualmente? \u00bfEn Instagram, Facebook, WhatsApp, TikTok?"
+- Si ya mencion\u00f3 una plataforma o ubicaci\u00f3n, no volver a preguntar.
+
 [CHECKLIST DE EXTRACCI\u00d3N (8 PUNTOS OBLIGATORIOS)]
```

## Validación (4 Gates)

| Gate | Check | Estado | Notas |
|------|-------|--------|-------|
| 1 — Compilación | `npm run build` | ✅ | "✓ Compiled successfully". 0 errores introducidos por este cambio. |
| 1 — Compilación | Type-check implícito del build | ✅ | Sin nuevos errores TS. |
| 2 — Testing | `npx vitest run lib/briefing-assistant-ai` | ⚠️ filtro no matchea | No existe `lib/briefing-assistant-ai.test.ts` en el repo. Los tests de este módulo viven en `lib/briefing.test.ts` (verificado con `grep`). |
| 2 — Testing | `npx vitest run lib/briefing.test.ts` (test suite real del módulo) | ✅ 27/27 | Ningún test se rompió. |
| 3 — Revisión | Diff manual contra SPEC | ✅ | Bloque añadido es **idéntico** al documentado en la SPEC sección 3. Cero desviación. |
| 3 — Revisión | Diff manual contra request de la tarea | ✅ | Texto, posición y formato coinciden con la especificación del bloque en la tarea. |
| 3 — Revisión | `qodo self-review` | ❌ no disponible | **Qodo Command (CLI) aparece como sunset** en este entorno. Ver nota abajo. |
| 4 — Documentación | Checkpoint enriquecido | ✅ | Este documento. |
| 4 — Documentación | Header `IMPL-20260611-02` añadido al archivo | ✅ | Trazabilidad preservada. |
| Regla de la tarea | "SOLO modificar briefing-assistant-ai.ts" | ✅ | Único archivo modificado. Cero cambios colaterales. |
| Regla de la tarea | "No tocar otros archivos" | ✅ | El SPEC modificado que aparece en `git status` ya existía antes de esta tarea (verificado con `git diff` previo). No fue tocado. |

## Nota sobre `qodo self-review`

El binario `qodo` está instalado (versión CLI de Qodo Command) pero al ejecutar `qodo self-review --ci` con el modelo `gpt-5.1` (único disponible en el servidor), el agente responde:

> Qodo Command has been sunset and is no longer available. You can still get automated code reviews by connecting your Git provider at https://app.qodo.ai.

**Mitigación aplicada (Gate 3 manual)**:
- Diff revisado contra el bloque exacto solicitado en la tarea: **coincidencia byte a byte** en el texto (modulo escapes Unicode del estilo del archivo).
- Diff revisado contra la SPEC sección 3: **coincidencia exacta** del bloque.
- No se introdujeron nuevas funciones, tipos, exports, imports, ni dependencias.
- No se tocó lógica de control de flujo, sanitización, fallback, ni prompt de cierre.
- `git diff` final muestra exactamente 2 hunks pequeños, ambos aditivos, en un único archivo.

## Estado

- **Tarea**: ✅ Implementada.
- **Tests**: ✅ 27/27 pasan.
- **Build**: ✅ Compila.
- **Revisión**: ✅ Gate 3 manual ejecutado (qodo CLI sunset).
- **Documentación**: ✅ Checkpoint generado.
- **PR**: ⏳ Pendiente — requiere `qodo self-review` o visto bueno humano antes de abrir PR (no se solicitó explícitamente en este turno).
- **Commit**: ⏳ No se ejecutó (no fue solicitado explícitamente en este turno).

## Próximos pasos sugeridos (no ejecutados automáticamente)

1. Si se desea confirmar con Qodo en la nube, conectar el repo en https://app.qodo.ai para activar el self-review en cada PR.
2. Ejecutar `git add Bridge/lib/briefing-assistant-ai.ts && git commit -m "feat(brief): agregar bloque [CONDICIONAL DE LOCAL] al System Prompt de Vika" \\\\ "# IMPL-20260611-02"` cuando se apruebe.
3. Considerar añadir un test específico en `lib/briefing.test.ts` que verifique que el string `[CONDICIONAL DE LOCAL]` aparece en el output de `buildBriefChatSystemPrompt` (mejora cobertura, no requerido por la tarea).
