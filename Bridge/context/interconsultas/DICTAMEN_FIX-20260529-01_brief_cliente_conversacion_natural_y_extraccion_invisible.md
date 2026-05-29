# DICTAMEN TECNICO: El brief cliente requiere doble capa: conversacion natural visible + extraccion estructurada invisible

**ID:** FIX-20260529-01  
**Agente:** INTEGRA - Arquitecto (consolidacion forense)  
**Fecha:** 2026-05-29  
**Estado:** Listo para implementacion por Sofia

## 1. Problema observado

La IA del brief cliente si responde, pero el texto visible al cliente sigue contaminado por el contrato tecnico de salida y se percibe como formulario o robot.

## 2. Causa raiz

1. La conversacion visible y la estructuracion interna estan acopladas en la misma salida.
2. El asistente fue configurado para obedecer un formato tecnico visible al usuario final.
3. La deteccion de suficiencia de informacion no esta modelada como decision discreta independiente.

## 3. Decision recomendada

Separar el brief cliente en dos capas coordinadas:

1. **Capa visible:** Vika conversa en lenguaje natural, breve, humana, orientada a obtener informacion sin sonar a cuestionario.
2. **Capa invisible:** la IA genera un payload estructurado interno para Bridge con patch de campos, faltantes, senales y bandera de suficiencia de etapa.

## 4. Comportamiento esperado

1. Vika reconduce al cliente si se desvía.
2. Vika detecta discretamente cuando la etapa ya tiene informacion suficiente.
3. Cuando detecta suficiencia, se lo comunica al cliente en lenguaje natural y lo orienta a continuar o cerrar la etapa, sin mostrar estructura tecnica.
4. El payload estructurado solo vive en Bridge para consumo posterior por el agente Vika en VS Code.

## 5. Criterio de cierre

1. El cliente nunca ve etiquetas tecnicas ni JSON.
2. La etapa puede considerarse suficiente sin pedir todos los campos de forma mecanica si ya hay contexto suficiente para operar.
3. Bridge persiste estructura util para consumo interno aunque la conversacion visible siga natural.
