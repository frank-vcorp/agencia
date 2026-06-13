# SPEC_ARCH-20260612-01 — Checklist 13 puntos obligatorios + Regla ejemplos dinámicos + Fase narrativa dual

**ID:** ARCH-20260612-01  
**Fecha:** 2026-06-12  
**Autor:** INTEGRA  
**Estado:** Implementado ✅  
**Commit:** 4033118  

---

## 1. Contexto y Problema

El chat de briefing (Vika) usaba un **checklist de 8 puntos obligatorios** que no cubría información crítica para la estrategia comercial:

| Faltante | Impacto |
|----------|---------|
| Perfil del dueño (hands-on, delegador, técnico, comercial) | No se adapta tono/estrategia al estilo del cliente |
| Historia del negocio (origen, motivación) | Pierde contexto emocional para storytelling |
| Administración del negocio (equipo, operación día a día) | No dimensiona capacidad de ejecución |
| Publicidad previa (qué intentó, resultados) | Repite errores, no aprende de historial |
| Planes a futuro (6-12 meses) | Estrategia cortoplacista, no alinea con visión |

Además, **no había regla de ejemplos** cuando el cliente no entendía la pregunta, generando bucles de repreguntas o datos de baja calidad.

La **fase narrativa** tenía solo 1 pregunta opcional, perdiendo profundidad emocional.

---

## 2. Solución: Checklist 13 puntos + Reglas UX mejoradas

### 2.1 Nuevo Checklist (13 puntos obligatorios)

| # | Campo Vika | Campo StructuredBriefSummary | Pregunta natural | Etapa |
|---|------------|------------------------------|------------------|-------|
| 1 | `giro_y_producto_heroe` | `giroYProductoHeroe` | ¿De qué es tu negocio y qué es lo que más se vende? | discovery |
| 2 | `persona_perfil` | `personaPerfil` | ¿Cómo te describirías tú como dueño del negocio? | discovery |
| 3 | `historia_negocio` | `historiaNegocio` | ¿Cómo te animaste a poner el negocio? | discovery |
| 4 | `administracion_negocio` | `administracionNegocio` | ¿Cómo administras el día a día? ¿Tienes equipo o estás solo? | discovery |
| 5 | `madurez` | `madurez` | ¿Cuánto tiempo llevas con el negocio abierto? | precision |
| 6 | `local_fisico` | `localFisico` | ¿Tienes un local donde la gente te visita o entregas a domicilio? | precision |
| 7 | `logo` | `logo` | ¿Tienes un logotipo o usas el nombre del negocio con letras bonitas? | precision |
| 8 | `diferenciador` | `audience` | ¿Por qué te compran a ti y no a la competencia? | precision |
| 9 | `objeciones` | `restrictions` | ¿Qué duda tiene el cliente antes de pagarte? | precision |
| 10 | `publicidad_previa` | `publicidadPrevia` | ¿Has intentado publicidad antes? ¿Qué hiciste y cómo te fue? | precision |
| 11 | `presupuesto` | `presupuesto` | ¿De cuánto dinero dispones al mes para invertir en este proyecto? | commercial_fit |
| 12 | `cta_deseado` | `cta` | ¿Qué acción quieres que haga la persona al ver esta pieza? | commercial_fit |
| 13 | `planes_futuro` | `planesFuturo` | ¿Qué planes tienes para el negocio en los próximos 6-12 meses? | commercial_fit |

### 2.2 Regla 5: EJEMPLOS SI NO ENTIENDE (NUEVA)

> **Si el cliente no entiende la pregunta o da una respuesta vaga/sin valor comercial, da 2 ejemplos simples y concretos adaptados a su contexto y repregunta UNA sola vez. Si sigue sin responder con sustancia, avanza al siguiente punto y marca este como "pendiente de profundizar".**

- Los ejemplos los genera **dinámicamente la IA** según contexto (no hardcoded)
- Máximo **1 reintento** por campo
- Evita bucles infinitos y mantiene flujo conversacional

### 2.3 Fase Narrativa Dual (OBLIGATORIA)

Al completar los 13 puntos, Vika hace **UNA** de estas 2 preguntas (escoge la más natural):

1. **"¿Cómo te animaste a poner el negocio?"** → captura `historia_negocio` (profundidad emocional)
2. **"¿Qué ha sido lo más difícil?"** → captura contexto de lucha/resiliencia

La segunda es **opcional** si el cliente ya dio contexto rico en la primera.

---

## 3. Cierre Determinístico (13 claves)

Cuando se detecta: **13 campos completos + pregunta narrativa respondida** → fuerza cierre **sin llamar a Gemini**:

```
¡Qué gran historia! Mi equipo ya tiene toda esta información. La analizaremos a detalle y te contactaremos por WhatsApp con los pasos a seguir. ¡Mucho éxito!
[SYS_ACTION: LOCK_SUCCESS]
[BRIEF_COMPLETO]
{JSON con 13 claves}
```

**JSON de cierre (13 claves):**
```json
{
  "giro_y_producto_heroe": "",
  "persona_perfil": "",
  "historia_negocio": "",
  "administracion_negocio": "",
  "madurez": "",
  "local_fisico": "",
  "logo": "",
  "diferenciador": "",
  "objeciones": "",
  "publicidad_previa": "",
  "presupuesto": "",
  "cta_deseado": "",
  "planes_futuro": "",
  "historia_y_contexto": ""
}
```

---

## 4. Cambios Técnicos

### 4.1 `lib/briefing.ts`
- `VikaBriefData`: 8 → 13 campos
- `VIKA_BRIEF_FIELDS`: 13 claves
- `VIKA_CHECKLIST_TO_SUMMARY_KEY`: mapeo 13→StructuredBriefSummary
- `StructuredBriefSummary`: +5 campos (`personaPerfil`, `historiaNegocio`, `administracionNegocio`, `publicidadPrevia`, `planesFuturo`)
- `FIELD_COMPLETION_RULES`: reglas longitud/palabras para 5 campos nuevos
- `VISIBLE_QUESTION_BY_FIELD`: preguntas + clarificaciones para 5 campos nuevos
- `STAGE_FIELD_PRIORITY`: discovery(7), precision(4 legacy), commercial_fit(4 legacy + 4 nuevos al final)
- `renderVikaProgressBlock`: muestra progreso 13/13
- `mapVikaBriefDataToStructuredSummary`: mapeo completo 13 campos
- `buildFinalSummaryText`: incluye 5 campos nuevos
- `cleanHeuristicValue`: restaurada (se perdió en refactor previo)

### 4.2 `lib/briefing-assistant-ai.ts`
- `VIKA_MASTER_PROMPT`: System Prompt Maestro actualizado
  - Checklist 13 puntos
  - Regla 5: EJEMPLOS SI NO ENTIENDE
  - Fase narrativa dual (2 preguntas)
  - Cierre: JSON 13 claves
- `VIKA_CHECKLIST_SUMMARY_KEYS`: 13 claves para `shouldForceClosure`
- `VIKA_NARRATIVE_QUESTIONS`: 2 preguntas narrativas
- `deterministicClosureJson`: emite JSON 13 claves
- `buildBriefClosurePrompt`: pide JSON 13 claves
- `shouldForceClosure`: valida 13 campos completos

### 4.3 `lib/briefing.test.ts`
- Tests actualizados para 13 campos
- Validaciones: mapeo, prompt, cierre determinístico 13 claves

### 4.4 `app/briefs/page.tsx`
- `VIKA_CHECKLIST_LABELS`: labels para 13 campos
- `VIKA_CHECKLIST_FIELDS`: 13 campos
- `buildSummaryPatchSeed`: incluye 5 campos nuevos

---

## 5. Sin Migración BD

Los 5 campos nuevos viajan en `structured_summary_json` (JSONB existente en `brief_versions`), igual que `madurez`, `logo`, `presupuesto`, `localFisico`, `giroYProductoHeroe`, `historiaYContexto` (IMPL-20260611-01).

---

## 6. Validación

| Check | Resultado |
|-------|-----------|
| `pnpm build` | ✅ Compila sin errores |
| `pnpm test` (briefing.test.ts) | ✅ 27/27 passing |
| Tests pre-existentes no relacionados | 3 fallos pre-existentes (bridge-data, designer-workspace, preregistro) |
| `GEMINI_API_KEY` en Vercel | ✅ Configurada |

---

## 7. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| IA genera ejemplos inconsistentes | Prompt exige "adaptados a su contexto"; test de cierre determinístico valida estructura |
| Cliente ignora pregunta narrativa | Segunda pregunta opcional; cierre forzado tras 1 respuesta |
| Campos nuevos vacíos en briefs legacy | `hasMeaningfulSummaryValue` retorna false → Vika los pregunta en siguiente sesión |
| Regresión en `STAGE_FIELD_PRIORITY` | Tests legacy actualizados; commercial_fit incluye 4 nuevos al final |

---

## 8. Rollback

Si hay regresión crítica:
```bash
git revert 4033118
```
No requiere migración BD (campos en JSONB).

---

## 9. Próximos Pasos (Post-SPEC)

- [ ] Monitorear calidad de respuestas en producción (métricas: % campos completados, % reintentos)
- [ ] Evaluar añadir indicador visual de progreso 13/13 en `client-brief-chat.tsx`
- [ ] Considerar test E2E de flujo completo briefing → cierre → operador