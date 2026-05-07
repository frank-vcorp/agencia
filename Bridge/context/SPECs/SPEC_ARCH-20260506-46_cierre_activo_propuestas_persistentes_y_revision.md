# SPEC ARCH-20260506-46

## Titulo

Cierre del activo creativo con propuestas persistentes y decision operativa

## Estado

Planificado

## Fecha

2026-05-06

## Objetivo

Cerrar el principal vacio del activo detallado para que la ficha deje de depender de mensajes sueltos y pueda gobernar propuestas reales, comparacion corta y decision operativa dentro de Bridge.

## Problema que Resuelve

El corte 45 ya convirtio al activo en una ficha real con prompt, contexto, flujo Bridge -> Adobe -> Bridge y conversacion.

Pero todavia falta cerrar el nucleo del trabajo creativo:

1. las propuestas no tienen persistencia propia,
2. no existe una propuesta primaria versus una alternativa,
3. el operador no puede decidir sobre propuestas dentro del mismo activo,
4. la revision sigue degradada a comentarios en conversacion,
5. el estado del activo no queda sostenido por evidencia creativa estructurada.

Mientras ese gap siga abierto, el activo se ve correcto pero todavia no esta verdaderamente cerrado como unidad de trabajo y revision.

## Decision Arquitectonica

Antes de pasar a Cliente, Bridge debe cerrar el activo como objeto completo.

La prioridad no es anadir mas superficies, sino consolidar la pieza central donde confluyen:

1. prompt origen,
2. produccion del disenador,
3. propuestas devueltas,
4. revision del operador,
5. decision operativa trazable.

La conversacion del activo debe mantenerse como contexto complementario, pero ya no como sustituto de propuestas persistidas.

## Alcance del Corte

### 1. Persistencia dedicada de propuestas

Crear soporte real para propuestas del activo, con al menos:

1. propuesta primaria,
2. propuesta alternativa opcional,
3. nota corta del disenador,
4. herramienta usada,
5. referencia a la version de prompt origen,
6. timestamp de creacion.

### 2. Zona de propuestas utilizable

La ficha del activo debe dejar de mostrar solo vacio honesto y pasar a mostrar:

1. tarjetas de propuestas reales,
2. etiqueta de propuesta principal o alternativa,
3. diferencia corta entre propuestas si existe mas de una,
4. estado de revision de cada propuesta,
5. ultima devolucion del disenador.

### 3. Decision operativa en Bridge

Desde la ficha del activo debe quedar claro si la propuesta:

1. sigue en produccion,
2. quedo devuelta para revision,
3. fue aprobada operativamente,
4. requiere nuevo ajuste.

No se busca cerrar aprobacion cliente final, pero si la decision interna de operador.

### 4. Estados mas honestos del activo

La vista y la capa reusable deben poder representar mejor:

1. activo sin propuestas,
2. activo con una propuesta lista,
3. activo con varias propuestas,
4. activo devuelto para ajustes,
5. activo aprobado operativamente.

## Contrato Minimo Esperado

La capa reusable del activo debe exponer o enriquecer al menos:

1. `proposalDrafts` ya no vacio por defecto,
2. `primaryProposal`,
3. `secondaryProposal`,
4. `proposalComparisonNote`,
5. `reviewDecision`,
6. `reviewState`,
7. `gaps` actualizados segun lo que siga faltando.

## Criterios de Aceptacion

1. El activo deja de depender solo de mensajes para representar propuestas.
2. La ficha puede mostrar al menos una propuesta persistida y su trazabilidad al prompt.
3. Si existen dos propuestas, la UI las distingue con claridad.
4. El operador puede entender si debe aprobar, pedir ajuste o seguir esperando.
5. Los vacios honestos se reducen respecto al corte 45.
6. Cliente sigue fuera de alcance hasta cerrar este gap.
7. Build y tests pasan al implementarse.

## Fuera de Alcance de Este Corte

1. aprobacion final del cliente,
2. integracion automatica con APIs de Adobe,
3. comparador visual avanzado de imagenes,
4. analytics historicos por activo,
5. notificaciones externas.

## Dependencias

1. SPEC 45 para la ficha detallada del activo,
2. workspace del disenador ya publicado,
3. flujo Bridge -> Adobe -> Bridge ya visible,
4. continuidad conversacional por activo ya implementada.

## Orden de Implementacion Recomendado

1. definir persistencia minima de propuestas por activo,
2. enriquecer `lib/asset-detail.ts` con propuestas reales y decision operativa,
3. reemplazar el vacio honesto principal en `/activos/[id]` por tarjetas de propuestas,
4. conectar la devolucion del disenador a esa persistencia,
5. validar navegacion y lectura desde `/disenador` y `/activos/[id]`.