# SPEC ARCH-20260506-51

## Titulo

Cierre final del activo con comparacion, aprobacion cliente y analytics

## Estado

Planificado

## Fecha

2026-05-06

## Objetivo

Cerrar los ultimos vacios honestos visibles en la ficha del activo creativo para que Bridge deje de presentar el activo como una pieza aun incompleta y lo convierta en una unidad cerrada de produccion, revision, aprobacion y lectura historica minima.

## Problema que Resuelve

El activo ya resuelve:

1. prompt y contexto,
2. propuestas persistentes,
3. decision operativa interna,
4. evidencia real con upload,
5. miniatura y dimensiones para imagenes.

Pero todavia quedan tres huecos visibles:

1. `proposal_comparison` — no hay comparacion visual real entre propuestas,
2. `client_approval` — la aprobacion final del cliente no vive en la ficha,
3. `analytics_per_asset` — no hay historial minimo del comportamiento del activo.

Mientras estos tres gaps sigan visibles, el activo se siente avanzado pero no completamente cerrado.

## Decision Arquitectonica

Antes de pasar a cualquier nueva superficie, Bridge debe cerrar el activo por completo.

Este corte final del activo debe agregar tres capacidades:

1. comparacion visual basica entre propuestas,
2. aprobacion final del cliente dentro del mismo activo,
3. lectura historica compacta por activo.

La solucion debe mantenerse minima y honesta. No se busca construir un DAM complejo ni una suite analitica pesada. Se busca cerrar la ficha como unidad de negocio visible.

## Alcance del Corte

### 1. Comparacion visual de propuestas

Si el activo tiene propuesta principal y alternativa con evidencia de imagen, la ficha debe mostrar una comparacion visual minima y clara:

1. vista lado a lado o bloque comparable,
2. nombre de cada propuesta,
3. herramienta usada,
4. dimensiones y peso,
5. etiqueta de principal versus alternativa.

Si la evidencia no es imagen, degradar con honestidad sin romper la ficha.

### 2. Aprobacion final del cliente

La ficha del activo debe poder registrar una decision final del cliente, al menos con:

1. pendiente de aprobacion cliente,
2. aprobado por cliente,
3. rechazado o requiere cambios,
4. comentario corto opcional,
5. timestamp de la decision.

No se exige login final del cliente en este corte; puede ser registro operativo dentro de Bridge mientras se cierra la superficie Cliente.

### 3. Analytics minimos por activo

La ficha debe exponer una lectura historica corta del activo, al menos con:

1. fecha de creacion,
2. cantidad de propuestas registradas,
3. cantidad de evidencias subidas,
4. ultima actividad,
5. tiempo transcurrido hasta aprobacion interna o cliente si ya existe.

No se busca una grafica compleja; basta un resumen historico claro y reutilizable.

## Contrato Minimo Esperado

La capa reusable del activo debe enriquecerse con al menos:

1. `comparisonView`,
2. `clientApproval`,
3. `assetAnalytics`,
4. `gaps` actualizado idealmente vacio para la ficha del activo.

## Criterios de Aceptacion

1. La ficha compara visualmente propuestas cuando hay evidencias de imagen.
2. La ficha permite registrar y mostrar decision final del cliente.
3. La ficha muestra resumen historico minimo por activo.
4. Los tres vacios honestos remanentes desaparecen del bloque del activo.
5. La UI degrada bien cuando falten datos o no aplique comparacion visual.
6. Build y tests pasan al implementarse.

## Fuera de Alcance de Este Corte

1. login final del cliente,
2. comentarios largos del cliente tipo chat completo,
3. analytics avanzados de performance por canal,
4. versionado complejo con mas de dos propuestas visuales simultaneas,
5. integracion automatica con Adobe APIs.

## Dependencias

1. SPEC 45 para la ficha detallada del activo,
2. SPEC 46 para propuestas persistentes y decision operativa,
3. SPEC 47 para evidencias reales,
4. IMPL-20260506-49 y ARCH-20260506-50 para miniatura, dimensiones y signed URLs corregidas.

## Orden de Implementacion Recomendado

1. resolver comparacion visual minima desde evidencias ya existentes,
2. agregar persistencia minima de aprobacion cliente por activo,
3. derivar analytics compactos desde activo, propuestas, evidencias y aprobaciones,
4. integrar todo en `/activos/[id]`,
5. remover los gaps restantes del bloque de vacios honestos.