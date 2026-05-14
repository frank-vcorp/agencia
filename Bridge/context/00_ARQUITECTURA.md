# 00 Arquitectura de Bridge

**ID:** ARCH-20260504-11  
**Proyecto:** Bridge  
**Fecha:** 2026-05-04  
**Estado:** Base arquitectonica V1

## Proposito

Definir la arquitectura integral de Bridge como sistema puente multitenant para operar el piloto real del ecosistema de la agencia.

## Tesis de Arquitectura

Bridge es una plataforma web multitenant que conecta cuatro capas en un mismo sistema:

1. operador estrategico desde VS Code,
2. diseñador u operador creativo,
3. cliente,
4. agentes IA que leen, crean, actualizan y consultan conocimiento.

La arquitectura no se organiza primero por pantallas.

Se organiza por objetos compartidos, flujos operativos y contratos legibles por humanos y por agentes.

## Objetivo del Primer Release

El primer release debe permitir operar un cliente piloto de punta a punta dentro de Bridge sin depender de chats dispersos ni de contexto repartido entre herramientas.

## Principios Rectores

1. multitenant desde el dia uno,
2. API remota publica y segura para VS Code y agentes,
3. briefing conversacional que estructura informacion,
4. activos tipificados por catalogo y no por texto libre,
5. Firefly coordinado desde Bridge aunque la generacion viva fuera,
6. entidades operables por agentes,
7. conocimiento resumido de vuelta para agentes,
8. aprobacion humana para acciones sensibles.

## Arquitectura Logica

### Capa 1. Experiencia

Superficies de interfaz:

1. cabina del operador,
2. estacion creativa,
3. portal del cliente.

### Capa 2. Aplicacion

Servicios de negocio que resuelven:

1. tenancy y permisos,
2. proyectos y servicios,
3. briefing estructurado,
4. cotizaciones,
5. activos y prompts,
6. comentarios,
7. mini CRM,
8. estadisticas,
9. trazabilidad y aprobaciones.

### Capa 3. Integracion para Agentes

Contratos remotos para:

1. crear entidades,
2. consultar entidades,
3. pedir resumenes de contexto,
4. sincronizar trabajo desde VS Code,
5. consumir catalogos validos.

### Capa 4. Inteligencia

Motores IA propuestos:

1. Claude para briefing estructurado,
2. IA asistente desde VS Code para generar briefs, cotizaciones, prompts y selecciones,
3. Firefly como herramienta creativa externa coordinada por el flujo de activos.

### Capa 5. Datos

Persistencia de entidades, tenant, archivos livianos, referencias externas y conocimiento resumido.

## Stack Recomendado

1. Next.js con TypeScript,
2. Tailwind CSS,
3. Supabase Postgres,
4. Supabase Auth,
5. RLS por tenant,
6. Supabase Storage,
7. API HTTPS para agentes,
8. Google Drive como soporte gradual para archivos pesados.

## Modelo de Identidad y Autorizacion para Agentes

Bridge V1 debe distinguir claramente entre actor humano, actor tecnico y actor efectivo.

### Tipos de actor

1. usuario humano,
2. agente de servicio,
3. integracion externa,
4. cliente autenticado.

### Regla de identidad

Toda accion remota debe registrar:

1. actor tecnico que ejecuta,
2. actor efectivo en cuyo nombre actua,
3. tenant objetivo,
4. origen de la sesion,
5. permiso aplicado,
6. necesidad o no de aprobacion.

### Regla de delegacion

Un agente no debe heredar acceso total solo por existir.

Su alcance debe resolverse por:

1. tenant,
2. entidad,
3. operacion permitida,
4. contexto de impersonacion controlada.

## Matriz Base de Aprobaciones

Las acciones sensibles de V1 deben resolverse con aprobacion explicita por entidad.

### Brief

1. crear: operador o agente,
2. consolidar: operador,
3. responder: cliente,
4. cierre de brief vigente: operador.

### Cotizacion

1. borrador: operador o agente,
2. marcar version vigente: operador,
3. aceptar comercialmente: cliente,
4. cerrar administrativamente: operador.

### Activo

1. crear activo: operador o agente,
2. producir version creativa: diseñador,
3. aprobar creativamente: diseñador,
4. aprobar final operativamente: operador,
5. aprobacion visible para cliente cuando aplique: cliente.

### Conocimiento derivado

1. generacion automatica: sistema o agente,
2. uso interno normal: permitido,
3. uso para accion sensible: requiere validacion del operador si cambia decisiones visibles.

## Politica de Conocimiento Derivado

El conocimiento derivado no sustituye a los datos fuente.

Es una capa resumida y regenerable.

### Regla de frescura

Debe regenerarse cuando cambie alguna de estas entidades:

1. brief,
2. cotizacion vigente,
3. activo en estado relevante,
4. lead,
5. comentario de decision,
6. estado de proyecto.

### Regla de uso

1. los agentes pueden consultar contexto derivado por defecto,
2. si necesitan detalle fino, pueden consultar la entidad fuente,
3. la fuente de verdad sigue siendo la entidad primaria,
4. el resumen derivado debe indicar fecha de generacion y version de origen.

## Politica de Archivos y Evidencias

Bridge V1 debe separar archivo final, archivo intermedio y referencia externa.

### Fuente de verdad por tipo

1. metadatos, estados y aprobaciones viven en Bridge,
2. archivos livianos pueden vivir en Bridge Storage,
3. archivos pesados pueden referenciarse en Google Drive,
4. la referencia del activo vigente siempre se resuelve desde Bridge.

### Clasificacion operativa

1. evidencia intermedia,
2. version candidata,
3. version aprobada por diseñador,
4. version final aprobada,
5. archivo publicado o entregado.

### Regla de reemplazo

Ningun archivo debe sobrescribirse sin conservar historial de version y autor.

## Modulos de Dominio

### 1. Tenancy y acceso

Resuelve:

1. tenant,
2. usuarios,
3. membresias,
4. roles,
5. alcance por entidad.

### 2. Clientes y proyectos

Resuelve:

1. datos del cliente,
2. proyectos activos,
3. estado general,
4. responsables,
5. actividad.

### 3. Briefing estructurado

Resuelve:

1. conversacion,
2. preguntas y respuestas,
3. extraccion de campos,
4. faltantes,
5. resumen de brief.

### 4. Cotizaciones

Resuelve:

1. versiones,
2. vigente,
3. estado administrativo,
4. historial,
5. resumen comercial.

### 5. Catalogo y activos

Resuelve:

1. aplicativos,
2. tipos de pieza,
3. placements,
4. formatos,
5. activos creados,
6. presets,
7. referencias,
8. versiones.

### 6. Prompts

Resuelve:

1. prompt por activo,
2. restricciones,
3. referencias,
4. version vigente,
5. salida para Firefly.

### 7. Comentarios y decisiones

Resuelve:

1. comentarios contextuales,
2. hilos por entidad,
3. decisiones,
4. observaciones privadas o visibles.

### 8. Mini CRM

Resuelve:

1. leads,
2. operacion solicitada,
3. estado,
4. comentarios,
5. seguimiento minimo.

### 9. Estadisticas

Resuelve:

1. resumen visible,
2. fecha de actualizacion,
3. fuente,
4. indicadores simples por cliente.

### 10. Trazabilidad

Resuelve:

1. auditoria,
2. origen humano o agente,
3. historial de cambios,
4. aprobaciones.

### 11. Conocimiento derivado

Resuelve:

1. contexto de cliente,
2. contexto de proyecto,
3. contexto de activo,
4. contexto comercial,
5. siguiente accion sugerida.

### 12. Comunicacion Transaccional (MCT)

Resuelve:

1. aviso automatico al cliente al ser creado (portal + acceso),
2. aviso automatico al operador cuando el brief esta completo,
3. aviso automatico al cliente cuando la cotizacion esta vigente,
4. aviso automatico al cliente cuando su activo esta entregado.

Canal V1: email transaccional via proveedor dedicado del MCT. Decision operativa vigente del piloto: SendGrid. WhatsApp se mantiene como canal secundario click-to-send.

Principio rector: Bridge dispara el aviso. No es responsabilidad del operador.

Ver SPEC-09 para especificacion completa.

### 13. Capa Local de Contexto (VS Code)

Resuelve:

1. copias .md de briefs, propuestas y prompts de produccion en el workspace de VS Code,
2. consulta offline sin invocar al agente ni conectarse a Bridge,
3. artefactos de trabajo local generados automaticamente por las herramientas MCP.

Estructura: `context/clientes/[slug]/brief.md`, `propuesta.md`, `prompts-produccion.md`.

Principio rector: Bridge es la fuente de verdad. Las copias locales son artefactos
de trabajo regenerables — no reemplazan a Supabase. No se versionan en git.

Ver SPEC-10 para especificacion completa.

## Flujos Arquitectonicos Criticos

### Flujo A. Brief a estructura

1. operador o cliente conversa,
2. Claude estructura,
3. Bridge guarda campos,
4. agentes pueden consultar el resumen.

### Flujo B. Instruccion a activo

1. agente desde VS Code propone una pieza,
2. Bridge valida contra catalogo,
3. se crea el activo con preset,
4. se adjuntan referencias y prompt.

### Flujo C. Produccion creativa

1. diseñador entra a un activo,
2. consume contexto,
3. produce en Firefly,
4. Bridge recibe resultado y decision.

### Flujo D. Revision y entrega

1. operador revisa,
2. cliente valida si aplica,
3. se conserva historial,
4. el activo queda trazado.

### Flujo E. Seguimiento comercial

1. entran leads,
2. operador revisa,
3. cliente ve lo habilitado,
4. agentes consultan contexto comercial resumido.

### Flujo F. Onboarding y comunicacion automatica

1. agente crea cliente en Bridge desde VS Code via MCP,
2. Bridge dispara MCT automaticamente con acceso al portal del cliente,
3. cliente llena brief conversacional en su portal,
4. Bridge detecta brief completo y dispara MCT al operador,
5. agente lee brief via MCP y guarda copia local en VS Code,
6. agente genera propuesta usando la copia local del brief,
7. agente escribe cotizacion en Bridge via MCP y guarda copia local,
8. Bridge dispara MCT automaticamente con la cotizacion al cliente.

### Flujo G. Copias locales y flujo sin conexion

1. cada operacion MCP que lee datos de cliente genera copia .md local,
2. el operador puede consultar briefs, propuestas y prompts en VS Code sin invocar al agente,
3. si Bridge no esta disponible, el operador trabaja con las copias locales,
4. al reconectarse, el agente puede sincronizar el estado actualizando las copias.

## Riesgos de Arquitectura a Controlar

1. mezclar demasiado pronto UI humana con contratos de agentes,
2. no tipificar bien los activos,
3. dejar el multitenancy como capa tardia,
4. usar chat sin estructura,
5. depender de integraciones profundas antes de validar flujo,
6. no separar identidad tecnica de identidad efectiva,
7. usar conocimiento derivado sin politica de frescura,
8. perder cadena de custodia entre archivo final y evidencia intermedia.

## Decision Ejecutiva

Bridge V1 ya tiene suficiente definicion para pasar a diseño de datos, contratos de integracion y roadmap de construccion.