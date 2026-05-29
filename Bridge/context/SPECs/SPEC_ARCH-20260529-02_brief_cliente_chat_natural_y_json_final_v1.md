# SPEC ARCH-20260529-02: Brief cliente con chat natural y JSON final de consumo interno — V2

**ID:** ARCH-20260529-02  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-29  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/SPECs/SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md`

---

## 1. Objetivo unico y medible

Separar el flujo del brief cliente en dos momentos IA distintos y definir cierre automatico limpio cuando Vika detecte informacion suficiente:

1. **Durante el chat:** Vika conversa de forma natural con el cliente para extraer la informacion necesaria del negocio y llevarlo hasta una solicitud madura.
2. **Al cierre de la interaccion:** la IA vuelve a consumir la conversacion y genera un JSON estructurado interno para Bridge, listo para ser consumido por el asistente Vika en VS Code al preparar una propuesta.
3. **Despues del cierre:** la conversacion queda almacenada en Bridge como fuente primaria, pero la superficie visible del chat se limpia para el cliente.

## 2. Problema exacto que resuelve

Hoy se mezclaron demasiadas responsabilidades en el mismo turno del chat: respuesta visible al cliente, estructura interna, parseo tecnico y deteccion de etapa. Eso degrada la naturalidad de la conversacion y vuelve fragil la orquestacion.

## 3. Decision arquitectonica cerrada

La arquitectura correcta del brief cliente queda asi:

### 3.1 Momento A — Chat visible de extraccion

1. Vika solo responde en lenguaje natural al cliente.
2. El objetivo del chat es obtener los datos necesarios para poder hacer una propuesta comercial seria.
3. Vika debe evitar que el cliente se desvie del objetivo del brief.
4. Vika debe detectar discretamente cuando ya hay informacion suficiente para cerrar.
5. El cliente nunca ve JSON, etiquetas tecnicas ni instrucciones internas.

### 3.2 Momento B — Estructuracion final interna

1. Cuando la interaccion termina o pasa a revision, la IA vuelve a consumir la conversacion completa del brief.
2. En ese segundo paso, la IA genera un JSON estructurado final para Bridge.
3. Ese JSON no se muestra al cliente.
4. Ese JSON se guarda como artefacto interno para que el asistente Vika en VS Code lo consuma despues y construya la propuesta.

### 3.3 Momento C — Limpieza de superficie visible

1. Cuando Vika determine que la informacion ya es suficiente para propuesta, el flujo debe cerrarse automaticamente o quedar listo para cierre inmediato.
2. La conversacion historica se conserva en `brief_messages` y sigue siendo la fuente primaria.
3. El cliente ya no ve el historial del chat una vez que el brief queda completo para propuesta.
4. En lugar del historial, el cliente ve un estado limpio y breve indicando que ya hay informacion suficiente y que el equipo preparara la siguiente accion.

## 4. Regla operativa principal

La IA del chat **no** tiene que producir el JSON final en cada turno.

La IA del chat solo debe:

1. conversar,
2. preguntar,
3. encauzar,
4. madurar el pedido,
5. detectar suficiencia.

La conversion a JSON final ocurre **despues**, como una segunda operacion IA separada.

La conversacion completa no se borra de Bridge; solo se limpia la superficie visible del cliente al completarse.

## 5. Datos existentes a reutilizar

1. `brief_messages` como fuente primaria persistida de la conversacion.
2. `StructuredBriefSummary` actual como estructura operativa minima durante el chat.
3. `submitBriefForOperatorReview(...)` en `Bridge/lib/briefing.ts` como punto natural de cierre.
4. `sendClientMessageAction(...)` y `submitBriefAction(...)` en `Bridge/app/cliente/brief/[projectId]/actions.ts`.

## 6. Datos faltantes a crear

### 6.1 En `Bridge/lib/briefing-assistant-ai.ts`

Dividir responsabilidades en funciones separadas:

1. `generateBriefChatReply(...)`
   - solo produce texto natural visible para el cliente;
   - no devuelve JSON;
   - no expone etiquetas tecnicas;
   - puede apoyarse en `StructuredBriefSummary` actual para mantener foco;
   - debe devolver ademas una bandera interna de suficiencia de cierre.

2. `generateBriefFinalJson(...)`
   - consume la conversacion completa y el summary vigente;
   - devuelve un JSON final interno y consistente;
   - orientado a que luego Vika en VS Code lo consuma para preparar propuesta.

### 6.2 Contrato del JSON final interno

El JSON final debe incluir, como minimo:

```ts
{
  projectObjective: string;
  mainOffer: string;
  businessContext: string;
  requestReason: string;
  audience: string;
  platform: string;
  deliverable: string;
  cta: string;
  tone: string;
  restrictions: string;
  references: string;
  urgency: string;
  commercialFitReason: string;
  recommendedProductSlotKey: string;
  operatorReviewNote: string;
  proposalReadiness: "low" | "medium" | "high";
  missingCriticalData: string[];
}
```

El nombre exacto del artefacto persistido puede decidirlo Sofia usando el modelo ya existente, siempre que no requiera migracion.

### 6.3 Momento de generacion del JSON final

La generacion del JSON final debe ocurrir cuando se active el cierre del brief, preferentemente en el flujo de `submitBriefAction(...)` o en la funcion de negocio de envio a revision humana.

### 6.4 Limpieza visible del chat

Cuando Vika detecte que ya hay informacion suficiente para propuesta:

1. se debe persistir la conversacion completa como hasta ahora;
2. se debe generar el JSON final interno;
3. se debe transicionar el brief a cierre o revision humana;
4. la UI del cliente debe dejar de renderizar el historial del chat para esa version y mostrar un estado limpio de cierre.

### 6.5 Persistencia

No se autoriza cambiar schema en este slice.

Por lo tanto, Sofia debe reutilizar el modelo actual para persistir el resultado final de una de estas formas:

1. dentro de `StructuredBriefSummary` usando campos existentes cuando alcance;
2. como texto/JSON serializado dentro de un campo ya disponible para nota u observacion interna;
3. o como artefacto derivado sin migracion, si ya hay un lugar tecnico existente.

Si ninguna de esas opciones es viable sin migracion, Sofia debe devolver `BLOQUEO DE CONTEXTO`.

## 7. Archivos exactos a crear o modificar

1. `Bridge/lib/briefing-assistant-ai.ts` — MODIFICAR
2. `Bridge/app/cliente/brief/[projectId]/actions.ts` — MODIFICAR
3. `Bridge/components/client-brief-chat.tsx` — MODIFICAR
4. `Bridge/lib/briefing.test.ts` — MODIFICAR

Maximo permitido: 4 archivos.

## 8. Cambio exacto esperado

1. El chat visible de Vika vuelve a ser simple, natural y enfocado.
2. Ya no se intenta obtener una salida estructurada completa en cada turno.
3. El JSON final se genera al cierre de la interaccion, no durante cada mensaje.
4. El resultado queda consumible por Vika en VS Code para armar la propuesta.
5. Cuando el brief ya esta completo para propuesta, el historial del chat deja de verse en cliente aunque siga persistido internamente.

## 9. Restricciones de alcance

1. Se autoriza un unico cambio UI funcional: limpiar la superficie visible del chat al completar el brief.
2. No cambiar rutas del portal.
3. No agregar dependencias nuevas.
4. No cambiar schema ni crear migraciones.
5. No mostrar el JSON final al cliente.

## 10. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 11. Criterios de aceptacion verificables

1. Vika conversa en lenguaje natural durante el chat.
2. El cliente no ve etiquetas tecnicas ni JSON en ningun turno.
3. La IA produce un JSON final interno al cierre del brief.
4. Ese JSON final queda listo para consumo posterior por el asistente Vika en VS Code.
5. La conversacion completa queda almacenada en `brief_messages`.
6. Cuando Vika detecta que la informacion ya es suficiente, la UI visible del chat se limpia para el cliente.
5. El flujo compila sin errores.

## 12. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/lib/briefing-assistant-ai.ts`

**Datos existentes a reutilizar:**
1. `StructuredBriefSummary`
2. `brief_messages`
3. `submitBriefAction(...)`
4. `submitBriefForOperatorReview(...)`

**Datos faltantes a crear:**
1. `generateBriefChatReply(...)` con bandera interna de suficiencia
2. `generateBriefFinalJson(...)`
3. estrategia de persistencia interna sin migracion del JSON final
4. limpieza de superficie visible del chat sin borrar `brief_messages`

**Archivos exactos a tocar:**
1. `Bridge/lib/briefing-assistant-ai.ts`
2. `Bridge/app/cliente/brief/[projectId]/actions.ts`
3. `Bridge/components/client-brief-chat.tsx`
4. `Bridge/lib/briefing.test.ts`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si requiere tocar mas de 4 archivos, devolver `BLOQUEO DE CONTEXTO`.
2. Si requiere migracion o nuevo campo persistente, devolver `BLOQUEO DE CONTEXTO`.

## 13. Definicion de terminado

Slice terminado cuando el brief cliente use un solo prompt natural para conversar durante la captura, conserve la conversacion como fuente primaria persistida, y al cierre genere un JSON interno final listo para consumo por Vika en VS Code mientras la superficie visible del chat se limpia para el cliente.
