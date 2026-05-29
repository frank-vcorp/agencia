# DICTAMEN FIX-20260529-03 — Deby

**ID:** FIX-20260529-03
**Fecha:** 2026-05-29
**Emisor:** DEBY - Debugger
**Destinatario:** INTEGRA - Arquitecto / SOFIA - Builder
**Proyecto:** Bridge
**Respaldo handoff:** context/interconsultas/HANDOFF_FIX-20260529-03_deby_loop_main_offer_en_produccion.md

---

## 1. Síntoma reproducido

En el brief cliente por proyecto (`/cliente/proyecto/cf576043-...`, "Lanzamiento Rodamax"),
Vika repite indefinidamente la pregunta del campo `mainOffer`
("¿Cuál es el servicio o producto principal que quieres mover primero?") y su aclaración
("Me refiero a lo que quieres vender o impulsar primero..."), alternándolas turno a turno,
aun cuando el cliente declara con claridad el servicio (p. ej. "cambio de aceite y
mantenimiento preventivo"). La conversación nunca avanza de etapa discovery.

## 2. Causa raíz confirmada

Bucle estructural por combinación de tres factores:

1. `STAGE_FIELD_PRIORITY.discovery` arranca con `mainOffer`, y
   `getCurrentVisibleStageQuestion()` devuelve la pregunta del PRIMER campo con
   `summary[field].trim()` vacío. Si `mainOffer` nunca se llena, siempre devuelve `mainOffer`.
2. `inferBriefSummaryPatchFromClientMessage()` solo mapeaba `mainOffer` con regex muy
   estrechas (`ofrezco|ofrecemos|vendo|vendemos|brindo|brindamos` o
   `mi/nuestro <producto|servicio|...>`). Respuestas naturales como "queremos mover el
   servicio de..." NO matchean → `mainOffer` queda vacío permanentemente. Peor: la frase
   se va a `projectObjective` (regex `quiero|queremos ...`), reforzando que `mainOffer`
   nunca se cubra.
3. En producción la capa visible cae al fallback determinista
   (`buildBriefChatFallbackReply`), no a Gemini — confirmado porque los textos del loop
   son LITERALMENTE `VISIBLE_QUESTION_BY_FIELD.mainOffer.question` y `.clarification`,
   alternados por `isClarificationRequestForCurrentQuestion`. Sin la IA reformulando, el
   fallback repite la misma pregunta del campo nunca cubierto → loop infinito.

## 3. Archivos / funciones implicadas

- `Bridge/lib/briefing.ts` → `inferBriefSummaryPatchFromClientMessage` (origen del bucle),
  `getCurrentVisibleStageQuestion`, `STAGE_FIELD_PRIORITY`, `hasMeaningfulSummaryValue`.
- `Bridge/lib/briefing-assistant-ai.ts` → `buildBriefChatFallbackReply` (capa que repite).
- `Bridge/app/cliente/brief/[projectId]/actions.ts` → `sendClientMessageAction` (orquestador del turno).

## 4. Corrección aplicada (mínima y determinista)

En `inferBriefSummaryPatchFromClientMessage` (briefing.ts), tras la inferencia heurística:
si la pregunta visible pendiente (`getCurrentVisibleStageQuestion(stage, currentSummary)`)
corresponde a un campo NARRATIVO sin cubrir y el mensaje del cliente tiene contenido
suficiente (`hasMeaningfulSummaryValue`), se captura la respuesta literal en ese campo.

- Nuevo `NARRATIVE_ANSWER_FIELDS` = { mainOffer, projectObjective, requestReason,
  businessContext, audience, commercialFitReason }. Se excluyen campos keyword
  (platform, deliverable, cta, recommendedProductSlotKey, tone, urgency) para no
  contaminarlos con prosa larga.
- Garantía: el campo visible pendiente SIEMPRE progresa cuando el cliente responde con
  sustancia → el bucle no puede persistir por construcción.

Test añadido en `briefing.test.ts` que prueba que una respuesta natural llena `mainOffer`
y `getCurrentVisibleStageQuestion` deja de devolver `mainOffer`.

## 5. Hallazgo colateral corregido

El commit anterior `d258515` (ARCH-20260529-08) dejó la suite del brief en ROJO: 5 tests
de `briefing.test.ts` comparaban substrings SIN acentos contra la copy real (con acentos)
y una frase de guía obsoleta ("ruta comercial clara"). Se alinearon las aserciones a la
copy vigente (fuente de verdad) y se refinó el test de inferencia. Suite del brief: 28/28 verde.

## 6. Validación ejecutada

- `npx vitest run lib/briefing.test.ts` → 28/28 PASS.
- `npm run build` → compila OK (Soft Gate 1 ✓).
- Cambios acotados a 2 archivos (briefing.ts, briefing.test.ts), sin tocar esquema ni migraciones.

## 7. Riesgo residual

1. **La capa visible usa fallback en producción, no Gemini.** Probable `GEMINI_API_KEY`
   ausente/incorrecta en Vercel, o respuestas rechazadas por `isAcceptableAssistantVisibleReply`.
   FUERA del alcance de código de este fix (es config/infra). Recomendado: GEMINI/INFRA
   verificar `GEMINI_API_KEY` en Production y Preview. El fix garantiza avance incluso con
   fallback, pero el tono natural depende de la IA real.
2. La captura literal puede asignar prosa larga a un campo narrativo (p. ej. `mainOffer`
   recibe una frase de objetivo). Es información real del cliente y queda para revisión del
   operador; preferible a un loop infinito.
3. Hay 3 tests ROJOS PRE-EXISTENTES ajenos a este fix, en módulos no relacionados:
   `lib/bridge-data.test.ts` (conteo de módulos P0 del shell) y `lib/designer-workspace.test.ts`
   (scoring de tareas). NO se tocaron — requieren su propio dictamen/owner.

## 8. Siguiente acción

- SOFIA/INTEGRA: revisar diff, commit+push (mensaje en español con ID FIX-20260529-03),
  esperar deploy y re-probar el brief de Rodamax (resetear brief y verificar que avanza
  más allá de `mainOffer`).
- GEMINI/INFRA: validar `GEMINI_API_KEY` en Vercel para restaurar la capa conversacional IA.
- Backlog: abrir tickets para los 3 tests rojos pre-existentes (bridge-data, designer-workspace).
