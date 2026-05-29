# HANDOFF FIX-20260529-02 — Para Integra

**ID:** FIX-20260529-02  
**Fecha:** 2026-05-29  
**Emisor:** DEBY - Debugger  
**Destinatario:** INTEGRA - Arquitecto  
**Proyecto:** Bridge  
**Issue Jira:** SIN-ISSUE

---

## 1. Motivo del handoff

Se entrega a Integra un hallazgo forense ya verificado en software sobre el chat del brief cliente.

La conclusión no apunta a un bug aislado sino a una deuda de diseño en el runtime conversacional. El usuario ya percibe el flujo como demasiado parchado y la evidencia técnica respalda esa percepción.

---

## 2. Fallo verificado

En el proyecto `Lanzamiento Rodamax`, el chat del brief entra en un loop conversacional y no logra aclarar una repregunta básica del cliente.

Caso reproducible verificado:

1. Vika abre con: `Cuentame que quieres lograr con este proyecto, que estas ofreciendo y por que ahora es importante moverlo.`
2. El cliente responde con contexto comercial amplio sobre Rodamax.
3. Vika responde: `Para avanzar bien, necesito entender oferta principal.`
4. El cliente repregunta: `Que oferta principal?`
5. Vika repite exactamente: `Para avanzar bien, necesito entender oferta principal.`

Resultado: el cliente no recibe aclaración útil y el chat queda atrapado en la misma consigna.

---

## 3. Causa raíz confirmada

La causa raíz confirmada es dual:

### 3.1 Inferencia heurística demasiado rígida

En [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts), la captura de `mainOffer` depende de patrones muy estrechos como:

- `ofrezco` / `ofrecemos`
- `vendo` / `vendemos`
- `nuestro producto`
- `nuestro servicio`

La respuesta amplia de Rodamax no entra en esos patrones, por lo que `mainOffer` queda vacío aunque para un humano la oferta ya es entendible.

### 3.2 Fallback visible expone etiquetas internas

En [Bridge/lib/briefing-assistant-ai.ts](Bridge/lib/briefing-assistant-ai.ts), cuando falta `mainOffer`, el fallback responde usando la etiqueta interna `oferta principal` como texto visible para el cliente.

Además, la detección de repreguntas meta no contempla variantes como:

- `que oferta principal`
- `cual oferta`
- `a que te refieres con oferta`

Por eso el sistema no cambia a modo aclaración y repite la misma frase.

---

## 4. Archivos implicados

1. [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts)  
   - inferencia heurística de `mainOffer` demasiado estrecha.

2. [Bridge/lib/briefing-assistant-ai.ts](Bridge/lib/briefing-assistant-ai.ts)  
   - fallback expone etiquetas internas y no maneja adecuadamente repreguntas de aclaración.

3. [Bridge/app/cliente/brief/[projectId]/actions.ts](Bridge/app/cliente/brief/%5BprojectId%5D/actions.ts)  
   - concentra demasiadas responsabilidades en el mismo turno y persiste una respuesta visible ya degradada.

4. [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts)  
   - además siembra una apertura local rígida desde `buildAssistantGuidance(...)`, lo que duplica la lógica de apertura frente al prompt IA.

---

## 5. Lectura forense de Deby

Esto ya no es un problema de presentación ni de un `maxOutputTokens` mal calibrado.

La fragilidad viene de mezclar en el mismo ciclo:

1. mensaje visible al cliente;
2. inferencia estructurada local;
3. fallback heurístico;
4. control de etapa;
5. cierre del brief;
6. generación posterior de JSON.

Mientras ese contrato siga mezclado, cualquier fix puntual seguirá dejando nuevas grietas: truncado, loops, preguntas rígidas, exposición de etiquetas internas o reacciones torpes ante aclaraciones.

---

## 6. Recomendación para Integra

La recomendación técnica honesta es esta:

### 6.1 No seguir parchando el runtime actual

El runtime del chat cliente ya acumuló demasiadas correcciones reactivas. Seguir sobre la misma base aumenta complejidad y reduce previsibilidad.

### 6.2 Formalizar un saneamiento con contrato más simple

Integra debería definir una arquitectura donde:

1. la conversación visible use solo preguntas naturales;
2. las etiquetas internas nunca se muestren al cliente;
3. la aclaración de repreguntas sea una responsabilidad explícita;
4. la captura estructurada no contamine directamente cada turno visible;
5. `actions.ts` deje de concentrar demasiada lógica de negocio conversacional.

### 6.3 Si hace falta, ordenar una reescritura controlada del runtime

Si Integra concluye que el saneamiento incremental sigue dejando demasiada deuda, Deby recomienda decirlo sin suavizarlo: **sí conviene rehacer el runtime del chat cliente con un contrato más simple y separaciones más claras**.

La UX actual ya falló en dos dimensiones distintas: completitud de respuesta y aclaración conversacional. Eso indica deuda sistémica, no bug puntual.

---

---

## 7. Propuesta mínima de decisión arquitectónica

Integra debería decidir entre estas dos rutas:

### Ruta A — Saneamiento profundo pero incremental

1. reemplazar fallback por preguntas cliente-friendly por campo;
2. desacoplar apertura local de prompt IA;
3. manejar explícitamente repreguntas de aclaración;
4. suavizar o reemplazar la inferencia heurística de `mainOffer`;
5. reducir responsabilidades de `actions.ts`.

### Ruta B — Reescritura controlada del runtime del brief

1. definir un contrato nuevo de turno conversacional;
2. separar claramente capa visible, captura estructurada y cierre;
3. eliminar la duplicidad entre `buildAssistantGuidance(...)`, fallback y prompt;
4. volver determinística la traducción de faltantes internos a preguntas visibles.

Mi recomendación profesional es que Integra evalúe la **Ruta B** como opción principal, porque el sistema actual ya muestra síntomas de deuda acumulada en varios puntos a la vez.

---

## 8. Pedido concreto a Integra

Se solicita que Integra produzca una SPEC de saneamiento arquitectónico del chat brief cliente, tomando este hallazgo como base y definiendo:

1. el contrato nuevo o saneado del turno conversacional;
2. qué partes se conservan;
3. qué partes se eliminan;
4. qué archivos quedan dentro del primer corte de implementación;
5. cómo se valida que no vuelvan a aparecer loops de aclaración ni etiquetas internas visibles.

---

## 9. Texto literal para enviar manualmente a Integra

Integra, te paso hallazgo forense ya verificado del chat del brief cliente en Bridge.

El problema no es de UI. El fallo reproducible es este:

1. Vika pide `oferta principal`;
2. el cliente pregunta `Que oferta principal?`;
3. Vika repite lo mismo y entra en loop.

Causa raíz confirmada:

1. la heurística de `mainOffer` en [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts) es demasiado rígida y no captura respuestas amplias como la de Rodamax;
2. el fallback visible en [Bridge/lib/briefing-assistant-ai.ts](Bridge/lib/briefing-assistant-ai.ts) expone etiquetas internas como `oferta principal` y no sabe aclararlas cuando el cliente repregunta.

Mi recomendación como Deby es no seguir parchando el runtime actual. Esto ya es deuda de diseño. Necesitamos que definas una SPEC de saneamiento arquitectónico, y si tu conclusión es que conviene rehacer el runtime del chat cliente con un contrato más simple, dilo y ordénalo así.