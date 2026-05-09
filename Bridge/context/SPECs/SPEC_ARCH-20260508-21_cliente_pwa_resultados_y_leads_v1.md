# SPEC ARCH-20260508-21

## Titulo

Cliente PWA ligera con revisiones, resultados por canal y leads resumidos

## Estado

Planificado

## Fecha

2026-05-08

## Objetivo

Convertir `/cliente` en una aplicacion progresiva instalable, ligera y mobile-first para que el cliente pueda entender el estado de su proyecto, revisar pendientes, ver resultados resumidos de sus canales y confirmar que los contactos generados ya estan entrando al mini CRM sin exponerse a la complejidad interna de Bridge.

## Problema que Resuelve

La SPEC 42 ya definio que el cliente necesita una superficie ligera y guiada, pero todavia falta aterrizar el corte real con decisiones de producto cerradas.

Hoy no esta definido con suficiente precision:

1. que canales entran primero,
2. que parte del mini CRM vera el cliente,
3. que acciones podra ejecutar,
4. que significa que el modulo sea PWA,
5. como se vera el estado del brief sin rehacer el flujo ya resuelto.

Si este corte se implementa sin esas decisiones cerradas, `/cliente` corre el riesgo de volverse denso, ambiguo o demasiado grande para cerrarse rapido.

## Decision Arquitectonica

`/cliente` no sera un backoffice ni una copia simplificada de Operador o CRM.

Sera una PWA ligera de seguimiento comercial con 5 bloques visibles:

1. `queSigue`,
2. `estadoDelProyecto`,
3. `revisiones`,
4. `resultadosPorCanal`,
5. `leadsYSeguimiento`.

Este corte no incluye asistente IA.

El modulo debe reutilizar senal viva ya existente en Bridge y traducirla a lenguaje claro para cliente. No debe inventar una verdad paralela ni exponer pipeline interno del equipo.

## Alcance del Corte

### 1. PWA instalable y mobile-first

El modulo Cliente debe nacer compatible con instalacion como app progresiva.

Debe incluir como minimo:

1. manifest instalable,
2. nombre e icono propios,
3. layout mobile-first,
4. navegacion corta y clara,
5. sesion persistente y experiencia rapida en telefono.

No incluye en este corte:

1. push notifications,
2. offline real,
3. sincronizacion avanzada en segundo plano.

### 2. Bloque `queSigue`

El cliente debe ver arriba de todo una sola accion principal o una confirmacion clara de que no falta nada de su lado.

Ejemplos validos:

1. revisar propuesta,
2. aprobar cotizacion,
3. corregir un dato del proyecto,
4. no necesitamos nada mas de ti por ahora.

### 3. Bloque `estadoDelProyecto`

Debe resumir el avance sin lenguaje tecnico.

El brief ya existente se muestra solo como contexto del proyecto, no como un flujo nuevo.

Las 3 etapas visibles para cliente deben traducirse a lenguaje simple:

1. `Entendimos tu necesidad`,
2. `Definimos los detalles`,
3. `Validamos la solucion recomendada`.

Estados visibles permitidos:

1. completado,
2. en revision,
3. pendiente de aclaracion.

### 4. Bloque `revisiones`

El cliente puede:

1. aprobar,
2. rechazar,
3. pedir cambios.

El cliente no puede en este corte:

1. editar pipelines,
2. reasignar leads,
3. modificar configuraciones de campana,
4. abrir conversaciones libres de soporte.

### 5. Bloque `resultadosPorCanal`

El primer corte solo incluye estos canales:

1. Facebook,
2. Google Ads,
3. WhatsApp.

La lectura sera por canal, no por atribucion compleja por pieza o anuncio.

Cada canal debe poder mostrar una lectura corta tipo:

1. activo o no activo,
2. volumen de contactos o conversiones,
3. cambio reciente relevante,
4. si necesita atencion.

### 6. Bloque `leadsYSeguimiento`

Debe leer desde el mini CRM ya existente, pero solo mostrar una vista resumida para cliente.

Campos visibles por lead o fila resumida:

1. canal,
2. nombre completo,
3. asunto,
4. etiquetas,
5. fecha y hora.

No se deben mostrar:

1. notas internas,
2. scoring interno,
3. comentarios operativos del equipo,
4. pipeline completo del CRM.

## Contrato Minimo Esperado

La capa reusable de Cliente debe exponer al menos:

1. `nextClientAction`,
2. `projectStatusSummary`,
3. `reviewItems`,
4. `channelResultsSummary`,
5. `crmLeadSummary`,
6. `installabilityState`,
7. `sourceRefs`.

## Criterios de Aceptacion

1. `/cliente` puede instalarse como PWA y funciona bien en movil.
2. La portada responde rapido que sigue y si el cliente debe actuar.
3. El brief se muestra como contexto claro de 3 momentos, sin rehacer el flujo conversacional.
4. El cliente puede aprobar, rechazar o pedir cambios sobre items de revision.
5. Los resultados visibles del corte se limitan a Facebook, Google Ads y WhatsApp.
6. La lectura de resultados se muestra por canal y no promete atribucion avanzada.
7. El bloque de leads usa el mini CRM y muestra solo: canal, nombre completo, asunto, etiquetas, fecha y hora.
8. El modulo evita lenguaje interno de agencia y no se vuelve abrumador.

## Fuera de Alcance de Este Corte

1. asistente IA dentro de Cliente,
2. push notifications,
3. modo offline real,
4. atribucion avanzada por pieza o anuncio,
5. CRM completo para cliente,
6. soporte conversacional libre,
7. configuracion profunda de canales.

## Dependencias

1. SPEC 19 para el briefing persistido de 3 etapas,
2. SPEC 26, 27 y 29 para el mini CRM y su consistencia,
3. SPEC 37 y 38 para la senal viva comun por rol,
4. SPEC 42 como antecedente del portal cliente ligero,
5. los modulos actuales de briefs, activos, cotizaciones y CRM ya publicados.

## Orden de Implementacion Recomendado

1. crear capa reusable de datos para Cliente con bloques resumidos,
2. resolver layout mobile-first y manifest instalable,
3. construir portada con `queSigue`, `estadoDelProyecto` y `revisiones`,
4. agregar `resultadosPorCanal` con Facebook, Google Ads y WhatsApp,
5. agregar `leadsYSeguimiento` leyendo el mini CRM resumido,
6. validar densidad, claridad y cierre rapido del corte.