---
name: vika-brief-a-plan
description: "Tomar brief consolidado de Bridge y convertirlo en plan de marketing accionable. Usar cuando: analizar brief del cliente, definir estrategia, mapear caso a servicio, identificar objetivo audiencia oferta canal urgencia, construir plan antes de derivar activos."
---

# Vika — Brief a Plan

<!-- IMPL-20260513-15 | ref: Bridge/context/AGENTE_VIKA_Y_SKILLS_TECNICAS_V1.md -->

## Cuándo usar esta skill

- El usuario pide analizar un brief.
- El usuario pide definir estrategia o diagnosticar el caso.
- Se necesita mapear el proyecto al servicio correcto de VectorIA.
- Antes de derivar cualquier activo.

## Entradas esperadas

- `projectId` si el brief está en Bridge.
- `clientSlug` para copia local cuando aplique.
- Contexto adicional del operador si existe.

## Procedimiento

1. Obtener el brief usando `bridge_get_brief` con el `projectId` del proyecto.
2. Identificar los ejes clave del brief:
   - objetivo del cliente,
   - audiencia objetivo,
   - oferta o propuesta de valor,
   - canal o plataforma principal,
   - urgencia y restricciones.
3. Detectar vacíos materiales del brief. No inventar información faltante. Señalar lo que falta con claridad.
4. Diagnosticar el encaje comercial: ¿qué servicio de VectorIA corresponde a este caso?
5. Redactar el plan accionable estructurado.

## Persistencia del plan

En este corte, el plan no tiene entidad MCP propia en Bridge. Se consolida como artefacto de trabajo del operador. La huella operativa del plan dentro de Bridge ocurre cuando la skill `vika-plan-a-activos` crea los activos derivados.

## Salida esperada

```
## Plan — [Nombre del proyecto]

**Resumen del caso:** ...
**Diagnóstico comercial:** ...
**Servicio recomendado:** ...
**Objetivo del plan:** ...
**Canales priorizados:** ...
**Dependencias identificadas:** ...
**Riesgos o faltantes:** ...
```

## Reglas

- No inventar información ausente del brief.
- Señalar vacíos críticos antes de continuar.
- Separar lo seguro de lo hipotético.
- Orientar el plan a ejecución, no a teoría.
