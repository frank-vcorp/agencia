# Agentes y Conocimiento V1

**ID:** ARCH-20260504-08  
**Proyecto:** Bridge  
**Fecha:** 2026-05-04  
**Estado:** Definicion base

## Objetivo

Definir como Bridge V1 debe ser operable por agentes IA y como debe devolver conocimiento util a esos agentes.

## Principio Rector

Bridge V1 no es solo una interfaz para personas.

Es una capa operativa compartida entre humanos y agentes.

## Regla de Operabilidad

Si una entidad es importante para operar la agencia, debe poder ser trabajada por agentes.

Eso incluye como minimo:

1. consultar,
2. crear,
3. actualizar,
4. resumir,
5. relacionar,
6. sugerir siguiente accion.

## Entidades Minimas Operables por Agentes

1. cliente,
2. proyecto,
3. brief,
4. cotizacion,
5. activo,
6. prompt,
7. comentario,
8. lead,
9. estadistica resumida.

## Regla de Conocimiento

Bridge no debe responder solo con tablas crudas.

Tambien debe responder con capas resumidas y utiles para agentes.

## Paquetes de Conocimiento Minimos

### 1. Contexto de cliente

Debe incluir:

1. nombre,
2. servicio o proyectos activos,
3. estado general,
4. tono o lineamientos,
5. restricciones,
6. activos recientes,
7. pendientes principales.

### 2. Contexto de proyecto

Debe incluir:

1. objetivo,
2. brief actual,
3. entregables esperados,
4. estado,
5. bloqueos,
6. ultimas decisiones,
7. responsables.

### 3. Contexto de activo

Debe incluir:

1. aplicativo,
2. tipo de pieza,
3. placement,
4. formato,
5. prompt vigente,
6. referencias,
7. version,
8. estado.

### 4. Contexto comercial

Debe incluir:

1. cotizacion vigente,
2. estado administrativo,
3. leads recientes,
4. proxima accion sugerida.

## Resultado Esperado

Un agente conectado a Bridge debe poder pedir algo como:

1. dame el contexto actual del cliente,
2. crea un activo de WhatsApp status,
3. resume el brief vigente,
4. trae la ultima cotizacion,
5. dime que sigue en este proyecto

y recibir una respuesta estructurada y util, no solo un volcado de datos.