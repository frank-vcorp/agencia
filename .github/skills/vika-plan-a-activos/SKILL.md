---
name: vika-plan-a-activos
description: "Convertir plan aprobado en activos operativos dentro de Bridge. Usar cuando: derivar activos desde el plan, definir secuencia de piezas, registrar activos tipificados por plataforma formato y placement, detectar cuáles requieren captura previa antes de producción."
---

# Vika — Plan a Activos

<!-- IMPL-20260513-15 | ref: Bridge/context/AGENTE_VIKA_Y_SKILLS_TECNICAS_V1.md -->

## Cuándo usar esta skill

- El operador ya tiene un plan consolidado y necesita los activos derivados.
- Se necesita tipificar y registrar activos en Bridge.
- Se necesita definir plataforma, formato y placement de cada pieza.

## Entradas esperadas

- Plan consolidado del proyecto.
- `projectId`.
- Contexto comercial del proyecto.
- Prioridad o secuencia si el operador la indica.

## Procedimiento

1. Revisar activos existentes con `bridge_list_assets` para evitar duplicados.
2. Derivar la lista de activos necesarios desde el plan. Cada activo debe tener una función dentro del funnel.
3. Para cada activo, definir:
   - tipo de pieza (reel, banner, carrusel, anuncio, historia, etc.),
   - plataforma destino,
   - placement específico,
   - formato y dimensiones si aplica,
   - objetivo dentro del funnel,
   - si requiere material real o puede producirse desde texto e identidad visual.
4. Señalar explícitamente qué activos dependen de material real y requieren activos de captura antes de producción final.
5. Registrar cada activo en Bridge usando `bridge_create_asset` con la tipificación correcta.

## Salida esperada

Lista estructurada de activos:

```
| Activo | Tipo | Plataforma | Placement | Prioridad | Requiere captura |
|--------|------|-----------|-----------|-----------|-----------------|
| ...    | ...  | ...        | ...       | ...       | sí / no         |
```

Con dependencias entre activos señaladas cuando apliquen.

## Reglas

- No derivar activos arbitrarios sin relación con el plan.
- Cada activo debe tener función clara dentro del funnel.
- Si un activo depende de material real, marcarlo como `requiere_captura: sí` y no tratarlo como listo para producción final.
- No mezclar activos de captura con activos finales en el mismo registro.
