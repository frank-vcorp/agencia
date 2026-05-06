# SPEC ARCH-20260506-33

## Titulo

Continuidad conversacional en entidades restantes V1

## Estado

Cerrado

## Fecha

2026-05-06

## Objetivo

Extender la conversación contextual mínima ya validada en `lead` hacia `brief`, `quotation` y `asset`, manteniendo persistencia ligera, trazabilidad y bajo acoplamiento con la UI.

## Problema que Resuelve

Bridge ya dispone de conversación contextual funcional para `lead`, pero el resto de entidades operativas sigue sin una continuidad conversacional equivalente.

Eso deja huecos en:

1. seguimiento de decisiones sobre `brief`,
2. comentarios operativos sobre `quotation`,
3. continuidad mínima sobre entregables y estados de `asset`.

## Decision Arquitectonica

La conversación contextual por entidad debe reutilizar el modelo ya probado con `conversation_threads` y `conversation_messages`.

Debe ser:

1. mínima,
2. trazable,
3. de solo persistencia operativa,
4. reutilizable por UI y contexto derivado,
5. sin abrir una bandeja global nueva.

## Alcance del Corte

### Persistencia y lectura mínima

1. soporte para `brief`, `quotation` y `asset`,
2. lectura y escritura mínima de mensajes por entidad,
3. consistencia con `entity_type` ya existente,
4. reutilización del patrón ya implementado en `lead`.

### Integración mínima

1. visualización en superficies existentes cuando aplique,
2. helpers reutilizables server-side,
3. sin cambiar el modelo de fuentes primarias.

## Criterios de Aceptacion

1. Existe continuidad conversacional mínima para `brief`, `quotation` y `asset`.
2. La conversación conserva trazabilidad por entidad y tenant.
3. La UI actual no se rompe.
4. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. bandeja global unificada,
2. canales externos,
3. IA generativa automática sobre conversaciones,
4. workflow complejo de aprobación por mensaje.

## Riesgo que Evita

Evita que decisiones operativas sobre entidades clave sigan quedando fuera del sistema o repartidas en chats externos sin contexto estructurado.

## Orden de Implementacion Recomendado

1. reutilizar helpers y contratos del chat de `lead`,
2. extender lectura/escritura a `brief`, `quotation` y `asset`,
3. exponer la conversación mínima en superficies concretas,
4. validar persistencia, build y tests,
5. cerrar con checkpoint y publicación.