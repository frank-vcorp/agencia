# DICTAMEN TECNICO: Prompt del brief cliente con deriva conversacional y baja disciplina por etapa

**ID:** FIX-20260528-05  
**Agente:** Deby - Debugger (insumo consolidado por Integra)  
**Fecha:** 2026-05-28  
**Estado:** Listo para implementacion por Sofia

## 1. Sintoma observado

El asistente del brief cliente responde con cortesias generales y no fuerza captura de campos criticos por etapa (discovery, precision, commercial_fit).

## 2. Causa raiz

1. El prompt actual en `lib/briefing-assistant-ai.ts` define reglas blandas y no un protocolo estricto de entrevista.
2. No existe contrato de salida obligatorio por turno.
3. No se explicita prioridad de campos faltantes por etapa.
4. No se bloquea de forma explicita la conversacion social (saludo/agradecimiento) sin extraccion util.

## 3. Decision recomendada

Reemplazar el prompt por una version de entrevistador comercial estricto, con:

1. restricciones operativas por etapa;
2. maximo 2 preguntas accionables por turno;
3. formato de salida obligatorio;
4. reglas anti-deriva y anti-cortesia vacia;
5. priorizacion de campos faltantes segun etapa actual.

## 4. Criterio de cierre tecnico

1. Cada respuesta del asistente empuja captura de etapa actual.
2. No hay saltos a etapas futuras salvo instruccion explicita.
3. Si el mensaje del cliente es ambiguo o corto, la salida reconduce con pregunta concreta y ejemplo.
4. Se mantiene fallback determinista cuando no hay respuesta IA.

## 5. Handoff recomendado

Implementar en nuevo slice de arquitectura con alcance acotado sobre `lib/briefing-assistant-ai.ts` y pruebas en `lib/briefing.test.ts`.
