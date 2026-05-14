---
name: vika-activos-de-captura
description: "Crear activos de captura cuando falten materiales reales para producir activos finales. Usar cuando: necesitar fotos o videos del negocio producto servicio o entorno, solicitar material al cliente o diseñador, bloquear producción prematura, describir qué debe capturarse ángulo intención y formato."
---

# Vika — Activos de Captura

<!-- IMPL-20260513-15 | ref: Bridge/context/AGENTE_VIKA_Y_SKILLS_TECNICAS_V1.md -->

## Cuándo usar esta skill

- Un activo final requiere fotos o videos reales que no existen aún.
- El operador pide materiales a recolectar antes de producir.
- El plan depende de negocio, producto, servicio o entorno real y el material no está disponible.

## Diferencia fundamental

Un activo de captura **no es un activo final**. Su objetivo es obtener material real. Su salida no es un prompt para IA: es una instrucción de captura para el diseñador o una solicitud concreta al cliente.

Ejemplos: foto de fachada, video del servicio en ejecución, fotografía del uniforme, recorrido del local, close-up del producto, tomas con dron.

## Entradas esperadas

- Activo final o grupo de activos finales que dependen de captura.
- `projectId`.
- Contexto del negocio.
- Restricciones de producción si existen.

## Procedimiento

1. Identificar qué activos finales no pueden producirse aún por falta de material real.
2. Para cada uno, derivar el activo de captura correspondiente con:
   - qué debe capturarse (descripción precisa),
   - ángulo, intención y duración o formato si aplica,
   - prioridad,
   - responsable: cliente o diseñador,
   - criterio de validación del material.
3. Crear cada activo de captura en Bridge usando `bridge_create_asset` con tipo claramente diferenciado del activo final.
4. Dejar transparente para el diseñador que el trabajo en curso es captura, no producción final.

## Compuerta captura → producción

La captura se considera válida para habilitar producción cuando se cumplen las 3 condiciones:

1. el activo de captura existe en Bridge,
2. el material solicitado fue subido o registrado como evidencia útil,
3. el operador y Vika lo consideran suficiente y el activo queda en `approved` o `delivered`.

Mientras el activo de captura esté en `draft`, `in_progress` o `in_review`, la producción final queda bloqueada.

Esta compuerta es una **regla de gobierno entre el operador y Vika**, no una verificación automática del MCP. El endurecimiento técnico de dependencias explícitas en el MCP pertenece al siguiente corte.

## Salida esperada

Por cada activo de captura:

```
**Activo de captura:** [nombre]
**Qué capturar:** ...
**Ángulo / intención:** ...
**Formato:** ...
**Responsable:** cliente / diseñador
**Prioridad:** alta / media / baja
**Criterio de validación:** ...
```

## Reglas

- La salida es una instrucción de captura, no un prompt final para IA.
- Describir con precisión qué se necesita captar.
- Bloquear la derivación prematura de activos finales.
- Mantener transparente para el diseñador si el trabajo es captura y no producción.
