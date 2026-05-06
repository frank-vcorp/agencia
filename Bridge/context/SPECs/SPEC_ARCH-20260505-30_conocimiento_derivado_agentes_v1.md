# SPEC ARCH-20260505-30

## Titulo

Conocimiento derivado utilizable por agentes V1

## Estado

Cerrado

## Fecha

2026-05-05

## Objetivo

Exponer una primera capa de conocimiento derivado sobre objetos vivos de Bridge para que operadores y agentes consulten el estado operativo sin reconstruir manualmente el contexto desde múltiples pantallas.

## Problema que Resuelve

Bridge ya tiene fuente primaria persistida para:

1. briefs,
2. leads,
3. cotizaciones,
4. activos,
5. conversación contextual mínima.

Pero todavía no ofrece una lectura derivada compacta y reusable para handoffs, contexto remoto o trabajo de agentes sobre el tenant activo.

## Decision Arquitectonica

El conocimiento derivado no reemplaza la fuente primaria.

Debe ser:

1. resumido,
2. trazable a entidades reales,
3. fresco o con marca de frescura,
4. reutilizable por UI y por agentes.

## Alcance del Corte

### Modelo derivado mínimo

1. resumen por entidad operativa,
2. marca de actualización o frescura,
3. referencias a objeto fuente,
4. “siguiente acción” o estado operativo resumido cuando aplique.

### Integración mínima

1. reutilizable desde superficie humana,
2. reutilizable desde contexto para agentes,
3. construido desde datos vivos del tenant activo.

## Criterios de Aceptacion

1. Existe un resumen derivado reutilizable para al menos `lead`, `brief`, `quotation` y `asset`.
2. Cada resumen conserva referencia clara a la fuente primaria.
3. El sistema indica frescura o timestamp del dato derivado.
4. La lectura derivada puede consumirse sin romper la UI existente.
5. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. IA generativa automática,
2. predicción comercial,
3. bandeja global conversacional,
4. sincronización con canales externos.

## Riesgo que Evita

Evita que cada agente tenga que releer múltiples superficies completas para reconstruir el estado operativo del tenant.

## Orden de Implementacion Recomendado

1. definir contrato de snapshot derivado,
2. construir resumenes desde objetos vivos,
3. exponerlos en una superficie o contexto reusable,
4. validar trazabilidad y frescura,
5. cerrar con tests y checkpoint.