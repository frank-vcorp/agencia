# SPEC ARCH-20260505-29

## Titulo

Hardening de validacion cruzada `clientId/projectId` en CRM V1

## Estado

Cerrado

## Fecha

2026-05-05

## Objetivo

Cerrar la deuda funcional abierta en el slice 27 para que el alta de leads no persista combinaciones inconsistentes entre `clientId` y `projectId`.

## Problema que Resuelve

El slice 27 permitió vincular leads explícitamente a cliente y proyecto desde `/crm`, pero hoy `createLeadForDefaultTenant()` persiste ambos campos tal como llegan desde el formulario, sin validar si el `projectId` realmente pertenece al `clientId` seleccionado.

Eso deja un hueco de integridad justo antes de abrir chat contextual sobre entidades persistidas.

## Decision Arquitectonica

Antes de abrir conversaciones contextuales sobre leads, el contenedor comercial del lead debe ser internamente consistente.

La validación se hace server-side, no en el cliente, para que:

1. el formulario siga siendo una ayuda UX,
2. la integridad real no dependa del navegador,
3. cualquier consumidor futuro del método de creación herede la misma protección.

## Alcance del Corte

### Server-side

1. validar que el `projectId` exista para el tenant activo,
2. validar que el `clientId` exista para el tenant activo cuando se envíe,
3. si ambos existen, confirmar que el proyecto pertenezca al cliente,
4. si el proyecto existe y no se envía `clientId`, resolver automáticamente el `clientId` correcto del proyecto o rechazar según convenga al patrón actual,
5. rechazar combinaciones inconsistentes antes del `POST` a `leads`.

### UI minima

1. mantener el flujo de alta actual,
2. no agregar complejidad visual innecesaria,
3. si la validación falla, exponer un resultado controlado y no silencioso en la superficie de CRM si el patrón actual lo permite.

### Testing

1. agregar pruebas unitarias para combinaciones válidas,
2. agregar pruebas unitarias para combinaciones inválidas,
3. cubrir el caso con solo `projectId`,
4. cubrir el caso con `clientId` sin `projectId`.

## Criterios de Aceptacion

1. Un lead con `clientId` y `projectId` consistentes se persiste correctamente.
2. Una combinación inconsistente se rechaza antes de escribir en Supabase.
3. Si se envía solo `projectId`, el sistema mantiene una relación consistente y predecible.
4. El flujo de alta mínima sin vínculos sigue funcionando.
5. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. filtrado dinámico cliente → proyecto con JavaScript client-side,
2. edición posterior del vínculo desde otra pantalla,
3. chat contextual,
4. nuevas entidades de CRM.

## Riesgo que Evita

Evita abrir conversaciones, seguimientos y futuras automatizaciones sobre leads con contenedor comercial incoherente.

## Orden de Implementacion Recomendado

1. añadir helper server-side de resolución y validación del vínculo,
2. integrar la validación en `createLeadForDefaultTenant`,
3. ajustar la acción de `/crm` si hace falta para reflejar errores controlados,
4. ampliar tests,
5. validar build y checkpoint.