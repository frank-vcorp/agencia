# Roadmap y Micro-Sprints V1

**ID:** ARCH-20260504-11  
**Proyecto:** Bridge  
**Fecha:** 2026-05-04  
**Estado:** Plan base de ejecucion

## Objetivo

Traducir la arquitectura de Bridge V1 a una secuencia ordenada de trabajo para que la construccion pueda avanzar sin improvisacion.

## Estrategia de Ejecucion

La construccion de Bridge debe avanzar de adentro hacia afuera:

1. modelo de datos,
2. contratos de integracion,
3. logica de dominio,
4. superficies de interfaz,
5. refinamiento operativo.

## Corte P0 y P1

### P0. Piloto minimo obligatorio

Debe entrar para considerar que Bridge V1 es demostrable:

1. multitenancy,
2. identidad y autorizacion base para agentes,
3. briefing estructurado con Claude,
4. catalogo de activos como contrato,
5. prompts por activo,
6. cotizaciones versionadas,
7. cabina del operador,
8. estacion creativa,
9. portal del cliente minimo,
10. trazabilidad y aprobaciones,
11. contexto derivado para agentes.

### P1. Extension inmediata

Puede moverse despues del piloto si bloquea el release:

1. mini CRM completo,
2. estadisticas resumidas avanzadas,
3. integracion mas profunda con Drive,
4. refinamientos de UI no criticos,
5. catalogo secundario de aplicativos.

## Fase 1. Fundacion del Sistema

Objetivo: dejar lista la columna vertebral multitenant y los contratos base.

### MICRO-SPRINT 1: Modelo de Datos Multitenant

**Entregable demostrable:** esquema inicial de entidades, relaciones y aislamiento por tenant.

Tareas:

1. definir tenant, user, membership y roles,
2. definir cliente y proyecto,
3. definir brief y resumen de brief,
4. definir cotizacion y version,
5. definir activo, prompt y preset,
6. definir comentario, lead, estadistica y activity log,
7. definir actor tecnico, actor efectivo y delegacion por tenant.

### MICRO-SPRINT 2: Contratos para Agentes y VS Code

**Entregable demostrable:** contrato claro de lectura y escritura remota para agentes.

Tareas:

1. definir operaciones minimas por entidad,
2. definir payloads estructurados,
3. definir endpoints de contexto,
4. definir reglas de autenticacion y origen,
5. definir respuestas resumidas para agentes,
6. definir operaciones permitidas por actor.

## Fase 2. Nucleo Operativo

Objetivo: construir lo minimo para operar briefing, cotizacion y activos.

### MICRO-SPRINT 3: Briefing Estructurado con Claude

**Entregable demostrable:** flujo donde una conversacion termina en campos estructurados y resumen reutilizable.

Tareas:

1. definir preguntas base,
2. definir extraccion de campos,
3. definir validacion de faltantes,
4. definir resumen consumible por agentes,
5. definir estado del brief.

### MICRO-SPRINT 4: Catalogo de Activos y Presets

**Entregable demostrable:** activo creado desde seleccion guiada por aplicativo, tipo, placement y formato.

Tareas:

1. cerrar catalogo V1,
2. definir IDs canonicos y enums estables,
3. definir combinaciones validas,
4. definir campos guiados por activo,
5. definir presets por plataforma,
6. definir versionado de prompts,
7. definir tratamiento explicito para copy, guion, landing section y documento.

### MICRO-SPRINT 5: Cotizaciones Versionadas

**Entregable demostrable:** cliente puede ver una cotizacion vigente y el operador conserva historial.

Tareas:

1. definir estado administrativo,
2. definir version activa,
3. definir historial,
4. definir resumen comercial,
5. definir permisos de visibilidad,
6. definir aprobaciones por estado.

## Fase 3. Superficies por Rol

Objetivo: convertir el nucleo en experiencia usable para los tres actores.

### MICRO-SPRINT 6: Cabina del Operador

**Entregable demostrable:** el operador visualiza clientes, proyectos, aprobaciones y activos desde una sola vista.

Tareas:

1. tablero general,
2. acceso a briefs,
3. acceso a cotizaciones,
4. acceso a mini CRM,
5. disparo de acciones para agentes.

### MICRO-SPRINT 7: Estacion Creativa

**Entregable demostrable:** el diseñador consulta contexto del activo, sube resultados y registra decisiones.

Tareas:

1. vista de activos asignados,
2. contexto del brief,
3. prompt vigente,
4. referencias,
5. versionado y decision creativa.

### MICRO-SPRINT 8: Portal del Cliente

**Entregable demostrable:** el cliente entra a su espacio, responde briefing, ve cotizacion y sube contexto.

Tareas:

1. acceso por cliente,
2. briefing visible,
3. carga de archivos,
4. cotizacion vigente,
5. comentarios y visibilidad basica.

## Fase 4. Operacion Compartida

Objetivo: cerrar los flujos de seguimiento, estadistica y conocimiento.

### MICRO-SPRINT 9: Mini CRM y Comentarios Contextuales

**Entregable demostrable:** seguimiento de leads y comentarios anclados a entidades.

Tareas:

1. leads y estados,
2. comentarios por entidad,
3. trazabilidad,
4. vistas de seguimiento.

### MICRO-SPRINT 10: Estadisticas Resumidas y Contexto para Agentes

**Entregable demostrable:** operador y cliente ven resumenes, y los agentes consumen contexto sintetizado.

Tareas:

1. resumen por cliente,
2. resumen por proyecto,
3. contexto comercial,
4. endpoints de conocimiento,
5. siguiente accion sugerida,
6. politica de regeneracion e invalidez del conocimiento derivado.

## Fase 5. Endurecimiento

Objetivo: dejar Bridge listo para piloto controlado.

### MICRO-SPRINT 11: Permisos, Auditoria y Aprobaciones

**Entregable demostrable:** reglas de acceso, trazabilidad y aprobacion funcionando.

Tareas:

1. cerrar roles base,
2. cerrar visibilidad por tenant,
3. registrar origen humano o agente,
4. aprobar acciones sensibles,
5. revisar historial de cambios,
6. cerrar matriz de aprobaciones por entidad.

### MICRO-SPRINT 12: Piloto End-to-End

**Entregable demostrable:** un cliente piloto opera dentro de Bridge de inicio a fin.

Tareas:

1. crear tenant piloto,
2. crear usuario operador,
3. crear usuario diseñador,
4. crear usuario cliente,
5. correr flujo completo,
6. registrar fricciones y ajustes.

## Regla de Ejecucion

No se debe empezar interfaz rica sin cerrar antes:

1. datos,
2. contratos,
3. presets,
4. permisos.

## Recomendacion Ejecutiva

Si la construccion se va a delegar en agentes durante varias horas, el mejor orden es:

1. Micro-Sprint 1,
2. Micro-Sprint 2,
3. Micro-Sprint 3,
4. Micro-Sprint 4.

Ese bloque deja lista la base que mas decisiones irreversibles concentra.