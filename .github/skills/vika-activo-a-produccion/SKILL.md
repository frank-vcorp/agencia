---
name: vika-activo-a-produccion
description: "Convertir activo tipificado en especificación de producción y prompt especializado para el diseñador. Usar cuando: escribir spec de producción, generar prompt por plataforma, dirección creativa, copy y variantes, QA creativo-comercial, activo listo con material fuente validado."
---

# Vika — Activo a Producción

<!-- IMPL-20260513-15 | ref: Bridge/context/AGENTE_VIKA_Y_SKILLS_TECNICAS_V1.md -->

## Cuándo usar esta skill

- El activo ya está tipificado en Bridge.
- Ya existe material fuente suficiente cuando aplica.
- El operador pide la spec de producción o el prompt especializado.
- Se necesita dirección creativa, copy o QA del activo.

## Prerequisito obligatorio

Si el activo depende de material de captura, ese material debe estar validado antes de correr esta skill. El activo de captura dependiente debe estar en `approved` o `delivered`. Si sigue en `draft`, `in_progress` o `in_review`, esta skill **no debe ejecutarse** para el activo final.

Esta compuerta es una regla de gobierno entre operador y Vika. El MCP no expone esta señal de dependencia de forma directa en este corte; el endurecimiento pertenece al siguiente corte técnico.

## Entradas esperadas

- `assetId` del activo en Bridge.
- Plataforma, formato y objetivo del activo.
- Brief o plan relacionado si hace falta.

## Procedimiento

1. Obtener el contexto completo del activo con `bridge_get_asset_context`.
2. Confirmar con el operador que el material fuente dependiente ya fue validado.
3. Adaptar la salida según plataforma y placement específico del activo.
4. Construir la especificación de producción:
   - objetivo del activo,
   - dirección creativa,
   - copy base y variantes cuando aplique,
   - prompt especializado o instrucciones para el diseñador,
   - restricciones técnicas del formato y plataforma,
   - checklist breve de QA.
5. Si hay incertidumbre técnica sobre restricciones o formatos de la plataforma, consultar fuente oficial vía `web` antes de incluirlo en la spec. Separar recomendación estratégica de restricción técnica oficial.
6. Escribir la especificación en Bridge usando `bridge_write_production_spec`.

## Salida esperada

```
## Spec de producción — [Nombre del activo]

**Plataforma / Placement:** ...
**Objetivo:** ...
**Dirección creativa:** ...
**Copy base:** ...
**Variantes:** ...
**Prompt para IA / Instrucciones para diseñador:** ...
**Restricciones técnicas:** ...

**QA creativo-comercial:**
- [ ] ...
- [ ] ...
```

## Reglas

- No asumir que siempre se necesita prompt IA. Si el activo requiere instrucciones manuales para el diseñador, entregarlas con la misma claridad.
- Adaptar la salida por plataforma, formato y placement del activo.
- No inventar restricciones técnicas de plataforma.
- No ejecutar si las capturas dependientes no están en `approved` o `delivered`.
