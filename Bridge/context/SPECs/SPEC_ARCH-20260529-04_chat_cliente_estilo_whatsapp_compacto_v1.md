# SPEC ARCH-20260529-04: Chat cliente estilo WhatsApp compacto — V1

**ID:** ARCH-20260529-04  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-29  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/SPECs/SPEC_ARCH-20260529-03_brief_cliente_chat_separado_y_json_post_cierre_v1.md`

---

## 1. Objetivo unico y medible

Reducir el ruido visual del chat cliente para que se perciba como mensajeria ligera tipo WhatsApp: sin tarjetas o recuadros pesados por mensaje, con densidad vertical menor y timestamp numerico corto visible en cada mensaje.

## 2. Problema exacto que resuelve

La superficie actual del chat cliente usa burbujas con demasiado peso visual, bordes y padding que consumen altura util. Eso hace que entren pocos mensajes visibles y la conversacion se sienta torpe.

## 3. Decision arquitectonica cerrada

El cambio queda estrictamente en la capa visual de render del historial de mensajes del chat cliente.

1. Mantener alineacion derecha para cliente e izquierda para Vika y operador.
2. Eliminar bordes y apariencia de tarjeta pesada en cada mensaje.
3. Usar una burbuja mucho mas ligera, compacta y cercana a mensajeria movil.
4. Mostrar autor y timestamp en formato numerico corto: `ddmmyy|hh:mm`.
5. Mantener autoscroll y logica funcional actual intactos.

## 4. Datos existentes a reutilizar

1. `ClientBriefChatView` en `Bridge/components/client-brief-chat.tsx`.
2. `messageBubbleClass(...)` y `messageAuthor(...)`.
3. `createdAt` ya persistido en `BriefMessage`.

## 5. Datos faltantes a crear

1. Un formateador corto numerico para fecha y hora con salida exacta `ddmmyy|hh:mm`.
2. Nuevas clases visuales compactas para los mensajes.
3. Una maquetacion mas liviana del item de mensaje, sin recuadro pesado.

## 6. Archivo exacto a modificar

1. `Bridge/components/client-brief-chat.tsx` — MODIFICAR

Maximo permitido: 1 archivo.

## 7. Cambio exacto esperado

1. Cada mensaje debe ocupar menos altura.
2. Deben desaparecer los bordes/recuadros pesados actuales.
3. El chat debe sentirse visualmente mas cercano a WhatsApp que a una lista de cards.
4. El timestamp por mensaje debe verse como `290526|13:32`.

## 8. Restricciones de alcance

1. No tocar server actions ni runtime IA.
2. No cambiar persistencia ni estructura de mensajes.
3. No modificar otros componentes.
4. No introducir dependencias nuevas.

## 9. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 10. Criterios de aceptacion verificables

1. El historial visible muestra claramente mas mensajes simultaneos que antes.
2. Los mensajes ya no usan borde ni apariencia de tarjeta pesada.
3. Cliente sigue a la derecha y Vika a la izquierda.
4. Cada mensaje muestra fecha y hora corta numerica con el patron `ddmmyy|hh:mm`.
5. La compilacion sigue limpia.

## 11. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/components/client-brief-chat.tsx`

**Datos existentes a reutilizar:**
1. `messageBubbleClass(...)`
2. `messageAuthor(...)`
3. `formatShortDateTime(...)`

**Datos faltantes a crear:**
1. formato corto `ddmmyy|hh:mm`
2. estilo visual ligero tipo mensajeria

**Archivos exactos a tocar:**
1. `Bridge/components/client-brief-chat.tsx`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si requiere tocar mas de 1 archivo, devolver `BLOQUEO DE CONTEXTO`.
2. Si requiere cambiar contratos de datos o acciones, devolver `BLOQUEO DE CONTEXTO`.

## 12. Definicion de terminado

Slice terminado cuando el chat cliente renderice mensajes compactos, livianos, sin recuadros pesados y con timestamp corto numerico por mensaje, manteniendo build limpio.