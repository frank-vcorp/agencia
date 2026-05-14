# SPEC ARCH-20260510-11: Refinamiento Operativo para Piloto Real de Bridge

**ID:** ARCH-20260510-11
**Agente autor:** INTEGRA - Arquitecto
**Fecha:** 2026-05-10
**Estado:** Autorizada — lista para SOFIA
**Prioridad:** Alta — cierra la brecha entre V1 funcional y piloto real operable
**Puntaje de prioridad:** (Valor 10 × 3) + (Urgencia 9 × 2) - (Complejidad 6 × 0.5) = 45
**Depende de:** SPEC-08, SPEC-09, SPEC-10 y los cortes ya cerrados de Operador, Diseñador, Cliente y Activos

---

## 1. Contexto y Motivación

Bridge ya alcanzó el punto donde la arquitectura V1 está completa y el flujo end-to-end ya fue demostrado con el caso Superman.

Hoy ya existen:

1. Operador, Diseñador y Cliente funcionando en producción.
2. MCP server Bridge operativo desde VS Code con 8 herramientas.
3. Módulo de Comunicación Transaccional implementado a nivel de código.
4. Caso demostración completo que valida el ciclo cliente → proyecto → brief → cotización → activos.

Lo que falta no es una nueva capa arquitectónica. Lo que falta es **refinamiento operativo** para usar Bridge como sistema real de trabajo sin fricciones visibles.

La sesión de mañana debe concentrarse en convertir una V1 funcional en una V1 lista para piloto serio.

---

## 2. Objetivo

Cerrar el refinamiento operativo mínimo de Bridge para piloto real mediante un solo corte coordinado que cubra:

1. exportación formal de cotizaciones y propuestas en PDF,
2. creación del agente Frank para operar Bridge desde VS Code,
3. decisión e integración del proveedor de email si Resend no es suficiente,
4. cierre del modelo de contacto del cliente para email y WhatsApp,
5. corrida end-to-end completa del flujo real,
6. limpieza técnica del código no necesario,
7. afinación UX/UI de las superficies clave.

---

## 3. Resultado Esperado al Cerrar la Sesión

Al terminar esta SPEC, Bridge debe quedar en este estado:

1. una cotización puede emitirse también como PDF descargable y enviable,
2. Frank tiene un agente propio en VS Code con instrucciones y skills enfocados en operar Bridge,
3. el flujo MCT queda listo para usar Resend o SendGrid de forma explícita y no ambigua,
4. el contacto principal del cliente queda resuelto con email y WhatsApp estructurados,
5. existe una corrida completa validada de punta a punta,
6. el repositorio queda más limpio y con menos basura técnica visible,
7. Operador, Diseñador y Cliente quedan más pulidos visual y operativamente.

---

## 4. Alcance de esta SPEC

### Incluye

1. Generación de PDF para cotizaciones y propuestas.
2. Plantilla visual refinada para documento comercial exportable.
3. Agente Frank en VS Code con prompt, rol, alcance y tools definidos.
4. Skills del agente Frank para operación práctica de Bridge.
5. Decisión técnica entre Resend y SendGrid, con integración mínima del proveedor elegido.
6. Definición e implementación del dato de contacto estructurado del cliente para email y WhatsApp.
7. Conexión final o endurecimiento de los disparadores del MCT si el tiempo lo permite dentro del mismo corte.
8. Revisión y limpieza de código no usado, archivos obsoletos o piezas sobrantes del camino de implementación.
9. Refinamiento UX/UI en las superficies de Operador, Diseñador, Cliente y flujo comercial.
10. Validación end-to-end del flujo operativo principal.

### Excluye

1. Nuevas capacidades mayores de V2 como login cliente público.
2. Copiloto IA avanzado.
3. WebSockets o notificaciones en tiempo real.
4. Versionado avanzado de propuestas.
5. Replanteamiento arquitectónico de módulos ya cerrados.

---

## 5. Decisiones de Diseño Previas

### 5.1 Prioridad de negocio

La prioridad de mañana no es agregar más features. Es **hacer confiable, presentable y operable** lo que ya existe.

### 5.2 PDF como salida comercial oficial

La cotización no debe depender solo de una vista web o de un markdown local. Debe existir una salida formal en PDF que pueda compartirse con clientes corporativos.

### 5.3 Agente Frank como operador especializado

Frank no debe operar Bridge con un agente genérico. Debe existir un agente especializado con instrucciones precisas y skills concretos para:

1. leer briefs,
2. escribir cotizaciones,
3. crear clientes, proyectos y activos,
4. publicar prompts de producción,
5. ejecutar validaciones operativas,
6. minimizar ruido exploratorio.

### 5.4 Comunicación transaccional pragmática

Si Resend cubre bien el piloto, se mantiene. Si para PDFs adjuntos, entregabilidad o branding conviene más SendGrid, se migra o se deja un adaptador claro.

### 5.5 Contacto del cliente como dato estructurado

`primary_contact_channel` no es suficiente para operar MCT.

Bridge necesita separar explícitamente al menos:

1. email del contacto principal,
2. número WhatsApp del contacto principal,
3. nombre del contacto principal.

Sin eso, los canales email y `wa.me` quedan apoyados en texto ambiguo y el flujo no puede automatizarse con seguridad.

### 5.6 UX/UI al servicio de claridad operativa

El refinamiento visual no debe buscar “embellecer por embellecer”. Debe reducir fricción, mejorar lectura, dar jerarquía y hacer más evidente el siguiente paso.

---

## 6. Frentes de Trabajo

### Frente A. PDF de Cotizaciones y Propuestas

#### Objetivo

Permitir que Bridge genere un PDF formal y consistente para compartir cotizaciones y propuestas.

#### Requisitos

1. Cada cotización vigente debe poder renderizarse como PDF.
2. El PDF debe incluir:
   - identidad de la agencia,
   - nombre del cliente,
   - nombre del proyecto,
   - resumen ejecutivo,
   - items comerciales,
   - totales,
   - vigencia,
   - notas y condiciones básicas.
3. La salida debe verse correcta sin depender de estilos frágiles del navegador.
4. Debe existir una ruta o acción clara para descargarlo o adjuntarlo al flujo de envío.

#### Decisión técnica esperada

SOFIA puede escoger entre:

1. `@react-pdf/renderer` si conviene una plantilla controlada 100% desde React,
2. render HTML + conversión estable si da mejor velocidad y menor complejidad.

La decisión debe justificarse por robustez, no por moda.

---

### Frente B. Agente Frank para VS Code

#### Objetivo

Crear el agente operativo de Frank con una superficie especializada para trabajar Bridge desde VS Code.

#### Alcance mínimo

1. Archivo del agente con nombre explícito.
2. Rol claro: operador comercial y operativo de Bridge.
3. Tools estrictamente necesarias para operar Bridge.
4. Instructions enfocadas a:
   - consultar briefs,
   - crear clientes/proyectos/activos,
   - escribir cotizaciones,
   - publicar specs,
   - validar flujos,
   - evitar exploración innecesaria.
5. Skills de apoyo para el flujo comercial y operativo recurrente.

#### Resultado esperado

Frank debe poder abrir VS Code, invocar a su agente y operar Bridge con un flujo mucho más directo y menos verboso.

---

### Frente C. Proveedor de Email y MCT

#### Objetivo

Dejar resuelto el canal de envío transaccional para piloto real.

#### Alcance mínimo

1. Confirmar si Resend se conserva o se sustituye por SendGrid.
2. Documentar la decisión en el código/configuración.
3. Asegurar que la capa de envío permita:
   - asunto,
   - HTML,
   - texto fallback si aplica,
   - adjuntos o camino claro a adjuntos futuros.
4. Si se mantiene Resend, dejar explícito por qué.
5. Si se cambia a SendGrid, dejar la integración funcionando y probada.

#### Criterio rector

No abrir una abstracción sobrediseñada. Resolver el proveedor de forma simple, trazable y suficiente para piloto.

---

### Frente D. Modelo de Contacto del Cliente

#### Objetivo

Cerrar el hueco estructural de contacto del cliente para que email y WhatsApp funcionen como canales reales del sistema.

#### Alcance mínimo

1. Agregar campo explícito de email del contacto principal.
2. Agregar campo explícito de WhatsApp del contacto principal.
3. Mantener `primary_contact_name` como campo separado.
4. Definir si `primary_contact_channel` se conserva como texto complementario opcional.
5. Actualizar contratos MCP y validaciones de creación de cliente.
6. Permitir que `buildWhatsAppLink()` consuma un número confiable y no texto ambiguo.

#### Resultado esperado

Bridge puede disparar email y construir enlaces `wa.me` sobre datos reales, no sobre campos semiestructurados.

---

### Frente E. Corrida Completa End-to-End

#### Objetivo

Validar que el sistema completo funciona con un flujo real sin pasos ambiguos.

#### Flujo mínimo a validar

1. Crear cliente.
2. Crear proyecto.
3. Confirmar o leer brief.
4. Emitir cotización.
5. Generar PDF.
6. Crear activos.
7. Publicar prompts.
8. Validar salida comercial y operativa final.

#### Evidencia mínima

1. checkpoint de ejecución,
2. confirmación de build/tests relevantes,
3. registro del flujo probado,
4. lista breve de defectos detectados si aparecen.

---

### Frente F. Limpieza Técnica

#### Objetivo

Reducir residuos de implementación y dejar el repo más mantenible.

#### Incluye

1. remover archivos no usados o duplicados,
2. limpiar imports sobrantes,
3. eliminar helpers transitorios que ya no aportan,
4. revisar configuraciones temporales que quedaron del build del MCP,
5. dejar el árbol más legible.

#### Restricción

No borrar piezas con valor documental o que sigan respaldando decisiones activas sin antes confirmar su irrelevancia.

---

### Frente G. Refinamiento UX/UI

#### Objetivo

Pulir la experiencia visible para que el piloto se sienta intencional y profesional.

#### Superficies prioritarias

1. `/operador`
2. `/disenador`
3. `/cliente`
4. vistas comerciales relacionadas con brief, cotización y activos

#### Criterios de mejora

1. mejor jerarquía visual,
2. menos ruido,
3. mejor legibilidad,
4. acciones más claras,
5. estados vacíos honestos,
6. responsive consistente,
7. mayor coherencia estética entre superficies.

---

## 7. Archivos Objetivo Esperados

La implementación puede ajustar detalles, pero se espera tocar mayoritariamente superficies de este tipo:

1. archivos de cotizaciones/propuestas para render de PDF,
2. capa de comunicación transaccional,
3. archivos de configuración de agente y skills en VS Code,
4. componentes UI de Operador, Diseñador y Cliente,
5. documentación operativa del corte y checkpoint.

---

## 8. Criterios de Aceptación Medibles

La SPEC se considera completada solo si se cumplen todos estos puntos:

1. Existe una salida PDF real para cotizaciones o propuestas y puede generarse sin hack manual.
2. La plantilla PDF es presentable comercialmente y contiene los bloques mínimos definidos.
3. Existe un agente Frank funcional en VS Code con instrucciones y herramientas enfocadas.
4. Existen skills concretos para al menos los flujos operativos repetitivos de Bridge.
5. La decisión Resend vs SendGrid quedó resuelta y documentada.
6. El modelo de contacto del cliente soporta email y WhatsApp reales.
7. El flujo MCT queda listo o claramente endurecido para el piloto real.
8. Se ejecuta una corrida end-to-end documentada.
9. El repositorio queda más limpio que al inicio del corte.
10. Las superficies clave muestran un refinamiento UX/UI visible y no cosmético.
11. Build, tests o validaciones del slice tocado quedan registrados en el checkpoint.

---

## 9. Orden Recomendado de Ejecución

1. Resolver PDF de cotizaciones.
2. Cerrar modelo de contacto del cliente: email + WhatsApp.
3. Definir proveedor de email y cerrar MCT.
4. Crear agente Frank y sus skills.
5. Refinar plantillas comerciales.
6. Limpiar código no necesario.
7. Afinar UX/UI.
8. Ejecutar corrida end-to-end final.
9. Generar checkpoint de cierre.

---

## 10. Riesgos del Corte

1. Perder tiempo en embellecimiento visual antes de cerrar PDF y flujo comercial.
2. Diseñar un agente Frank demasiado amplio y ruidoso.
3. Mantener el contacto del cliente en un campo ambiguo y bloquear email/WhatsApp reales.
4. Cambiar a SendGrid sin necesidad real y abrir complejidad de configuración innecesaria.
5. Hacer limpieza agresiva y romper rutas útiles del flujo MCP.
6. Cerrar la sesión sin corrida completa real.

---

## 11. Definición de Terminado

Este corte se considera realmente terminado cuando:

1. Frank puede operar Bridge desde VS Code con su agente propio,
2. una propuesta puede terminar en PDF formal,
3. el modelo de contacto del cliente soporta email y WhatsApp reales,
4. el canal de comunicación transaccional queda resuelto para piloto,
5. el sistema pasa una corrida completa,
6. la experiencia visible queda más pulida y lista para enseñar.

En ese punto, Bridge no solo estará “funcionando”. Estará **listo para usarse con criterio de operación real**.