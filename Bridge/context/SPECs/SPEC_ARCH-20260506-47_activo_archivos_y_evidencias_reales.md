# SPEC ARCH-20260506-47

## Titulo

Activo con archivos y evidencias reales

## Estado

Planificado

## Fecha

2026-05-06

## Objetivo

Cerrar el principal hueco material del activo creativo para que el flujo Bridge -> Adobe -> Bridge no termine solo en notas o registros estructurados, sino tambien en evidencias reales subidas a la ficha del activo.

## Problema que Resuelve

El corte 46 ya resolvio:

1. propuestas persistentes,
2. propuesta principal versus alternativa,
3. decision operativa interna,
4. trazabilidad al prompt origen.

Pero el activo todavia no puede recibir el entregable real del disenador.

Eso deja un hueco importante:

1. no se pueden subir archivos de propuesta,
2. no existe evidencia visual o descargable dentro del activo,
3. la devolucion desde Adobe a Bridge sigue incompleta,
4. la revision operativa no puede apoyarse en una pieza real dentro de la ficha.

Mientras no exista evidencia real, el activo sigue siendo una ficha correcta pero todavia no completamente cerrada como unidad de trabajo creativo.

## Decision Arquitectonica

Antes de abrir Cliente, Bridge debe permitir que el activo contenga la evidencia real del trabajo creativo.

La ficha del activo debe poder mostrar no solo el registro de la propuesta, sino tambien el archivo o evidencia asociada a esa propuesta.

Este corte no busca comparador visual avanzado ni aprobacion cliente final. Busca el minimo operativo para que el entregable exista dentro de Bridge con honestidad y trazabilidad.

## Alcance del Corte

### 1. Carga de archivos por propuesta

Cada propuesta del activo debe poder asociarse al menos a una evidencia real con:

1. nombre de archivo,
2. tipo MIME o extension,
3. URL o referencia de almacenamiento,
4. fecha de carga,
5. actor que la subio si existe ese dato.

### 2. Evidencia visible en la ficha del activo

La vista del activo debe mostrar por propuesta:

1. si tiene evidencia o no,
2. nombre del archivo,
3. accion para abrir o descargar,
4. estado claro cuando aun no exista archivo.

### 3. Devolucion mas real desde Disenador

El flujo desde el workspace del disenador o desde la ficha del activo debe permitir que la propuesta vuelva con una evidencia real, no solo con nota.

Puede ser una carga minima V1, sin galeria avanzada.

### 4. Vacios honestos actualizados

Al cerrar este corte, el gap de `file_upload` debe desaparecer de los vacios honestos.

Los demas gaps pueden mantenerse si siguen fuera de alcance:

1. comparador visual avanzado,
2. aprobacion final del cliente,
3. analytics historicos por activo.

## Contrato Minimo Esperado

La capa reusable del activo debe enriquecerse con al menos:

1. `proposalDrafts` con evidencia asociada cuando exista,
2. `proposalEvidence` por propuesta,
3. `hasEvidence`,
4. `evidenceUrl`,
5. `evidenceFileName`,
6. `gaps` actualizados.

## Criterios de Aceptacion

1. El usuario puede subir una evidencia real a una propuesta del activo.
2. La ficha del activo muestra si la propuesta ya tiene archivo asociado.
3. La propuesta puede abrirse o descargarse desde la ficha.
4. El flujo Bridge -> Adobe -> Bridge queda mas completo y tangible.
5. El gap de `file_upload` desaparece de vacios honestos.
6. No se inventa comparador visual avanzado ni aprobacion cliente final.
7. Build y tests pasan al implementarse.

## Fuera de Alcance de Este Corte

1. comparador visual lado a lado,
2. aprobacion final del cliente,
3. versionado pesado de multiples archivos por propuesta,
4. analytics historicos,
5. integracion automatica con Adobe APIs.

## Dependencias

1. SPEC 45 para la ficha detallada del activo,
2. SPEC 46 para propuestas persistentes y decision operativa,
3. almacenamiento operativo disponible en Supabase o capa equivalente ya vinculada al proyecto.

## Orden de Implementacion Recomendado

1. definir almacenamiento y referencia minima de archivos por propuesta,
2. extender persistencia de propuestas con evidencia,
3. agregar upload y visualizacion minima en `/activos/[id]`,
4. conectar devolucion de evidencia con el flujo actual del disenador,
5. actualizar vacios honestos y validar el slice completo.