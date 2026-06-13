# HANDOFF FIX-20260529-03 — Deby

**ID:** FIX-20260529-03  
**Fecha:** 2026-05-29  
**Emisor:** INTEGRA - Arquitecto  
**Destinatario:** DEBY - Debugger  
**Proyecto:** Bridge  
**Issue Jira:** SIN-ISSUE

---

## 1. Motivo de la interconsulta

Se solicita a Deby corrección manual del loop conversacional aún activo en producción dentro del brief cliente por proyecto, y dictamen técnico posterior en documento.

Este ya no es un hallazgo teórico ni una sospecha de regresión. El fallo fue reproducido manualmente en producción después del último push del corte de optimismo del historial y suavizado de tono.

---

## 2. URL y caso operativo exacto

URL reproducida:

- https://vectoria-zeta.vercel.app/cliente/proyecto/cf576043-c5ff-4220-a36a-a280dd71e4a1

Proyecto:

- `Lanzamiento Rodamax`

Objetivo de la prueba:

- continuar la conversación del brief cliente y verificar que Vika avance cuando el cliente declara claramente el servicio u oferta que quiere mover.

---

## 3. Fallo reproducido y ya verificado

Secuencia reproducida en producción:

1. Vika pregunta: `¿Cuál es el servicio o producto principal que quieres mover primero?`
2. Se responde: `Principalmente queremos mover el servicio de cambio de aceite y mantenimiento preventivo para atraer más clientes al taller.`
3. Vika responde: `Me refiero a lo que quieres vender o impulsar primero en esta conversación. Puede ser un servicio, un producto, una promoción, una membresía o una oferta puntual. ¿Qué quieres mover exactamente?`
4. Se responde de forma todavía más explícita: `Lo que queremos mover exactamente es una promoción de cambio de aceite para dueños de auto que necesitan mantenimiento preventivo y queremos convertir eso en más visitas al taller.`
5. Vika vuelve a preguntar: `¿Cuál es el servicio o producto principal que quieres mover primero?`
6. Se responde de forma mínima y directa: `El servicio principal es cambio de aceite y mantenimiento preventivo.`
7. Vika vuelve a insistir: `Me refiero a lo que quieres vender o impulsar primero en esta conversación. Puede ser un servicio, un producto, una promoción, una membresía o una oferta puntual. ¿Qué quieres mover exactamente?`

Resultado:

1. el chat entra en loop;
2. no reconoce la respuesta como suficiente;
3. no progresa al siguiente dato del brief;
4. degrada la experiencia aunque el historial optimista ya quedó corregido.

---

## 4. Lo que sí quedó bien

Esto es importante para no mezclar síntomas:

1. el historial optimista ya funciona;
2. el mensaje del cliente aparece inmediatamente en UI;
3. la conversación se limpia y reinicia correctamente al borrar el brief;
4. el problema actual no es de render ni de latencia visual.

Conclusión: el fallo activo es de lógica conversacional / inferencia / aclaración, no de UI.

---

## 5. Hipótesis operativa de Integra

La hipótesis local más fuerte es esta:

1. el campo estructurado asociado a la oferta principal o equivalente no se marca como suficientemente cubierto aunque el usuario ya dio una respuesta válida;
2. la capa visible vuelve a traducir el faltante con la misma pregunta en vez de aceptar la respuesta o reformular hacia otro dato;
3. puede haber una desalineación entre:
   - inferencia del patch estructurado;
   - regla de suficiencia del campo;
   - traducción visible de la siguiente pregunta.

Chequeo discriminante ya realizado:

1. se respondió tres veces con formulaciones distintas y explícitas;
2. el loop persistió;
3. por lo tanto no parece ser un simple problema de redacción del usuario.

---

## 6. Superficies a inspeccionar por Deby

Deby debe revisar como mínimo:

1. [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts)
2. [Bridge/lib/briefing-assistant-ai.ts](Bridge/lib/briefing-assistant-ai.ts)
3. [Bridge/app/cliente/brief/[projectId]/actions.ts](Bridge/app/cliente/brief/%5BprojectId%5D/actions.ts)
4. [Bridge/lib/briefing.test.ts](Bridge/lib/briefing.test.ts)

Puntos especialmente sospechosos:

1. inferencia de `mainOffer` o campo equivalente;
2. regla de suficiencia para ese campo dentro del stage actual;
3. mecanismo que decide la siguiente pregunta visible;
4. manejo de aclaraciones cuando el usuario ya respondió y la IA insiste igual.

---

## 7. Pedido exacto a Deby

Se pide a Deby:

1. reproducir el loop en software o confirmar por código la causa exacta;
2. corregir manualmente el problema en la superficie mínima necesaria;
3. evitar reabrir el rediseño total del chat si no hace falta para este fix puntual;
4. dejar un documento técnico con causa raíz, cambio aplicado y validación.

No se pide polish de tono ni nuevos ajustes visuales en este corte.

---

## 8. Entregable documental obligatorio

Deby debe dejar un documento en:

- `Bridge/context/interconsultas/DICTAMEN_FIX-20260529-03_loop_main_offer_en_produccion.md`

Con estas secciones mínimas:

1. síntoma reproducido;
2. causa raíz confirmada;
3. archivo o función controladora real del fallo;
4. corrección aplicada;
5. validación ejecutada;
6. riesgo residual.

---

## 9. Restricciones para Deby

1. no tocar más de 4 archivos sin devolver bloqueo de contexto;
2. no cambiar schema ni migraciones;
3. no convertir este fix puntual en una reescritura general del runtime;
4. si descubre que la causa real sí obliga a rediseño mayor, debe detenerse y dejarlo documentado explícitamente.

---

## 10. Texto literal para enviar manualmente a Deby

Deby, necesito que corrijas manualmente un loop aún activo en producción en el brief cliente de Bridge y que dejes dictamen técnico del fix.

Caso reproducido en producción:

- URL: https://vectoria-zeta.vercel.app/cliente/proyecto/cf576043-c5ff-4220-a36a-a280dd71e4a1
- Proyecto: Lanzamiento Rodamax

Secuencia observada:

1. Vika pregunta `¿Cuál es el servicio o producto principal que quieres mover primero?`
2. El cliente responde claramente que quiere mover `cambio de aceite y mantenimiento preventivo`.
3. Vika insiste con `¿Qué quieres mover exactamente?`
4. El cliente vuelve a responder de forma más explícita.
5. Vika vuelve a la misma pregunta y entra en loop.

Necesito que revises como mínimo:

1. [Bridge/lib/briefing.ts](Bridge/lib/briefing.ts)
2. [Bridge/lib/briefing-assistant-ai.ts](Bridge/lib/briefing-assistant-ai.ts)
3. [Bridge/app/cliente/brief/[projectId]/actions.ts](Bridge/app/cliente/brief/%5BprojectId%5D/actions.ts)
4. [Bridge/lib/briefing.test.ts](Bridge/lib/briefing.test.ts)

Tu tarea:

1. confirmar la causa raíz exacta;
2. corregir manualmente el loop en el menor alcance posible;
3. validar que después de una respuesta explícita el chat avance al siguiente dato;
4. dejar documento en:
   `Bridge/context/interconsultas/DICTAMEN_FIX-20260529-03_loop_main_offer_en_produccion.md`

Si para corregirlo necesitas tocar más de 4 archivos o rehacer el runtime, detente y documéntalo como bloqueo de contexto.