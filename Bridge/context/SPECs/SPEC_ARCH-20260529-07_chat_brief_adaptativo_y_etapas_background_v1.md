# SPEC ARCH-20260529-07: Chat brief adaptativo y etapas en background — V1

**ID:** ARCH-20260529-07  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-29  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/interconsultas/HANDOFF_FIX-20260529-02_para_integra_saneamiento_chat_brief_cliente.md`

---

## 1. Objetivo unico y medible

Redefinir el brief cliente como una conversación adaptativa guiada por prompt, donde las etapas operen en background sin depender de botones manuales ni de mensajes visibles gobernados por heurísticas rígidas.

## 2. Problema exacto que resuelve

El runtime actual sigue mezclando conversación visible con extracción heurística, reglas fijas de faltantes, fallback determinista y avance manual de etapas. Eso produce una experiencia rígida, poco natural y frágil ante respuestas amplias o repreguntas de aclaración.

## 3. Contrato exacto del nuevo chat

### 3.1 Capa visible — solo conversación adaptativa

La capa visible debe comportarse así:

1. Vika conversa como estratega comercial real.
2. Cada respuesta visible debe sonar natural, contextual y orientada a profundizar lo necesario.
3. Nunca se muestran labels internas, nombres de campos, estados de etapa ni criterios técnicos.
4. Nunca se muestra una consigna rígida del tipo `necesito entender oferta principal`.
5. Si el cliente ya dio suficiente contexto, Vika profundiza con una pregunta útil o confirma brevemente antes de avanzar.
6. Si el cliente pide aclaración, Vika responde aclarando en lenguaje natural y sigue la conversación sin repetir reglas internas.

### 3.2 Capa invisible — extracción en background

La extracción estructurada debe pasar en background y no gobernar la forma visible del turno.

Reglas:

1. Cada turno puede actualizar internamente el summary estructurado.
2. Esa actualización no debe imponer por sí sola la frase visible del asistente.
3. Si la extracción falla o queda incompleta, la conversación visible debe seguir siendo natural.
4. El sistema puede usar el summary como contexto silencioso, no como plantilla rígida visible.

### 3.3 Capa de etapas — background total

Las etapas siguen existiendo, pero solo como estado interno.

Reglas:

1. No debe requerirse clic manual para cambiar de etapa una vez validado el flujo.
2. El runtime decide internamente cuándo discovery está suficientemente madura para pasar a precision.
3. El runtime decide internamente cuándo precision está suficientemente madura para pasar a commercial_fit.
4. El cambio de etapa no debe interrumpir la naturalidad de la conversación.
5. La UI no debe depender del usuario para empujar la etapa cuando el sistema ya detectó suficiencia.

---

## 4. Qué queda en background

Estas responsabilidades permanecen, pero invisibles para cliente:

1. Identificación de etapa actual.
2. Actualización de `StructuredBriefSummary`.
3. Evaluación de suficiencia por etapa.
4. Decisión de transición de etapa.
5. Generación de JSON final post-cierre.

Estas responsabilidades dejan de ser visibles o manuales:

1. labels de faltantes internos;
2. mensajes de fallback por campo;
3. dependencia del botón de cambio de etapa como mecanismo principal;
4. prompts visibles que suenan a formulario.

---

## 5. Etapas internas y expectativa por etapa

### 5.1 Discovery

Debe capturar en background:

1. objetivo del proyecto;
2. oferta principal;
3. motivo del pedido ahora;
4. contexto del negocio.

Comportamiento visible esperado:

1. la conversación arranca abierta;
2. Vika sondea contexto, urgencia, oferta y objetivo sin sonar a checklist;
3. si falta claridad en la oferta, pregunta de forma concreta y cliente-friendly.

### 5.2 Precision

Debe capturar en background:

1. audiencia;
2. plataforma/canal;
3. entregable esperado;
4. CTA principal.

Comportamiento visible esperado:

1. Vika aterriza a quién quieren llegar;
2. pregunta dónde quieren mover la oferta;
3. aterriza qué pieza o formato necesitan;
4. identifica la acción deseada del usuario final.

### 5.3 Commercial Fit

Debe capturar en background:

1. slot comercial recomendado;
2. razón de encaje comercial.

Comportamiento visible esperado:

1. Vika confirma suficiente contexto para propuesta;
2. hace una o dos preguntas finales si necesita cerrar encaje;
3. prepara transición limpia a revisión sin mostrar estructura interna.

---

## 6. Decisiones arquitectónicas cerradas

1. La heurística visible deja de ser la controladora principal del turno.
2. El prompt conversacional pasa a ser la capa dominante de la respuesta visible.
3. El summary estructurado queda como soporte silencioso en background.
4. Las etapas se mantienen, pero dejan de depender de interacción manual en UI como mecanismo principal.
5. El botón manual de cambio de etapa debe considerarse transitorio y removible cuando la validación funcional confirme estabilidad.

---

## 7. Datos existentes a reutilizar

1. `StructuredBriefSummary` en `Bridge/lib/briefing.ts`.
2. persistencia en `brief_messages`.
3. `generateBriefFinalJson(...)`.
4. `submitBriefForOperatorReview(...)`.
5. flujo de cierre ya existente.

## 8. Datos faltantes a crear o redefinir

1. un contrato nuevo para generación visible del turno, centrado en conversación adaptativa;
2. transición automática de etapas en background;
3. eliminación de dependencia visible en fallback fijo por campo;
4. remoción o neutralización del avance manual como mecanismo principal;
5. validación de suficiencia más robusta que “campo no vacío”.

## 9. Archivos exactos a modificar

1. `Bridge/lib/briefing-assistant-ai.ts` — MODIFICAR
2. `Bridge/app/cliente/brief/[projectId]/actions.ts` — MODIFICAR
3. `Bridge/lib/briefing.ts` — MODIFICAR
4. `Bridge/components/client-brief-chat.tsx` — MODIFICAR
5. `Bridge/lib/briefing.test.ts` — MODIFICAR

Maximo permitido: 5 archivos.

## 10. Restricciones de alcance

1. No cambiar schema ni crear migraciones.
2. No agregar dependencias nuevas.
3. No cambiar rutas del portal.
4. No exponer datos internos del summary al cliente.
5. Si aparecen necesidades fuera de estos 5 archivos, detenerse y devolver `BLOQUEO DE CONTEXTO`.

## 11. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 12. Criterios de aceptacion verificables

1. El chat visible ya no usa labels internas ni fallback fijo visible por campo.
2. Discovery puede profundizar de forma natural sin cortar la interacción demasiado pronto.
3. Las etapas avanzan en background sin requerir clic manual para continuar.
4. El usuario no necesita usar el botón de cambio de etapa en el flujo normal.
5. La conversación visible sigue natural incluso si la extracción estructurada interna es parcial.
6. El build queda limpio.

## 13. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/lib/briefing-assistant-ai.ts`

**Datos existentes a reutilizar:**
1. `StructuredBriefSummary`
2. `brief_messages`
3. `generateBriefFinalJson(...)`
4. `submitBriefForOperatorReview(...)`

**Datos faltantes a crear o redefinir:**
1. conversación visible dominada por prompt adaptativo;
2. transición de etapas en background;
3. validación más robusta de suficiencia;
4. degradación natural sin fallback rígido visible.

**Archivos exactos a tocar:**
1. `Bridge/lib/briefing-assistant-ai.ts`
2. `Bridge/app/cliente/brief/[projectId]/actions.ts`
3. `Bridge/lib/briefing.ts`
4. `Bridge/components/client-brief-chat.tsx`
5. `Bridge/lib/briefing.test.ts`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si requiere tocar más de 5 archivos, devolver `BLOQUEO DE CONTEXTO`.
2. Si requiere schema nuevo o migración, devolver `BLOQUEO DE CONTEXTO`.

## 14. Definicion de terminado

Slice terminado cuando el brief cliente funcione como conversación adaptativa guiada por prompt, con extracción y etapas en background, sin labels internas visibles ni dependencia del botón manual para cambiar de etapa.