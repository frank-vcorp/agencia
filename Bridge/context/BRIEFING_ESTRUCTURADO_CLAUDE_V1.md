# Briefing Estructurado Claude V1

**ID:** ARCH-20260504-15  
**Proyecto:** Bridge  
**Fecha:** 2026-05-04  
**Estado:** Diseño base para implementación

## Objetivo

Definir el flujo de briefing conversacional con Claude para que la conversación termine en campos útiles, faltantes detectados y resumen consumible por agentes.

## Rol de Claude en Bridge

Claude no actúa como chat casual.

Actúa como motor de estructuración de descubrimiento.

Sus funciones en V1:

1. preguntar lo mínimo necesario,
2. extraer campos útiles,
3. detectar contradicciones o faltantes,
4. proponer resumen consolidado,
5. entregar estructura reutilizable.

## Etapas del Flujo

### Etapa 1. Apertura

Bridge inicia el brief con contexto mínimo:

1. tenant,
2. cliente,
3. proyecto o servicio,
4. actor que inicia,
5. objetivo general conocido.

### Etapa 2. Descubrimiento guiado

Claude pregunta según huecos del contexto.

No debe hacer cuestionarios infinitos.

Debe priorizar solo campos que destraban producción.

### Etapa 3. Estructuración

Cada bloque conversacional actualiza campos estructurados.

### Etapa 4. Validación de faltantes

Claude identifica qué falta para cerrar el brief con suficiente calidad.

### Etapa 5. Consolidación

El operador revisa y consolida el brief vigente.

## Campos Estructurados P0

1. objetivo del proyecto,
2. objetivo del activo,
3. oferta principal,
4. público objetivo,
5. plataforma destino,
6. tipo de activo esperado,
7. mensaje principal,
8. CTA,
9. tono,
10. referencias disponibles,
11. restricciones,
12. entregable esperado.

## Campos Opcionales P1

1. objeciones frecuentes,
2. competidores,
3. diferenciadores finos,
4. lineamientos de marca más profundos,
5. restricciones legales o regulatorias complejas.

## Preguntas Base de Claude

Claude debe iniciar desde un set pequeño y condicional.

Preguntas núcleo:

1. qué quieres lograr con esta pieza o proyecto,
2. a quién va dirigido,
3. qué ofreces exactamente,
4. en qué plataforma se va a usar,
5. qué acción quieres que tome la persona,
6. qué referencias o materiales ya existen,
7. qué no debe decir o mostrar la pieza.

## Política de Faltantes

Un brief puede pasar a structured aunque no esté perfecto.

Pero no debe pasar a consolidated si faltan campos críticos.

Campos críticos para consolidar:

1. objetivo,
2. plataforma,
3. oferta,
4. público,
5. CTA,
6. entregable esperado.

## Formato de Respuesta Estructurada

Claude debe devolver dos cosas:

1. respuesta conversacional para humano,
2. objeto estructurado para Bridge.

## Resumen Derivado del Brief

Bridge debe generar una vista corta para agentes con:

1. objetivo,
2. oferta,
3. público,
4. plataforma,
5. activo esperado,
6. CTA,
7. restricciones,
8. faltantes,
9. confianza de estructuración.

## Reglas de Calidad

1. Claude no inventa datos no provistos,
2. si una respuesta es ambigua, debe marcarse como incierta,
3. si hay contradicción, debe señalarse,
4. el operador conserva control de consolidación,
5. el resumen derivado debe incluir timestamp y versión del brief.