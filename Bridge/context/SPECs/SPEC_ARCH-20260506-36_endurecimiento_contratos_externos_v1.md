# SPEC ARCH-20260506-36

## Titulo

Endurecimiento de contratos externos V1

## Estado

Cerrado

## Fecha

2026-05-06

## Objetivo

Refinar la capa de contratos externos derivada de Bridge para que ofrezca una estructura más consistente, auditable y estable para futuros consumidores remotos, sin abrir todavía una API pública final ni introducir nuevas fuentes o queries.

## Problema que Resuelve

Bridge ya expone contratos externos mínimos y capas derivadas superiores, pero todavía hay margen para endurecer su consistencia estructural y sus referencias trazables antes de declarar la V1 realmente lista para consumidores remotos más estrictos.

## Decision Arquitectonica

El endurecimiento debe ocurrir sobre la capa derivada existente de `externalContracts`, preservando compatibilidad razonable con la inspección humana y reforzando estabilidad semántica.

Debe ser:

1. derivado,
2. consistente,
3. trazable,
4. reusable,
5. compatible con futuras integraciones.

## Alcance del Corte

### Reforzamiento mínimo

1. revisar y endurecer shape, referencias y metadatos mínimos de contratos externos,
2. mantener alineación con tenant, entidad, versión y fuente,
3. reforzar pruebas del contrato derivado,
4. evitar romper la superficie actual de inspección.

### Integración mínima

1. visible o inspeccionable desde `/contexto-agentes`,
2. reusable server-side,
3. sin autenticación distribuida nueva,
4. sin escritura remota,
5. sin API pública final.

## Criterios de Aceptacion

1. Los contratos externos quedan más consistentes y explícitos para consumo remoto.
2. La capa endurecida no depende del JSX.
3. La UI actual no se rompe.
4. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. API pública final,
2. versionado mayor de contratos,
3. webhooks,
4. permisos distribuidos multiagente.

## Riesgo que Evita

Evita declarar una V1 lista cuando la capa contractual todavía es demasiado laxa para integraciones remotas más estrictas o para una futura API estable.

## Orden de Implementacion Recomendado

1. revisar la forma actual de `externalContracts`,
2. endurecer metadatos y consistencia sin abrir nuevas queries,
3. actualizar inspección o pruebas si hace falta,
4. validar build y tests,
5. cerrar con checkpoint y publicación.