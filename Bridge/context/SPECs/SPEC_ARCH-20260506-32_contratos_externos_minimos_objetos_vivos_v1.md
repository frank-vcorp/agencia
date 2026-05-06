# SPEC ARCH-20260506-32

## Titulo

Contratos externos minimos sobre objetos vivos V1

## Estado

Cerrado

## Fecha

2026-05-06

## Objetivo

Definir una capa mínima y estable de contratos externos sobre los objetos vivos priorizados de Bridge para habilitar consumo remoto controlado sin depender de la representación visual de la cabina.

## Problema que Resuelve

Bridge ya dispone de snapshot derivado y handoffs remotos por entidad, pero esos handoffs todavía viven demasiado cerca de la superficie humana.

Falta aislar:

1. payloads estables para consumo externo,
2. campos mínimos obligatorios por entidad,
3. una separación clara entre contrato externo, handoff remoto y fuente primaria,
4. una base consistente para futuras integraciones o agentes remotos con tenancy reforzado.

## Decision Arquitectonica

El contrato externo debe derivarse del handoff remoto y seguir siendo de solo lectura.

Debe ser:

1. pequeño,
2. estable,
3. tipado,
4. trazable,
5. desacoplado de la UI humana.

## Alcance del Corte

### Contrato mínimo por entidad

1. contrato estable para `brief`, `lead`, `quotation` y `asset`,
2. campos mínimos de identidad, estado, fuente y frescura,
3. referencias al tenant y al contenedor operativo cuando aplique,
4. compatibilidad con la superficie `/contexto-agentes`.

### Integración mínima

1. reusable dentro del código sin depender del JSX,
2. listo para futuros endpoints o bridges remotos,
3. sin autenticación distribuida ni escritura remota en este corte.

## Criterios de Aceptacion

1. Existe un contrato externo mínimo y estable por cada entidad prioritaria.
2. Cada contrato conserva trazabilidad a handoff remoto y fuente primaria.
3. La UI actual sigue funcionando sin acoplar la lógica al layout.
4. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. endpoints públicos finales,
2. webhooks externos,
3. permisos multiagente,
4. ejecución remota de acciones.

## Riesgo que Evita

Evita que el consumo remoto termine leyendo HTML o estructuras visuales inestables como si fueran contratos de integración.

## Orden de Implementacion Recomendado

1. definir tipos mínimos de contrato externo,
2. derivarlos desde handoffs remotos existentes,
3. reutilizarlos en `/contexto-agentes`,
4. validar estabilidad de campos,
5. cerrar con tests, checkpoint y publicación.