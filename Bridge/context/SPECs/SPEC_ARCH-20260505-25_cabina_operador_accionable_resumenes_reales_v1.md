# SPEC ARCH-20260505-25

## Titulo

Cabina del operador accionable con resumenes reales V1

## Estado

Planificado

## Fecha

2026-05-05

## Objetivo

Convertir el dashboard principal de Bridge en una cabina del operador con datos reales del tenant y del `project` activo, donde cada resumen visible sirva para decidir y actuar sin depender de placeholders ni de lectura dispersa entre modulos.

## Problema que Resuelve

Bridge ya puede:

1. persistir briefs,
2. resolver identidad minima,
3. operar `client-project`,
4. mantener cotizaciones versionadas,
5. registrar activos operables ligados al contexto comercial.

Pero el dashboard principal todavia se comporta como una superficie informativa parcial.

El operador sigue entrando modulo por modulo para entender:

1. que proyecto esta activo,
2. si el brief sigue abierto o consolidado,
3. cual es la cotizacion vigente,
4. cuantos activos existen y en que estado van,
5. cual es la siguiente accion operativa mas obvia.

## Decision Arquitectonica

El siguiente corte debe implementar una cabina del operador acotada, no un modulo amplio de analitica ni un mini CRM completo.

La superficie debe leer directamente de las entidades ya estabilizadas y resolver un resumen operativo honesto del `tenant`, `client`, `project`, `brief`, `quotation` y `assets` activos.

## Alcance del Corte

### Resumenes reales obligatorios

1. mostrar tenant, client y `project` activos,
2. mostrar estado sintetico del brief mas reciente,
3. mostrar cotizacion vigente o ultima cotizacion util,
4. mostrar conteo y distribucion simple de activos por estado,
5. mostrar pendientes operativos minimos sin inventar datos.

### Accionabilidad minima

1. cada resumen debe apuntar a su modulo operativo,
2. la cabina debe dejar clara la siguiente accion recomendada,
3. la siguiente accion debe derivarse de reglas simples del estado real,
4. no debe depender todavia de una capa compleja de conocimiento derivado.

### Reglas de vacio

1. si falta brief, cotizacion o activos, la cabina debe decirlo de forma explicita,
2. no se permiten placeholders que parezcan datos reales,
3. los estados vacios deben llevar a la accion correcta para resolver el hueco.

## Criterios de Aceptacion

1. El dashboard principal deja de mostrar placeholders en la vista piloto.
2. El operador ve en una sola pantalla el contexto real del `project` activo.
3. La cabina resume brief, cotizacion y activos usando datos verdaderos de Supabase.
4. Cada bloque visible dirige al operador a una accion o modulo concreto.
5. La siguiente accion recomendada se calcula desde reglas trazables y simples.
6. Build y tests pasan.

## Fuera de Alcance de Este Corte

1. mini CRM completo,
2. estadisticas avanzadas por cliente o periodo,
3. conocimiento derivado regenerable para agentes,
4. reglas predictivas o scoring complejo,
5. automatizaciones avanzadas multiagente.

## Dependencias de Entrada

1. `clients` y `projects` deben seguir siendo la fuente del contenedor operativo,
2. la cotizacion vigente debe estar resoluble desde el `project` activo,
3. los activos deben exponer estado visible y vínculo comercial,
4. el shell actual debe permitir reemplazar placeholders sin romper navegacion.

## Orden de Implementacion Recomendado

1. cerrar contrato de datos del dashboard con fuentes reales,
2. implementar capa server-side de resumen operativo,
3. sustituir placeholders del dashboard por bloques accionables,
4. validar reglas de vacio y siguiente accion,
5. ejecutar build, tests y checkpoint.