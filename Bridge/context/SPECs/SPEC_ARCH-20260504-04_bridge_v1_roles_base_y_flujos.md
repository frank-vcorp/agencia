# SPEC ARCH-20260504-04

## Titulo

Bridge V1 para piloto real del ecosistema con roles base, superficies compartidas y flujos entre operador, diseñador y cliente

## Estado

Planificado

## Fecha

2026-05-04

## Objetivo

Definir la arquitectura funcional de Bridge V1 como sistema puente del ecosistema de la agencia para una prueba piloto real.

Bridge V1 debe conectar en un solo sistema a:

1. el operador estrategico que trabaja desde VS Code,
2. el diseñador u operador creativo que trabaja con Firefly y activos visuales,
3. el cliente que participa en briefing, revision, carga de contexto y consulta de resultados.

## Tesis Rectora

Bridge no es solo una app interna.

Bridge tampoco es solo un portal de cliente.

Bridge es la capa operativa compartida donde viven el contexto, la produccion, la aprobacion y la visibilidad entre los tres actores base del piloto.

Formula rectora:

**Bridge V1 debe unir a las tres partes del sistema antes de intentar sofisticarlas.**

Y debe hacerlo de forma que los agentes IA puedan operar el sistema y aprender de el sin depender de lectura manual desordenada.

## Restricciones Arquitectonicas No Negociables

Estas decisiones forman parte de la V1 y no deben dejarse para despues.

### 1. Multitenant desde el primer release

Bridge V1 debe nacer como sistema multitenant real.

No como single tenant temporal.

Cada cliente debe vivir aislado por tenant desde datos, permisos, activos, briefs, cotizaciones, leads y estadisticas.

La prueba piloto no elimina esta necesidad porque la estructura multitenant es parte de la naturaleza del producto.

### 2. Conexion de VS Code por internet

La integracion con tu operacion en VS Code no debe depender de red local.

Bridge debe exponer una integracion publica segura por internet para que puedas conectarte:

1. desde tu VS Code local,
2. desde un workspace remoto en GitHub,
3. desde futuros agentes conectados por internet.

La arquitectura correcta es API remota segura, no acoplamiento local.

Esa integracion no solo sirve para consultar datos.

Tambien debe permitir que un agente IA desde VS Code cree o prellene entidades operativas dentro de Bridge.

### 3. Chat de briefing con modelo Claude

El chat de briefing de V1 debe usar un modelo Claude.

Su funcion no es solo conversar.

Su funcion principal es capturar informacion, ordenarla y traducirla a campos estructurados consumibles por el sistema.

### 4. Prompts estructurados por activo

Los prompts no deben almacenarse como texto libre suelto sin contexto.

Bridge debe organizarlos por activo a producir.

Cada prompt debe nacer ligado al tipo de activo y a la plataforma destino.

La seleccion de esos campos debe poder ser propuesta por un agente IA desde VS Code usando el catalogo oficial de Bridge.

### 5. Operabilidad total por agentes

Toda entidad importante de Bridge V1 debe poder ser:

1. creada,
2. consultada,
3. actualizada,
4. relacionada,
5. resumida,
6. validada

por agentes IA a traves de una capa remota segura.

Bridge no debe pensarse solo como interfaz grafica.

Debe pensarse tambien como sistema operativo programable para agentes.

La operabilidad por agentes debe respetar identidad tecnica, identidad efectiva, tenant y permiso por operacion.

### 6. Bridge como fuente de conocimiento

Bridge no solo almacena datos.

Tambien debe entregar conocimiento util a los agentes.

Eso significa que las entidades no deben devolverse solo como registros crudos, sino como contexto estructurado utilizable para:

1. briefings,
2. cotizaciones,
3. prompts,
4. activos,
5. seguimiento,
6. resumentes de cliente,
7. decisiones operativas.

El conocimiento derivado debe conservar marca de tiempo y version de origen para evitar contexto stale.

## Principios Especificos de Producto

### 1. Conversacion que estructura

Todo flujo conversacional de briefing debe producir estructura utilizable.

El valor del chat no es el chat en si.

El valor es convertir conversacion en datos que luego sirven para:

1. briefs,
2. activos,
3. prompts,
4. checklists,
5. decisiones operativas.

Esos datos deben quedar disponibles para consumo posterior por agentes sin relectura manual completa del historial.

### 2. Activos limitados y predefinidos

Bridge V1 debe asumir que los activos no son infinitos.

Deben modelarse como tipos concretos con reglas y presets.

Ejemplos:

1. video para WhatsApp,
2. imagen para Instagram post,
3. historia para Instagram,
4. creativo para Facebook Ads,
5. imagen para Google Display,
6. video corto para TikTok.

### 3. Presets por plataforma

Cada activo debe poder traer predefinido al menos:

1. plataforma destino,
2. formato del activo,
3. dimensiones o proporcion,
4. uso esperado,
5. restricciones tecnicas,
6. campos de prompt aplicables.

Esto hace el sistema mas simple, mas guiado y mas entendible para todos los actores.

### 4. Tipificacion por seleccion, no por texto libre

La tipificacion de activos debe resolverse con cajas de seleccion.

No con un campo libre donde cada usuario describa la pieza a su manera.

La interfaz de Bridge debe comenzar con una taxonomia controlada.

Seleccion minima recomendada:

1. aplicativo,
2. tipo de pieza,
3. placement o uso,
4. formato tecnico.

Estas selecciones no estan pensadas solo para captura manual.

Tambien deben ser consumibles por agentes que operen desde VS Code.

El agente debe poder:

1. inferir la combinacion mas probable,
2. enviar la seleccion estructurada a Bridge,
3. dejar al humano la correccion final si hace falta.

El catalogo base de V1 vive en:

1. ../CATALOGO_ACTIVOS_V1.md

## Problema que Resuelve

Sin Bridge, el ecosistema queda fragmentado.

1. la estrategia vive en VS Code,
2. la produccion visual vive fuera,
3. el cliente responde por canales dispersos,
4. los activos y aprobaciones se pierden entre chats,
5. las cotizaciones y el seguimiento no tienen una superficie unica,
6. el mini CRM y la visibilidad del cliente quedan desarticulados.

Bridge V1 existe para evitar esa fragmentacion y convertirse en el punto de encuentro operativo del piloto.

## Actores Base de V1

### 1. Operador estrategico

Es quien dirige el sistema desde VS Code.

Responsabilidades principales:

1. generar estrategia,
2. producir briefs, copies y cotizaciones con ayuda de IA,
3. alimentar Bridge con decisiones y artefactos clave,
4. revisar aprobaciones y avance,
5. supervisar mini CRM y estadisticas.

### 2. Diseñador u operador creativo

Es quien transforma el contexto estrategico en activos visuales y creativos.

Responsabilidades principales:

1. recibir briefs y prompts,
2. cargar referencias visuales,
3. trabajar con Firefly,
4. revisar y aprobar bocetos generados por IA,
5. subir versiones y entregables a Bridge,
6. dejar comentarios sobre decisiones visuales o bloqueos.

### 3. Cliente

Es quien participa dentro del sistema como actor visible del servicio.

Responsabilidades principales:

1. responder briefing,
2. subir imagenes o archivos de contexto,
3. revisar su cotizacion vigente,
4. consultar activos, avances y comentarios,
5. ver estadisticas relevantes,
6. revisar sus leads o contactos dentro del mini CRM segun el servicio contratado.

## Roles Fuera de Alcance Inicial

Los roles satelite pueden definirse despues.

No forman parte del nucleo de V1.

Ejemplos de roles posteriores:

1. account manager,
2. closer,
3. operador financiero,
4. editor adicional,
5. administrador general.

## Principio de Alcance de V1

V1 si debe contener el ecosistema completo del piloto.

Eso no significa construir una plataforma enterprise.

Significa que el primer release debe cubrir el circuito minimo completo entre estrategia, produccion y cliente.

La frontera correcta de V1 no es por modulos aislados.

La frontera correcta es por flujo operativo real.

## Objetos Compartidos del Sistema

Bridge V1 debe organizarse alrededor de objetos compartidos entre roles.

### 1. Cliente

Entidad raiz para acceso, cotizacion, activos, briefing, leads y estadisticas.

### 2. Proyecto o servicio activo

Unidad concreta de trabajo vivo.

Ejemplos:

1. lanzamiento,
2. presencia,
3. contenido,
4. campana,
5. activo interno de la agencia usado como piloto.

### 3. Brief

Espacio vivo de descubrimiento y alineacion.

Debe poder alimentarse desde:

1. operador,
2. cliente,
3. diseñador cuando detecte faltantes visuales o tecnicos.

### 4. Cotizacion

Documento versionado donde el cliente siempre ve la ultima version vigente y el operador conserva historial.

### 5. Activo

Pieza de trabajo o entregable.

Ejemplos:

1. imagen,
2. video,
3. copy,
4. propuesta,
5. guion,
6. landing,
7. documento,
8. archivo enlazado desde Drive.

Cada activo debe incluir una tipificacion operativa.

No basta con saber que es imagen o video.

Tambien debe saberse:

1. para que plataforma es,
2. que formato exacto tiene,
3. que uso cumple,
4. que preset tecnico debe respetar.

### 6. Comentario o hilo contextual

Espacio de conversacion anclado a un brief, cotizacion, activo, proyecto o lead.

### 7. Lead o contacto

Unidad minima del mini CRM.

### 8. Estadistica

Resumen visible de actividad o performance para el cliente y el operador.

### 9. Contexto derivado para agentes

Capa de conocimiento sintetizado derivada de las entidades operativas.

Debe incluir al menos:

1. resumen del cliente,
2. resumen del proyecto,
3. ultimo estado operativo,
4. lineamientos activos,
5. restricciones activas,
6. prompts vigentes,
7. activos recientes,
8. pendientes o bloqueos.

## Superficies de Producto de Bridge V1

### Superficie 1. Cabina del Operador

Orientada a ti como usuario principal desde el ecosistema VS Code + Bridge.

Debe permitir:

1. ver clientes y proyectos,
2. subir o sincronizar briefs y cotizaciones trabajadas desde VS Code,
3. revisar aprobaciones pendientes,
4. consultar actividad del diseñador,
5. revisar mini CRM,
6. ver resumen de estadisticas por cliente,
7. dejar instrucciones y comentarios contextuales.

Tambien debe permitir recibir propuestas estructuradas del agente para crear activos con cajas ya preseleccionadas.

Y debe permitir disparar acciones operables por agente sobre entidades de Bridge.

La sincronizacion con VS Code debe vivir sobre internet mediante autenticacion segura y endpoints publicos controlados.

### Superficie 2. Estacion Creativa

Orientada al diseñador u operador creativo.

Debe permitir:

1. ver el brief aplicable,
2. acceder a referencias y archivos de contexto,
3. recibir prompts o lineamientos,
4. registrar enlaces o resultados provenientes de Firefly,
5. marcar bocetos como candidato, descartado o aprobado,
6. subir versiones finales o intermedias,
7. comentar bloqueos o decisiones visuales.

### Superficie 3. Portal del Cliente

Orientada al cliente final como participante del flujo.

Debe permitir:

1. ver su cotizacion vigente,
2. responder o ampliar briefing,
3. subir imagenes y archivos de contexto,
4. revisar aplicativos o activos,
5. conversar dentro del hilo del proyecto,
6. ver sus estadisticas principales,
7. consultar su mini CRM o los contactos captados cuando aplique.

## Flujos Reales de V1

### Flujo 1. Briefing vivo

1. el operador crea o inicia el brief,
2. el cliente lo complementa dentro de Bridge,
3. el diseñador consulta ese contexto,
4. los comentarios viven anclados al mismo espacio,
5. el chat con Claude estructura la informacion relevante,
6. Bridge traduce la conversacion a campos utiles,
7. Bridge guarda tambien un resumen consumible por agentes,
8. el operador consolida la version de trabajo.

### Flujo 2. Cotizacion y validacion comercial

1. el operador genera la cotizacion con ayuda desde VS Code,
2. Bridge guarda versiones,
3. el cliente solo ve la version vigente,
4. el sistema registra cambios y estatus,
5. el operador mantiene trazabilidad completa.

### Flujo 3. Produccion creativa con Firefly

1. el operador entrega instrucciones y prompts base,
2. el agente desde VS Code puede prellenar la tipificacion del activo,
3. el diseñador recibe el contexto en Bridge,
4. el activo ya trae preset de plataforma, formato y uso,
5. el diseñador usa Firefly con prompts, imagenes y referencias,
6. los bocetos y decisiones se registran en Bridge,
7. los activos aprobados por el diseñador pasan a revision del operador o del cliente segun el caso.

### Flujo 4. Revision y aprobacion

1. el activo llega a Bridge,
2. el operador puede aprobar, devolver o comentar,
3. el cliente puede revisar cuando aplique,
4. la historia de versiones y comentarios queda visible.

### Flujo 5. Mini CRM y seguimiento

1. Bridge recibe o registra leads o contactos,
2. el operador revisa estatus,
3. el cliente puede consultar la visibilidad que se le habilite,
4. los comentarios del seguimiento quedan centralizados,
5. los agentes pueden consultar el estado resumido para apoyar decisiones y mensajes.

### Flujo 6. Visibilidad de resultados

1. Bridge muestra estadisticas resumidas,
2. el cliente ve solo lo necesario,
3. el operador conserva una vista mas amplia,
4. el sistema sirve como referencia comun para las conversaciones de avance.

## Modulos Funcionales Requeridos en V1

### Modulo 1. Gestion de clientes y proyectos

Debe existir una estructura multicliente clara.

Debe existir una estructura multitenant real.

Cada registro operativo debe pertenecer a un tenant.

Cada cliente debe tener:

1. perfil basico,
2. usuarios asociados,
3. servicios o proyectos activos,
4. estado general,
5. actividad reciente.

Todo acceso y consulta debe resolverse bajo aislamiento por tenant.

Cada entidad debe exponer una forma legible por agentes para consulta remota.

### Modulo 2. Briefing y chat contextual

Este modulo es central en V1.

No debe ser un chat suelto.

Debe ser un sistema de conversacion orientado a contexto.

Debe ejecutarse con un modelo Claude para el flujo de briefing.

Debe permitir:

1. mensajes por proyecto o entidad,
2. preguntas y respuestas de briefing,
3. comentarios editables,
4. trazabilidad por autor y fecha,
5. extraccion estructurada de campos utiles,
6. sugerencia de faltantes por completar.

Campos estructurados minimos derivados del briefing:

1. objetivo del activo o proyecto,
2. plataforma destino,
3. publico,
4. oferta o mensaje central,
5. referencias de contexto,
6. restricciones,
7. entregable esperado.

Debe existir ademas una vista resumida del briefing para agentes.

### Modulo 3. Cotizaciones versionadas

Debe permitir:

1. guardar multiples versiones,
2. marcar una como vigente,
3. registrar estado administrativo,
4. dejar notas internas,
5. mostrar al cliente solo la version activa.

Estados minimos sugeridos:

1. borrador,
2. enviada,
3. aprobada,
4. facturada,
5. pagada.

Cada cotizacion debe poder devolverse tambien como:

1. resumen ejecutivo,
2. version vigente,
3. historial corto,
4. estado administrativo,
5. siguientes acciones sugeridas.

La accion de marcar una version como vigente debe quedar restringida al operador.

### Modulo 4. Centro de activos

Debe permitir:

1. subir archivos o enlazarlos,
2. guardar referencias de contexto,
3. registrar origen del activo,
4. mantener versiones,
5. relacionar activos con brief, proyecto y comentarios,
6. clasificar el activo por tipo de pieza y plataforma,
7. aplicar presets tecnicos.

Cada activo debe declarar al menos:

1. tipo de activo,
2. plataforma destino,
3. formato de pieza,
4. dimensiones o relacion de aspecto,
5. uso,
6. estado.

La captura de estos campos debe venir de listas predefinidas y no de escritura libre.

Estas listas deben exponerse tambien a la capa de integracion remota para que un agente pueda seleccionar valores validos desde VS Code.

Cada activo debe poder devolverse a agentes con:

1. metadatos estructurados,
2. prompt vigente,
3. referencias,
4. estado,
5. historial corto.

### Modulo 5. Flujo creativo Firefly

Bridge no reemplaza Firefly.

Bridge coordina el flujo alrededor de Firefly.

Debe permitir:

1. guardar prompts por activo,
2. guardar referencias visuales,
3. registrar enlaces o evidencia de bocetos,
4. marcar decision creativa,
5. transferir los resultados al centro de activos,
6. reutilizar presets por plataforma y formato.

Los prompts no deben modelarse solo como texto.

Deben tener estructura suficiente para saber:

1. para que activo existen,
2. para que plataforma fueron creados,
3. que restricciones respetan,
4. que referencias usan,
5. que version esta aprobada.

Estados minimos sugeridos:

1. pendiente de producir,
2. en exploracion,
3. candidato,
4. aprobado por diseñador,
5. aprobado final,
6. descartado.

### Modulo 6. Mini CRM

Debe permitir gestionar el seguimiento basico sin complejidad excesiva.

Campos base:

1. prospecto,
2. contacto principal,
3. operacion o servicio,
4. comentarios,
5. estatus.

Estados base:

1. nuevo,
2. contactado,
3. ganado,
4. perdido.

### Modulo 7. Estadisticas visibles

No se busca un BI complejo.

Se busca visibilidad suficiente para operar y conversar con el cliente.

Debe poder mostrar al menos:

1. resumen de leads,
2. resumen de actividad o entregables,
3. indicadores simples de redes o campanas cuando existan,
4. fecha de actualizacion.

### Modulo 8. Trazabilidad y aprobaciones

Cada accion importante debe dejar rastro.

Debe registrarse:

1. autor,
2. rol,
3. entidad afectada,
4. accion,
5. fecha,
6. observacion.

Toda aprobacion debe identificar:

1. quien aprobo,
2. que aprobo,
3. cuando,
4. con que comentario.

Toda accion iniciada por agente debe registrar:

1. agente origen,
2. tipo de accion,
3. entidad afectada,
4. resultado,
5. aprobacion requerida o no.

La matriz de aprobaciones de V1 debe cubrir al menos brief, cotizacion, activo y conocimiento derivado.

### Modulo 9. Integracion remota con VS Code y agentes

Este modulo habilita a Bridge como backend operativo accesible por internet.

Debe permitir:

1. autenticacion segura de clientes externos como VS Code o agentes,
2. envio de briefs, cotizaciones y prompts desde internet,
3. consulta remota de estados y entidades,
4. registro de origen de cada accion remota,
5. envio estructurado de selecciones de catalogo para crear activos,
6. acceso a contexto resumido listo para agentes,
7. operaciones de lectura y escritura sobre las entidades clave.

Las entidades minimas operables por agentes en V1 deben ser:

1. clientes,
2. proyectos,
3. briefs,
4. cotizaciones,
5. activos,
6. comentarios,
7. leads,
8. resumentes de contexto.

## Arquitectura de Integracion con VS Code

VS Code sigue siendo la cabina estrategica principal del operador.

Bridge no sustituye eso.

Bridge lo materializa para otros actores.

La integracion debe permitir:

1. generar briefs, copies, prompts y cotizaciones desde VS Code,
2. empujar esos artefactos a Bridge por API,
3. consultar estados relevantes desde VS Code,
4. usar IA para preparar insumos antes de que lleguen a Bridge,
5. conectarse desde internet sin dependencia de red local,
6. soportar futuros agentes corriendo en workspaces remotos como GitHub.

Tambien debe permitir que el agente mande estructuras como:

1. aplicativo seleccionado,
2. tipo de pieza,
3. placement,
4. formato,
5. campos guiados del prompt,
6. referencias asociadas.

La recomendacion arquitectonica es exponer:

1. API HTTPS,
2. autenticacion por tokens o credenciales de servicio,
3. webhooks o endpoints de sincronizacion segun el flujo,
4. endpoints de contexto para agentes.

## Reglas de Permisos por Rol Base

### Operador estrategico

Puede:

1. ver todo,
2. crear y editar clientes, proyectos, briefs, cotizaciones y activos,
3. aprobar entregables,
4. revisar CRM y estadisticas,
5. dejar instrucciones globales.

### Diseñador

Puede:

1. ver proyectos asignados,
2. consultar briefing y contexto,
3. subir activos y referencias,
4. registrar prompts y decisiones creativas,
5. aprobar bocetos a nivel creativo,
6. comentar.

No debe:

1. editar cotizaciones finales,
2. ver informacion financiera completa,
3. modificar configuracion global del cliente.

### Cliente

Puede:

1. ver su proyecto,
2. responder briefing,
3. subir archivos,
4. ver cotizacion vigente,
5. revisar activos autorizados,
6. ver estadisticas habilitadas,
7. participar en comentarios.

No debe:

1. ver historial interno completo,
2. ver comentarios privados,
3. alterar estados operativos internos.

## Arquitectura Tecnologica Recomendada

La recomendacion para esta V1 es:

1. Next.js con TypeScript,
2. Tailwind CSS para interfaz,
3. Supabase Postgres para datos,
4. Supabase Auth para usuarios por rol,
5. RLS para aislamiento real por tenant y proyecto,
6. Supabase Storage para archivos ligeros,
7. enlaces externos o integracion progresiva con Google Drive para archivos pesados,
8. API HTTPS publica y segura para integracion con VS Code,
9. proveedor Claude para el chat de briefing.

## Modelo de Activos Dirigidos por Plataforma

Bridge V1 debe incluir una biblioteca interna de tipos de activo permitidos.

Cada tipo de activo debe ser seleccionable y guiar la captura del prompt.

Ejemplos iniciales:

1. video para WhatsApp,
2. imagen cuadrada para Instagram,
3. historia vertical para Instagram,
4. imagen para Facebook Ads,
5. video vertical para TikTok,
6. imagen para Google Display.

Cada tipo de activo debe definir:

1. nombre visible,
2. plataforma,
3. formato,
4. dimensiones sugeridas,
5. uso,
6. campos de prompt requeridos,
7. notas tecnicas.

La seleccion inicial de aplicativos mas tipicos debe incluir al menos:

1. WhatsApp,
2. Instagram,
3. Facebook,
4. TikTok,
5. Google,
6. Landing Page.

Y como extensiones cercanas:

1. YouTube,
2. Sitio Web,
3. Email.

## Decisiones de Producto para V1

1. V1 si incluye cliente visible dentro del sistema,
2. V1 si incluye diseñador como actor operativo real,
3. V1 si incluye briefing, chat contextual, cotizacion, activos, mini CRM y estadisticas,
4. V1 si nace como producto multitenant,
5. V1 si usa Claude en el chat de briefing,
6. V1 si expone integracion remota por internet para VS Code y agentes futuros,
7. V1 si estructura prompts por activo y plataforma,
8. V1 si hace operables por agentes las entidades clave del sistema,
9. V1 si entrega conocimiento estructurado de vuelta a esos agentes,
10. V1 no intenta resolver todos los roles de la agencia,
11. V1 prioriza el piloto completo entre tres actores sobre la expansion funcional indiscriminada.

## Criterios de Aceptacion

Bridge V1 se considera bien definido si permite este escenario extremo simple:

1. el operador crea un cliente,
2. el cliente entra y completa briefing,
3. el diseñador recibe el contexto y produce un boceto con Firefly,
4. el boceto vuelve a Bridge,
5. el operador y el cliente revisan,
6. la cotizacion vigente sigue visible,
7. las imagenes del cliente estan cargadas,
8. el mini CRM muestra sus contactos,
9. las estadisticas principales son visibles,
10. todo ocurre sin depender de chats dispersos.

## Decision Final

Bridge V1 no debe pensarse como una app interna recortada.

Debe pensarse como el primer tejido conectivo real del ecosistema de la agencia.

Si logra unir con claridad al operador, al diseñador y al cliente en un mismo flujo, entonces la V1 ya habra cumplido su trabajo mas importante.