# SPEC_ARCH-20260615-01 — Cierre del brief por itinerario y suficiencia (no por los 13 campos completos)

**ID:** ARCH-20260615-01
**Fecha:** 2026-06-15
**Autor:** INTEGRA
**Estado:** Aprobado para implementación por SOFIA
**Implementación:** IMPL-20260615-01

---

## 1. Contexto y Problema

El corte `ARCH-20260612-01` dejó al chat de Vika con un **checklist rígido de 13 puntos obligatorios** (`VIKA_CHECKLIST_SUMMARY_KEYS`) cuya única forma de disparar el cierre deterministico era que **los 13 campos tuvieran un valor significativo** + el último mensaje del asistente fuera una de las 2 preguntas narrativas canonicas.

En la practica, esto produce fricción real:

| Problema | Impacto en produccion |
|---|---|
| Cliente responde con sustancia pero no completa los 13 campos | El chat nunca se cierra solo; el operador tiene que forzar `submitBriefAction` o esperar el botón "Cerrar y enviar mi brief" |
| Cliente no entiende una pregunta (ej. planes a futuro) y se queda en silencio | Bucle silencioso: Vika insiste, el cliente responde, no llena el campo → no cierra |
| `inferBriefSummaryPatchFromClientMessage` no cubre los 13 (cubre 5) | Los 8 restantes dependen de que el modelo los emita en el JSON del System Prompt; si la IA no los pone, `hasMeaningfulSummaryValue` retorna `false` y nunca se cumplen los 13 |
| El chat se siente como un interrogatorio, no como una conversación | Fricciona la adopcion real del piloto (vendedores reportan que el cliente "se aburre" o "se confunde") |

La filosofía correcta para un brief conversacional es:

> **El chat cierra cuando la conversación ha recorrido el itinerario comercial y la información capturada es suficiente para que el equipo arme una propuesta útil — no cuando un checkbox de 13 puntos esté al 100%.**

---

## 2. Solución: Núcleo de suficiencia (5-6 campos) + cierre por itinerario

### 2.1 Núcleo de suficiencia (`VIKA_CLOSURE_CORE_KEYS`)

En lugar de los 13 campos, definimos un **núcleo de 5 campos** que representan la **esencia comercial** del brief. Si el cliente ha dado información significativa en estos 5 frentes, **el equipo ya puede armar una propuesta coherente**:

| # | Campo | Resumen | Por qué es del núcleo |
|---|---|---|---|
| 1 | `giroYProductoHeroe` | Qué vende y qué sale más | Sin esto no sabemos qué estrategia plantear |
| 2 | `audience` | A quién le habla / por qué le compran a él | Define el tono, los canales y el mensaje |
| 3 | `presupuesto` | Cuánto puede invertir al mes | Determina el alcance realista de la propuesta |
| 4 | `cta` | Qué acción quiere que haga el cliente | Sin CTA no hay conversión |
| 5 | `historiaYContexto` o `historiaNegocio` | Profundidad emocional / origen | Da contexto narrativo y de tono |

El **itinerario** (recorrido de discovery → precision → commercial_fit) y la **suficiencia** (tener los 5 campos del núcleo con valor significativo) son las **dos condiciones** para el cierre deterministico. Ya no se requieren los 13.

### 2.2 Nueva función `getBriefItinerarySufficiency(summary)`

Función pura exportada de `briefing.ts` que recibe un `StructuredBriefSummary` y devuelve:

```ts
type BriefItinerarySufficiency = {
  sufficient: boolean;        // true si los 5 campos del nucleo tienen valor significativo
  missingCore: string[];      // campos del nucleo que faltan (en espanol natural para el cliente)
  completedCore: number;      // 0..5
  totalCore: number;          // 5
};
```

Reglas:
- Usa `hasMeaningfulSummaryValue` (mismas reglas de longitud/palabras que ya existe).
- `historiaYContexto` o `historiaNegocio` cuenta como cumplido si **cualquiera** de las dos tiene valor (redundancia intencional para no castigar al cliente que solo contesto una de las dos narrativas).

### 2.3 Modificación de `shouldForceClosure`

`shouldForceClosure` en `briefing-assistant-ai.ts` ahora usa `getBriefItinerarySufficiency` en lugar de `VIKA_CHECKLIST_SUMMARY_KEYS.every(...)`. La nueva condición:

```ts
1. sufficiency.sufficient === true  (los 5 campos del nucleo)
2. lastAssistantMessage contiene una de las preguntas narrativas canonicas
```

Si ambas se cumplen → cierre deterministico (sin llamar a Gemini) emitiendo el JSON con las **claves que tengan valor** + cadena vacia para las que no (en lugar de forzar 13).

### 2.4 Cierre con JSON parcial (no forzado a 13 claves)

`deterministicClosureJson` ahora emite **solo las claves con valor significativo** en el JSON. Si el cliente no lleno `presupuesto`, ese campo se omite del JSON (en lugar de incluirlo vacio). Esto:

- Reduce ruido en el payload persistido.
- Es honesto: refleja solo lo que se capturo.
- No rompe el contrato: el `mapVikaBriefDataToStructuredSummary` ya tolera campos faltantes.

### 2.5 System Prompt Maestro: de "13 puntos obligatorios" a "itinerario + suficiencia"

Se actualiza `VIKA_MASTER_PROMPT` para reflejar la nueva filosofía:

- **Antes:** "CHECKLIST DE EXTRACCIÓN (13 PUNTOS OBLIGATORIOS)"
- **Después:** "ITINERARIO DE LA CONVERSACIÓN (5 frentes de suficiencia)" con lista de los 5 campos del núcleo + nota: *"Vika debe recorrer el itinerario completo, no requiere los 13 campos para cerrar — basta con que el cliente haya dado información significativa en los 5 frentes del núcleo."*

La fase narrativa dual, las reglas de oro (sin jargon, una pregunta a la vez, ejemplos si no entiende) y el texto canonico de despedida **se conservan**.

### 2.6 Doble red de seguridad en `actions.ts`

Para evitar depender 100% del modelo, `sendClientMessageAction` ahora:

1. Aplica el patch heuristico del resumen (existente).
2. **Re-evalua** `isBriefSufficientForClosure(summary, lastAssistantMessage)`.
3. Si la suficiencia se cumplio **y** el último mensaje del asistente fue una pregunta narrativa → fuerza el cierre deterministico **aun si el modelo no emitió el tag**.

Esto elimina el caso donde el modelo "se queda callado" o emite texto que no incluye el tag a pesar de que la conversación ya esta completa.

### 2.7 Copy del cliente más natural

`client-brief-chat.tsx` reemplaza:

- "Tengo 8 preguntas para entender tu negocio. Empecemos!" → *"Platicame de tu negocio y al final te hare algunas preguntas clave para que el equipo arme tu propuesta."*
- Sección "Como trabajamos esta conversacion": *"Vika te hara 8 preguntas para entender tu negocio y tu presupuesto..."* → *"Vika te hara algunas preguntas sobre tu negocio, tus clientes y tu presupuesto. Cuando considere que ya tenemos lo necesario para armar una propuesta util, cerramos el brief y nuestro equipo te contacta por WhatsApp."*

Esto refuerza la idea de que el cierre es por suficiencia, no por conteo de preguntas.

---

## 3. Cambios Técnicos

### 3.1 `lib/briefing.ts` (NUEVO)

- `VIKA_CLOSURE_CORE_KEYS`: constante con los 5 campos del núcleo.
- `getBriefItinerarySufficiency(summary)`: función pura que evalua suficiencia.
- Exportadas para uso de tests y de `briefing-assistant-ai.ts`.

### 3.2 `lib/briefing-assistant-ai.ts` (MODIFICADO)

- `VIKA_MASTER_PROMPT`: bloque del checklist actualizado a "ITINERARIO + SUFICIENCIA" con los 5 campos del núcleo. Conserva la fase narrativa, reglas de oro y despedida.
- `VIKA_NARRATIVE_QUESTIONS`: sin cambios.
- `isBriefSufficientForClosure(summary, lastAssistantMessage)`: nueva función exportada (es la lógica de `shouldForceClosure` con suficiencia por núcleo).
- `shouldForceClosure`: ahora delega a `isBriefSufficientForClosure` + verifica pregunta narrativa.
- `deterministicClosureJson`: emite solo claves con valor significativo.

### 3.3 `app/cliente/brief/[projectId]/actions.ts` (MODIFICADO)

- `sendClientMessageAction`: despues de aplicar el patch, re-evalua `isBriefSufficientForClosure`. Si se cumple y el último mensaje del asistente tiene una pregunta narrativa, **fuerza el cierre deterministico sin depender del tag del modelo**.
- Conserva el flujo existente: si el modelo emite el tag, también cierra (via `LOCK_SUCCESS_TAG_REGEX`).

### 3.4 `components/client-brief-chat.tsx` (MODIFICADO)

- `VIKA_INTRO_TEXT` actualizado a copy más natural.
- Copy de la sección "Como trabajamos esta conversacion" actualizada.

### 3.5 `lib/briefing.test.ts` (NUEVOS TESTS)

- `getBriefItinerarySufficiency` retorna `sufficient: true` con 5 campos del núcleo llenos.
- `getBriefItinerarySufficiency` retorna `missing` correcto cuando faltan 1, 2 o 3 campos del núcleo.
- `getBriefItinerarySufficiency` acepta `historiaYContexto` **o** `historiaNegocio` como cumplido.
- `shouldForceClosure` retorna `true` con núcleo completo + pregunta narrativa (sin necesidad de los 13).
- `shouldForceClosure` retorna `false` si el núcleo no esta completo aunque el último mensaje sea narrativo.
- `deterministicClosureJson` omite claves sin valor significativo.
- El System Prompt Maestro contiene el nuevo bloque "ITINERARIO + SUFICIENCIA" y los 5 campos del núcleo; **no** exige los 13.

---

## 4. Sin Migración BD

Todos los cambios son en código. Los campos del núcleo ya existen en `structured_summary_json` (JSONB) desde implementaciones previas.

---

## 5. Validación

| Check | Criterio |
|---|---|
| `pnpm build` | Compila sin errores |
| `pnpm test` (briefing.test.ts) | Tests existentes + nuevos en verde |
| `shouldForceClosure` con 5/5 del núcleo + narrativa | `true` |
| `shouldForceClosure` con 4/5 del núcleo + narrativa | `false` |
| Cierre real (manual o mock) | Emite JSON solo con claves con valor |
| Copy cliente | Sin referencias a "8 preguntas" o "13 puntos" |

---

## 6. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| Brief cierra con datos insuficientes para el operador | El núcleo cubre los 5 frentes comerciales esenciales; el operador puede pedir "rework" via flujo existente (`returned_for_rework`) |
| Modelos viejos en cache / retries usan el prompt anterior | Se actualiza el System Prompt en runtime; `shouldForceClosure` es deterministico (no depende del modelo) |
| Brecha con briefs cerrados bajo regla de 13 puntos | El nuevo `deterministicClosureJson` es tolerante: si vienen 13 claves vacias las omite, si vienen 5 con valor las incluye; el contrato `mapVikaBriefDataToStructuredSummary` ya lo soporta |
| Tests legacy de 13 puntos en `briefing.test.ts` | Se conservan (siguen siendo validos para `VIKA_BRIEF_FIELDS`); se agregan tests nuevos para el núcleo |

---

## 7. Rollback

```bash
git revert <commit>
```

No requiere migración BD. El cambio es 100% en código y System Prompt.

---

## 8. Próximos Pasos (Post-SPEC)

- [ ] Monitorear en produccion: % de briefs que cierran por suficiencia vs por los 13 puntos historicos.
- [ ] Evaluar reducir el núcleo a 4 campos si las metricas muestran que audiencia o cta se cubren implicitamente.
- [ ] Considerar E2E test que recorra el flujo completo briefing → cierre por suficiencia → operador.
