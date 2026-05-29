# HANDOFF FIX-20260529-01 — Deby

**ID:** FIX-20260529-01  
**Fecha:** 2026-05-29  
**Emisor:** INTEGRA - Arquitecto  
**Destinatario:** DEBY - Debugger  
**Proyecto:** Bridge  
**Issue Jira:** SIN-ISSUE

---

## 1. Motivo de la interconsulta

Se solicita dictamen forense y propuesta de saneamiento del chat del brief cliente.

El usuario reporta fatiga por iteraciones sucesivas que no estabilizaron el comportamiento. La percepción actual es que el flujo está demasiado parchado y que cada fix corrige un síntoma, pero no sanea la arquitectura del chat.

No se pide otro parche puntual. Se pide diagnóstico raíz y ruta de saneamiento.

---

## 2. Síntoma operativo visible

En el portal cliente del proyecto Rodamax, el chat del brief:

1. ha mostrado respuestas truncadas o a media frase;
2. mezcla apertura local rígida con respuesta IA posterior;
3. mantiene demasiada lógica acoplada en un mismo turno;
4. da la sensación de flujo frágil y poco confiable;
5. ha requerido múltiples ajustes sucesivos sin cerrar el problema de fondo.
6. entra en bucles conversacionales cuando el cliente pide aclaración sobre un campo.

Ejemplo visible reportado por usuario:

- Vika responde algo como: `Entendido. Para entender mejor`
- El usuario percibe que el chat “no sirve” y que el código quedó demasiado parchado.

Caso adicional reproducible ya observado:

1. Vika abre con: `Cuentame que quieres lograr con este proyecto, que estas ofreciendo y por que ahora es importante moverlo.`
2. El cliente responde con contexto comercial suficientemente amplio sobre Rodamax.
3. Vika responde: `Para avanzar bien, necesito entender oferta principal.`
4. El cliente repregunta: `Que oferta principal?`
5. Vika repite exactamente: `Para avanzar bien, necesito entender oferta principal.`

Este caso muestra dos fallos adicionales:

1. el sistema no logra traducir una etiqueta interna como `oferta principal` a lenguaje conversacional útil;
2. el sistema no interpreta la repregunta del cliente como solicitud de aclaración, sino que reitera el mismo texto y cae en loop.

---

## 3. Estado actual del código

### 3.1 Punto de apertura local sembrada

La primera pregunta visible no sale del prompt de IA sino de la guía local en:

- [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts#L598)

Texto actual de apertura en discovery:

- `Cuentame que quieres lograr con este proyecto, que estas ofreciendo y por que ahora es importante moverlo.`

Esa guía se persiste al crear el brief en:

- [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts#L1661)

### 3.2 Runtime del turno conversacional

La orquestación actual del turno vive en:

- [Bridge/app/cliente/brief/[projectId]/actions.ts](Bridge/app/cliente/brief/%5BprojectId%5D/actions.ts#L24)

Actualmente, en un solo turno se hace todo esto:

1. persistir mensaje cliente;
2. inferir patch estructurado local;
3. mezclar summary para el asistente;
4. generar respuesta IA;
5. persistir respuesta visible;
6. decidir cierre en comercial fit;
7. eventualmente generar JSON final y pasar a revisión.

### 3.3 Capa IA actual

La lógica IA principal está en:

- [Bridge/lib/briefing-assistant-ai.ts](Bridge/lib/briefing-assistant-ai.ts)

Puntos sensibles actuales:

- [Bridge/lib/briefing-assistant-ai.ts](Bridge/lib/briefing-assistant-ai.ts#L176) `sanitizeAssistantReply(...)`
- [Bridge/lib/briefing-assistant-ai.ts](Bridge/lib/briefing-assistant-ai.ts#L202) `isAcceptableAssistantVisibleReply(...)`
- [Bridge/lib/briefing-assistant-ai.ts](Bridge/lib/briefing-assistant-ai.ts#L402) `generateBriefChatReply(...)`

El hardening reciente ya intenta bloquear respuestas truncadas, pero sigue siendo una capa correctiva sobre un runtime que mezcla demasiadas responsabilidades.

### 3.4 UI del chat

La UI vive en:

- [Bridge/components/client-brief-chat.tsx](Bridge/components/client-brief-chat.tsx)

La UI ya fue compactada y no parece ser la causa raíz del fallo conversacional. No usar la UI como chivo expiatorio del problema.

---

## 4. Diagnóstico arquitectónico preliminar de INTEGRA

Mi lectura actual es esta:

1. El flujo mezcla conversación visible, captura estructurada, control de etapas y cierre interno dentro del mismo ciclo de turno.
2. La apertura inicial del brief está duplicada conceptualmente: una parte vive sembrada en `buildAssistantGuidance(...)` y otra parte vive en el prompt del asistente.
3. El sistema sigue dependiendo de combinaciones de heurística local + prompt + saneado + fallback + cierre, lo que vuelve difícil razonar el comportamiento real.
4. El archivo de acciones se convirtió en un punto de acoplamiento excesivo.
5. El hardening reciente corrige síntomas válidos, pero no resuelve del todo la deuda de diseño.
6. El fallback actual puede exponer etiquetas semiestructuradas como `oferta principal` en vez de traducirlas a una pregunta natural útil para cliente final.

Conclusión preliminar: el problema ya no debe tratarse como “ajustar otra regex o otro maxOutputTokens”, sino como saneamiento del contrato de conversación.

---

## 5. Pedido exacto a Deby

Se pide a Deby un **DICTAMEN TÉCNICO** que responda estas preguntas con precisión:

1. ¿Cuál es la causa raíz principal de la fragilidad del chat cliente?
2. ¿Qué partes del runtime actual son parches acumulados y cuáles deben conservarse?
3. ¿Cuál es el punto correcto para separar responsabilidades?
4. ¿La arquitectura correcta debe seguir siendo chat + summary local + JSON final, o conviene rediseñar el corte entre capas?
5. ¿Qué saneamiento mínimo deja el flujo estable sin reescribir innecesariamente todo?

---

## 6. Alcance solicitado del dictamen

Deby debe analizar y dictaminar sobre estos archivos:

1. [Bridge/app/cliente/brief/[projectId]/actions.ts](Bridge/app/cliente/brief/%5BprojectId%5D/actions.ts)
2. [Bridge/lib/briefing-assistant-ai.ts](Bridge/lib/briefing-assistant-ai.ts)
3. [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts)
4. [Bridge/components/client-brief-chat.tsx](Bridge/components/client-brief-chat.tsx)
5. [Bridge/context/SPECs/SPEC_ARCH-20260529-03_brief_cliente_chat_separado_y_json_post_cierre_v1.md](Bridge/context/SPECs/SPEC_ARCH-20260529-03_brief_cliente_chat_separado_y_json_post_cierre_v1.md)
6. [Bridge/context/SPECs/SPEC_ARCH-20260529-05_hardening_respuesta_truncada_chat_brief_v1.md](Bridge/context/SPECs/SPEC_ARCH-20260529-05_hardening_respuesta_truncada_chat_brief_v1.md)

---

## 7. Entregable esperado de Deby

Se espera un archivo de dictamen en:

- `Bridge/context/interconsultas/DICTAMEN_FIX-20260529-01_saneamiento_chat_brief_cliente.md`

Con estas secciones mínimas:

1. síntoma reproducible;
2. causa raíz confirmada;
3. arquitectura actual vs arquitectura recomendada;
4. componentes a conservar;
5. componentes a simplificar o eliminar;
6. plan de saneamiento por fases;
7. riesgos de volver a parchear sin rediseño.

---

## 8. Restricción explícita para Deby

No queremos otro micro-fix ciego.

Deby debe priorizar:

1. coherencia del flujo conversacional;
2. separación de responsabilidades;
3. eliminación de duplicidades entre apertura local, prompt y fallback;
4. reducción del acoplamiento en `actions.ts`.

Si la conclusión correcta es “hay que rehacer el runtime del chat cliente con un contrato más simple”, Deby debe decirlo de forma explícita.

---

## 9. Texto literal para enviar manualmente a Deby

Deby, necesito un dictamen forense del chat del brief cliente de Bridge. Ya tuvimos demasiadas iteraciones y el usuario percibe que el flujo quedó parchado. No quiero otro fix puntual: quiero causa raíz y propuesta de saneamiento.

Analiza estos archivos:

1. [Bridge/app/cliente/brief/[projectId]/actions.ts](Bridge/app/cliente/brief/%5BprojectId%5D/actions.ts)
2. [Bridge/lib/briefing-assistant-ai.ts](Bridge/lib/briefing-assistant-ai.ts)
3. [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts)
4. [Bridge/components/client-brief-chat.tsx](Bridge/components/client-brief-chat.tsx)

Y toma como contexto estas SPECs:

1. [Bridge/context/SPECs/SPEC_ARCH-20260529-03_brief_cliente_chat_separado_y_json_post_cierre_v1.md](Bridge/context/SPECs/SPEC_ARCH-20260529-03_brief_cliente_chat_separado_y_json_post_cierre_v1.md)
2. [Bridge/context/SPECs/SPEC_ARCH-20260529-05_hardening_respuesta_truncada_chat_brief_v1.md](Bridge/context/SPECs/SPEC_ARCH-20260529-05_hardening_respuesta_truncada_chat_brief_v1.md)

Problemas observados:

- respuestas truncadas o a media frase;
- apertura inicial rígida sembrada localmente;
- loops conversacionales cuando el cliente pide aclaración;
- exposición de etiquetas internas como `oferta principal` en vez de lenguaje cliente;
- demasiadas responsabilidades mezcladas por turno;
- sensación general de flujo frágil y parchado.

Quiero que produzcas el dictamen en:

- `Bridge/context/interconsultas/DICTAMEN_FIX-20260529-01_saneamiento_chat_brief_cliente.md`

Y que respondas con claridad:

1. causa raíz real;
2. qué conservar;
3. qué eliminar o simplificar;
4. si conviene rehacer el runtime del chat;
5. plan de saneamiento por fases.

Si tu conclusión es que el runtime actual ya no merece más parches y debe rehacerse con contrato más simple, dilo sin suavizarlo.
