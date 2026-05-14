# SPEC ARCH-20260513-06: Agente Frank + Skills de Operación Bridge V1

**ID:** ARCH-20260513-06  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-13  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Puntaje de prioridad:** (Valor 9 × 3) + (Urgencia 8 × 2) - (Complejidad 4 × 0.5) = 41  
**Depende de:** ARCH-20260510-08, ARCH-20260510-10, ARCH-20260510-11

---

## 1. Contexto

Bridge ya tiene:

1. servidor MCP operativo con 8 herramientas,
2. contratos documentados para agentes y VS Code,
3. flujo comprobado de cliente -> proyecto -> brief -> cotización -> activos,
4. copias locales automáticas de brief, propuesta y prompts,
5. MCT y PDF ya operativos para el piloto.

El hueco que sigue abierto es la **superficie especializada de operación en VS Code**. Hoy Frank puede usar el stack existente, pero lo hace con un agente generalista y sin skills enfocados a Bridge, lo que introduce ruido, exploración innecesaria y menor repetibilidad operativa.

Este slice existe para darle a Frank un agente propio, estrecho y útil para operar Bridge con menor fricción.

---

## 2. Objetivo

Crear un agente Frank especializado para operar Bridge desde VS Code, con instrucciones concretas y skills enfocadas a los flujos repetitivos del piloto real.

---

## 3. Resultado esperado

Al cerrar este slice:

1. existe un agente Frank propio para este repo,
2. el agente entiende que Bridge se opera prioritariamente vía MCP y contexto local,
3. existen skills concretas para los flujos operativos más repetitivos,
4. Frank puede pedir acciones como leer brief, emitir propuesta, crear cliente/proyecto/activo y publicar prompt con menos ruido,
5. el agente evita exploración amplia cuando el MCP ya cubre la operación.

---

## 4. Alcance

### Incluye

1. definición del archivo del agente Frank para este workspace,
2. instrucciones específicas para operar Bridge,
3. skills mínimos para operación comercial y creativa recurrente,
4. guidance explícita para priorizar MCP + copias locales + superficies ya existentes,
5. documentación mínima para invocación y uso del agente.

### Excluye

1. nuevas tools MCP,
2. rediseño de permisos globales del editor,
3. cambios en identidad/autorización de Bridge,
4. nuevas capacidades IA dentro de la app,
5. refactorización amplia de prompts globales del usuario.

---

## 5. Decisiones de diseño

### 5.1 Agente especializado, no generalista

Frank no debe ser un alias cosmético. Debe tener:

1. rol explícito de operador comercial y operativo de Bridge,
2. foco en flujo real,
3. instrucciones de bajo ruido exploratorio,
4. preferencia clara por el MCP antes que por manipulación manual innecesaria.

### 5.2 Reutilizar la estructura estándar de customizaciones

Como el repo no tiene todavía estructura `.github` para customizaciones del agente, este slice debe crear una base mínima y limpia bajo el workspace raíz:

1. `.github/agents/`
2. `.github/skills/`

**Aclaración de scope del editor:** la customización debe vivir en el root del workspace actual `agencia`, no dentro del subdirectorio `Bridge/`. El objetivo es que cargue cuando Frank abre este workspace completo.

El agente no debe vivir dentro de `Bridge/context/`; esa carpeta sigue siendo documental del producto, no de la customización de VS Code.

### 5.3 Skills estrechos y operativos

No conviene una skill gigante “hacer todo en Bridge”.

El mínimo recomendado es separar al menos:

1. operar brief y propuesta,
2. operar cliente/proyecto/activo,
3. operar publicación de prompts de producción.

### 5.4 El MCP manda cuando ya existe contrato

Si Bridge ya expone una operación por MCP, el agente debe preferir:

1. `bridge_get_brief`,
2. `bridge_write_quotation`,
3. `bridge_create_client`,
4. `bridge_create_project`,
5. `bridge_create_asset`,
6. `bridge_write_production_spec`,
7. `bridge_get_asset_context`,
8. `bridge_list_assets`.

Solo debe caer a exploración/edición manual cuando el flujo no esté cubierto por MCP o cuando la tarea sea documental.

---

## 6. Rutas objetivo esperadas

Se espera que SOFIA cree o toque principalmente estas rutas en el root del workspace:

1. `/home/frank/proyectos/agencia/.github/agents/frank-bridge.agent.md`
2. `/home/frank/proyectos/agencia/.github/skills/operar-bridge-brief-propuesta/SKILL.md`
3. `/home/frank/proyectos/agencia/.github/skills/operar-bridge-cliente-proyecto-activo/SKILL.md`
4. `/home/frank/proyectos/agencia/.github/skills/operar-bridge-prompts-produccion/SKILL.md`
5. opcionalmente una nota mínima de uso en `/home/frank/proyectos/agencia/Bridge/context/` si aporta valor operativo.

No hace falta abrir más de estos archivos salvo que la estructura real del editor exija un archivo adicional mínimo.

---

## 7. Contenido esperado del agente Frank

El agente debe dejar claro al menos:

1. que opera Bridge como sistema de agencia sobre MCP + contexto local,
2. que su prioridad es flujo comercial y operativo real,
3. que evita exploración amplia si ya hay contrato MCP,
4. que primero consulta brief/cotización/contexto antes de proponer cambios grandes,
5. que distingue entre operación documental, operación MCP y cambios de app,
6. que cuando haga operación de Bridge favorece trazabilidad y copias locales.
7. que su set de tools preferentes o permitidas queda explicitado en la definición del agente.

### Tools preferentes mínimos esperados

La definición del agente debe declarar preferencia explícita por estas capacidades cuando apliquen:

1. tools MCP de Bridge para operación de cliente/proyecto/brief/cotización/activo,
2. lectura de archivos del repo para contexto documental,
3. edición de archivos solo cuando la tarea sea documental o de customización del propio repo,
4. terminal solo para validaciones o tareas que no estén cubiertas por MCP.

La instrucción práctica es: si existe operación MCP equivalente, el agente Frank no debe empezar por terminal ni por edición manual.

---

## 8. Skills mínimas esperadas

### Skill A. Brief + Propuesta

Debe cubrir:

1. leer brief desde MCP,
2. generar o refinar propuesta,
3. escribir cotización en Bridge,
4. dejar copia local consistente.

### Skill B. Cliente + Proyecto + Activo

Debe cubrir:

1. crear cliente,
2. crear proyecto,
3. crear activo,
4. validar que el flujo quede trazable.

### Skill C. Prompts de Producción

Debe cubrir:

1. leer contexto del activo,
2. redactar o actualizar spec de producción,
3. publicarla en Bridge,
4. mantener copia local si aplica.

---

## 9. Criterios de aceptación

1. existe un agente Frank utilizable desde este repo,
2. el agente declara con claridad su rol y su preferencia por MCP,
3. existen al menos 3 skills concretas y acotadas para Bridge,
4. la estructura de archivos de customización queda clara y limpia,
5. el agente no promueve exploración innecesaria cuando ya existe contrato MCP,
6. el slice queda documentado con checkpoint.

---

## 10. Riesgos conocidos

1. crear un agente demasiado amplio y repetir el problema del agente generalista,
2. meter demasiadas skills y volver difusa la selección,
3. escribir instrucciones que compitan con el MCP en vez de apoyarse en él,
4. mezclar documentación del producto con archivos de customización de VS Code.

---

## 11. Secuencia recomendada para SOFIA

1. crear la estructura mínima `.github/agents` y `.github/skills`,
2. redactar el agente Frank con foco Bridge + MCP,
3. crear las 3 skills mínimas operativas,
4. validar que la estructura sea coherente para VS Code,
5. emitir checkpoint.