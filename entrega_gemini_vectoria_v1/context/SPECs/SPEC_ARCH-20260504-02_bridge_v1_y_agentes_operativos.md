# SPEC ARCH-20260504-02

## Titulo

Bridge V1 funcional y arquitectura minima de agentes operativos para validar la agencia con un cliente interno o piloto

## Estado

Planificado

## Fecha

2026-05-04

## Objetivo

Definir una arquitectura funcional, simple y no final para Bridge y su capa de agentes, de forma que la agencia pueda operar un primer cliente interno o piloto real sin depender de un mosaico disperso de herramientas.

## Tesis Rectora

Bridge V1 no debe nacer como plataforma completa.

Debe nacer como sistema operativo minimo de la agencia.

La pregunta correcta no es si ya resuelve todo.

La pregunta correcta es si permite correr un cliente real de punta a punta con orden, trazabilidad y apoyo util de agentes.

Formula rectora:

**menos software ambicioso, mas operacion real que ya se puede usar.**

## Problema que Resuelve

Hoy la vision de Bridge es potente pero amplia.

Si se intenta construir completa desde el inicio, aparecen tres riesgos:

1. sobrediseño antes de validar el flujo real de la agencia,
2. automatizacion prematura de procesos todavia no estandarizados,
3. una plataforma demasiado compleja para el primer uso interno.

Esta SPEC busca evitar eso definiendo un Bridge V1 que sea:

1. operable,
2. pequeno,
3. trazable,
4. extensible,
5. validable con pocos usuarios.

## Principio de Producto

Bridge V1 debe actuar como el lugar unico donde la agencia puede:

1. registrar clientes y proyectos,
2. convertir notas y briefs en trabajo estructurado,
3. seguir el estado de produccion y aprobacion,
4. guardar contexto operativo util para humanos y agentes,
5. revisar que hizo cada agente y que decidio cada humano.

No debe intentar resolver en V1:

1. facturacion completa,
2. CRM empresarial complejo,
3. automatizacion omnicanal total,
4. portal avanzado para clientes,
5. motor completo de permisos multi tenant de nivel enterprise.

## Recorte Ejecutivo del Insumo Base

El insumo extraido contiene ideas valiosas, pero mezcla tres niveles distintos:

1. V1 operativa,
2. capacidades de expansion cercanas,
3. vision futura de plataforma completa.

Para proteger foco y velocidad, Bridge V1 queda recortado asi:

### Entra en V1

1. stack base con Next.js, Tailwind y Supabase,
2. modelo multitenant simple desde datos, sin complejidad enterprise de permisos,
3. mini CRM de friccion cero,
4. comentarios contextuales en clientes, proyectos y activos,
5. versionado simple de cotizaciones dentro del sistema,
6. integracion ligera con Google Drive por enlaces y metadatos,
7. trazabilidad de acciones humanas y de agentes.

### Entra solo si no rompe simplicidad

1. captura automatizada de leads por webhook,
2. renombrado automatico de activos,
3. panel de transparencia muy basico para cliente,
4. reglas semiautomaticas de alerta por saturacion.

### Se difiere fuera de V1

1. vault completo de credenciales y datos fiscales sensibles,
2. MFA especifica para visualizacion de secretos,
3. envio omnicanal desde agentes por WhatsApp y correo,
4. pausa automatica de campañas o control presupuestal,
5. sincronizacion profunda de Google Drive,
6. pattern library plenamente integrada como base viva de conocimiento.

## Traduccion Operativa del Mini CRM

El CRM de Bridge V1 no debe competir con un CRM comercial completo.

Debe resolver solo el flujo minimo para no perder leads y mantener visibilidad.

Campos minimos del lead:

1. prospecto,
2. WhatsApp o medio principal de contacto,
3. operacion solicitada,
4. comentarios,
5. estatus.

Estados minimos del lead:

1. nuevo,
2. contactado,
3. ganado,
4. perdido.

Regla de diseño:

**si agregar un campo no cambia una decision diaria, no entra en V1.**

## Resultado Visible Esperado

Al terminar Bridge V1, deberia ser posible hacer esto:

1. dar de alta un cliente o marca interna,
2. abrir un proyecto o servicio activo,
3. capturar un brief base,
4. pedirle a un agente que convierta ese brief en tareas y activos sugeridos,
5. operar el avance desde un tablero unico,
6. revisar entregables y aprobaciones,
7. consultar un resumen semanal del estado del cliente.

Si eso ya se puede hacer con un cliente interno real, la V1 cumple su objetivo.

## Usuario Inicial

La V1 debe diseñarse para un contexto muy simple:

1. un director o founder operador,
2. uno o dos usuarios internos adicionales,
3. uno a tres clientes maximo en piloto,
4. sin depender todavia de acceso directo del cliente a toda la plataforma.

## Decision de Enfoque

Bridge V1 debe ser:

**interno primero, cliente visible despues.**

Eso significa que en la primera version el sistema esta optimizado para operar mejor la agencia, no para impresionar con un portal complejo.

## Alcance Funcional de V1

### Modulo 1. Clientes

Debe permitir:

1. alta de cliente,
2. datos basicos de contacto,
3. tipo de servicio contratado,
4. estado general del cliente,
5. notas operativas.

Cuando aplique, el cliente puede tener leads asociados bajo el mini CRM operativo.

### Modulo 2. Proyectos y Servicios Activos

Cada cliente puede tener uno o varios proyectos activos.

Para V1, proyecto significa una unidad real de trabajo como:

1. lanzamiento,
2. presencia,
3. funnel,
4. contenido,
5. activo interno de la propia agencia.

Cada proyecto debe mostrar:

1. objetivo,
2. responsable,
3. estado,
4. fechas clave,
5. checklist basico,
6. resumen ejecutivo.

### Modulo 3. Briefs

Debe existir un brief estructurado y breve.

No un formulario eterno.

Solo lo suficiente para operar.

Campos minimos sugeridos:

1. negocio o marca,
2. oferta principal,
3. objetivo inmediato,
4. publico objetivo,
5. activos existentes,
6. restricciones,
7. siguiente accion deseada.

### Modulo 4. Tareas Operativas

Bridge V1 debe tener una cola de trabajo real.

La unidad de produccion no debe ser solo el proyecto.

Debe ser la tarea.

Cada tarea debe tener:

1. titulo,
2. tipo,
3. estado,
4. prioridad,
5. responsable,
6. fecha objetivo,
7. referencia al brief o proyecto,
8. salida esperada.

Estados minimos:

1. por hacer,
2. en progreso,
3. en revision,
4. bloqueada,
5. terminada.

### Modulo 5. Activos y Entregables

Bridge V1 debe separar tareas de activos.

Una tarea produce o modifica un activo.

Un activo puede ser:

1. copy,
2. landing,
3. guion,
4. imagen,
5. video,
6. propuesta,
7. documento,
8. enlace externo a Google Drive.

Cada activo debe guardar:

1. tipo,
2. version,
3. estado,
4. ubicacion,
5. fecha,
6. observaciones.

### Modulo 5.1 Comentarios Contextuales

Bridge V1 debe incluir comentarios editables y trazables.

No como chat general.

Si como notas pegadas al contexto correcto.

Los comentarios deben poder vivir al menos en:

1. leads,
2. proyectos,
3. activos,
4. cotizaciones.

Cada comentario debe guardar:

1. autor,
2. fecha,
3. texto,
4. entidad relacionada,
5. estado editable.

### Modulo 6. Aprobaciones

Toda accion sensible debe tener control humano.

V1 debe incluir una capa minima de aprobacion para:

1. entregables al cliente,
2. mensajes externos,
3. cambios de estado visibles,
4. versiones finales.

La regla es simple:

**el agente propone, el humano autoriza.**

### Modulo 6.1 Cotizaciones

Bridge V1 debe soportar cotizaciones como documento versionado simple.

No se busca un CPQ complejo.

Solo se necesita:

1. guardar versiones,
2. identificar la version vigente,
3. asociar la cotizacion al cliente,
4. registrar estado administrativo minimo,
5. dejar observaciones internas.

Estados administrativos minimos sugeridos:

1. pendiente,
2. facturado,
3. pagado.

### Modulo 7. Actividad y Trazabilidad

Cada cambio importante debe dejar rastro.

Bridge V1 debe registrar al menos:

1. quien hizo la accion,
2. si fue humano o agente,
3. que entidad cambio,
4. antes y despues del cambio cuando aplique,
5. fecha y hora.

## Arquitectura de Agentes para V1

La capa de agentes no debe comenzar con muchos agentes especializados.

Eso fragmenta demasiado pronto.

La recomendacion V1 es comenzar con tres agentes operativos claros.

### Agente 1. Intake y Brief

Funcion:

1. convertir notas libres en brief estructurado,
2. resumir contexto del cliente,
3. detectar faltantes,
4. proponer siguiente paso operativo.

No decide contratacion ni publica nada.

### Agente 2. Operaciones

Funcion:

1. convertir brief aprobado en lista de tareas,
2. sugerir prioridades,
3. generar checklist por proyecto,
4. producir resumen semanal,
5. detectar bloqueos operativos.

No reasigna responsables finales sin confirmacion humana.

### Agente 3. Produccion Asistida

Funcion:

1. proponer copy,
2. proponer prompts,
3. proponer guiones,
4. proponer estructura de landing,
5. generar variantes para trabajo interno.

No debe publicar ni marcar entregables como finales en automatico.

## Reglas de Seguridad Operativa para Agentes

1. los agentes no escriben directo a la base de datos sin pasar por la capa de aplicacion,
2. toda accion del agente debe quedar registrada en un log de ejecucion,
3. cualquier salida sensible requiere aprobacion humana,
4. no existe autonomia de publicacion en V1,
5. no existe autonomia presupuestal en V1,
6. no existe envio externo automatico en V1 sin aprobacion explicita.

## Arquitectura Tecnologica Recomendada

La arquitectura mas pragmatica para V1 es:

1. una sola aplicacion web en Next.js con TypeScript,
2. Supabase como capa de Postgres, autenticacion y storage,
3. API interna o route handlers para la capa de aplicacion,
4. proveedor de IA abstraido desde servidor,
5. almacenamiento mixto: assets livianos en storage y enlaces a Google Drive cuando el archivo viva fuera.

## Justificacion del Stack

### Por que una sola aplicacion

Porque reduce friccion operativa.

Frontend y backend viven en el mismo proyecto, lo cual simplifica:

1. despliegue,
2. autenticacion,
3. permisos,
4. iteracion rapida,
5. mantenimiento.

### Por que Supabase

Porque permite lanzar rapido sin construir demasiada infraestructura desde cero.

Ademas conserva una ruta limpia hacia necesidades futuras como:

1. politicas por fila,
2. storage,
3. auth,
4. funciones server side,
5. posible uso posterior de Vault.

### Por que Google Drive sigue vivo en V1

Porque intentar migrar todos los archivos pesados a una gestion interna completa desde el inicio encarece el producto sin validar primero el flujo.

La regla correcta es:

1. Bridge gestiona estado y contexto,
2. Google Drive puede seguir hospedando parte de los archivos pesados,
3. el sistema guarda los enlaces y los usa como referencia operativa.

## Modelo de Datos Minimo

Entidades minimas recomendadas:

1. users,
2. clients,
3. contacts,
4. projects,
5. briefs,
6. tasks,
7. assets,
8. approvals,
9. comments,
10. agent_runs,
11. activity_log.

## Superficies de Interfaz en V1

La interfaz no debe empezar con diez pantallas.

Debe empezar con cinco vistas utiles.

### 1. Tablero Hoy

Muestra:

1. tareas vencidas,
2. tareas del dia,
3. entregables en revision,
4. bloqueos,
5. actividad reciente.

### 2. Clientes

Lista clientes, estado general y acceso rapido a sus proyectos.

### 3. Proyecto

Vista principal por cliente o servicio con brief, tareas, activos y decisiones.

### 4. Aprobaciones

Cola unica para revisar lo que un humano debe validar.

### 5. Bitacora de Agentes

Registro de que pidio el usuario, que produjo el agente y que accion fue aceptada o rechazada.

## Flujo Minimo de Operacion

### Flujo 1. Alta y arranque

1. se crea cliente,
2. se captura brief corto,
3. el agente de intake estructura el brief,
4. el humano corrige y aprueba,
5. se crea proyecto activo.

### Flujo 2. Planeacion operativa

1. el agente de operaciones propone tareas,
2. el humano valida,
3. las tareas pasan al tablero,
4. se asignan responsables y fechas.

### Flujo 3. Produccion

1. el agente de produccion propone activos o insumos,
2. el operador los toma, ajusta o descarta,
3. se registra version,
4. el entregable pasa a revision.

### Flujo 4. Cierre de ciclo

1. un humano aprueba,
2. Bridge registra evidencia,
3. se actualiza estado,
4. el sistema puede generar un resumen semanal o checkpoint.

## Lo que NO debe entrar en V1

1. cotizador automatico completo,
2. facturacion y cobranza integradas,
3. automatizaciones complejas por WhatsApp o email,
4. vault productivo para secretos y datos fiscales,
5. permisos muy detallados por cliente externo,
6. dashboards avanzados de performance multicanal,
7. agentes que actuan sin aprobacion,
8. sincronizacion bidireccional compleja con herramientas externas,
9. pausado automatico de campañas o cambios presupuestales ejecutados por sistema.

## Criterios de Aceptacion Arquitectonica

La arquitectura V1 se considera correcta si cumple lo siguiente:

1. un cliente piloto puede operarse dentro del sistema,
2. el brief se puede convertir en tareas sin copiar y pegar entre herramientas,
3. existe una cola unica de aprobaciones,
4. toda accion relevante deja trazabilidad,
5. los agentes ayudan pero no toman control sensible,
6. el sistema se puede ampliar despues sin rehacerse completo.

## Fases Recomendadas

### Fase 1. Operacion interna minima

1. clientes,
2. proyectos,
3. briefs,
4. tareas,
5. aprobaciones,
6. log de agentes.

### Fase 2. Piloto con primer cliente

1. mejorar flujo de activos,
2. incorporar comentarios y revisiones,
3. generar resumen semanal por cliente,
4. endurecer estados y checklists.

### Fase 3. Expansion controlada

1. vista compartible para cliente,
2. notificaciones,
3. integraciones externas puntuales,
4. diagnostico y cotizacion asistida.

## Recomendacion Ejecutiva Final

La mejor decision no es construir el Bridge soñado completo.

La mejor decision es construir un Bridge pequeno que ya sirva como columna vertebral de la agencia.

Si la V1 logra operar un solo cliente real con orden, criterio y agentes utiles, ya habra probado lo mas importante:

que el modelo funciona antes de sofisticarse.