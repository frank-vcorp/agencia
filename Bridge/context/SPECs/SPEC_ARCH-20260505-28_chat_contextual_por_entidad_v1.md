# SPEC ARCH-20260505-28

## Titulo

Chat contextual real por entidad V1

## Estado

Planificado

## Fecha

2026-05-05

## Objetivo

Abrir una primera superficie de chat contextual en Bridge para que operador, diseñador o cliente conversen sobre una entidad real ya persistida (`lead`, `brief`, `cotizacion` o `asset`) sin volver a chats sueltos sin fuente primaria.

## Problema que Resuelve

Bridge ya tiene objetos operativos persistidos, pero la continuidad conversacional sigue fuera del sistema. Si el chat llega antes de anclarse a entidades reales, el sistema vuelve a dispersar contexto y decisiones.

## Decision Arquitectonica

El chat no nace como bandeja global. Nace como capacidad contextual por entidad.

Principios:

1. toda conversación debe colgar de una entidad primaria,
2. el contexto visible siempre se deriva de datos persistidos,
3. los mensajes no reemplazan la fuente de verdad; la complementan,
4. el primer corte privilegia trazabilidad sobre sofisticación conversacional.

## Entidades Iniciales

1. `lead`,
2. `brief`,
3. `quotation`,
4. `asset`.

## Alcance del Corte

### Modelo minimo

1. entidad `conversation_threads`,
2. entidad `conversation_messages`,
3. referencia a `tenant`,
4. referencia a `entity_type` y `entity_id`,
5. rol mínimo del emisor (`operator`, `designer`, `client`, `agent`).

### UI minima

1. cada entidad soportada expone una entrada clara a su conversación,
2. la vista muestra resumen de la entidad encima del chat,
3. permite publicar mensaje manual corto,
4. muestra historial ordenado y vacío honesto cuando no exista conversación.

### Reglas de producto

1. una conversación pertenece a una sola entidad primaria,
2. los mensajes no pueden existir sin thread,
3. el chat debe poder leerse sin inferir datos fuera del objeto,
4. la UI debe dejar claro “sobre qué” se está conversando.

## Criterios de Aceptacion

1. Existe persistencia mínima de conversaciones y mensajes por entidad.
2. Al menos una entidad comercial (`lead`) y una operativa (`brief` o `asset`) exponen chat contextual funcional.
3. El usuario puede publicar un mensaje manual y verlo persistido al recargar.
4. La cabecera del chat muestra resumen suficiente de la entidad fuente.
5. El sistema mantiene trazabilidad de actor y timestamps.
6. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. IA conversacional automática,
2. inbox global unificado,
3. adjuntos complejos,
4. reglas avanzadas de notificación,
5. sincronización con canales externos.

## Riesgo que Evita

Evita reintroducir conversaciones fuera de sistema justo cuando Bridge ya logró anclar briefs, cotizaciones, activos y CRM a objetos persistidos.

## Dependencia Previa

Este corte depende de cerrar primero la vinculación explícita `lead -> client/project`, para que el chat comercial nazca ya conectado al contenedor real.

## Orden de Implementacion Recomendado

1. definir modelo de thread/mensaje por entidad,
2. habilitar primer caso completo sobre `lead`,
3. replicar patrón sobre una entidad operativa,
4. validar resumen contextual visible sobre la conversación,
5. cerrar con tests y checkpoint.