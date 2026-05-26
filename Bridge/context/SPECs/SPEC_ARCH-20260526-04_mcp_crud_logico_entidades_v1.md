# SPEC ARCH-20260526-04: MCP CRUD logico por entidad en Bridge V1

**ID:** ARCH-20260526-04  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-26  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Puntaje de prioridad:** (Valor 9 x 3) + (Urgencia 8 x 2) - (Complejidad 6 x 0.5) = 40  
**Depende de:** ARCH-20260505-22, ARCH-20260505-23, ARCH-20260505-24, ARCH-20260510-08, ARCH-20260510-14, ARCH-20260526-03  
**Origen:** DEAC-ARCH-20260526-04

---

## 1. Contexto

Bridge ya opera con MCP en produccion para un subconjunto de tareas: activos, briefs, cotizaciones y creacion parcial de entidades. Sin embargo, el contrato actual sigue siendo asimetrico. El caso mas visible es `projects`: el MCP puede crear proyectos, pero no listarlos ni consultarlos como inventario vivo.

Para que Vika y otros agentes operen Bridge como backend real, el MCP debe cubrir las operaciones logicas base por entidad. El criterio ya aprobado es claro: para entidades operativas nucleares el MCP debe soportar listado, consulta, creacion, actualizacion y eliminacion con permiso explicito cuando aplique.

Este slice no redefine el producto. Completa el contrato operativo del MCP y su API interna equivalente.

---

## 2. Objetivo

Completar la paridad operacional del MCP de Bridge para las entidades nucleares del sistema, exponiendo un contrato coherente y tenant-aware de:

1. `list`,
2. `get`,
3. `create`,
4. `update`,
5. `delete` con guardrails de impacto.

La implementacion debe apoyar a Vika y otros agentes sin duplicar reglas de negocio en el MCP.

---

## 3. Resultado esperado

Al cerrar este slice:

1. Vika puede descubrir entidades reales por MCP,
2. Vika puede consultar entidades puntuales por ID,
3. Vika puede crear y actualizar entidades con validacion controlada,
4. Vika conserva eliminacion segura con permiso explicito,
5. el MCP queda organizado por taxonomia uniforme de herramientas,
6. la API interna ofrece endpoints equivalentes y reutilizables.

---

## 4. Alcance

### Incluye

1. lectura de `clients`, `projects`, `briefs`, `quotations` y `assets`,
2. actualizacion parcial de las mismas entidades donde sea operacionalmente seguro,
3. endurecimiento del contrato MCP para que cada entidad objetivo tenga cobertura de ciclo logico completo,
4. alineacion MCP ↔ API interna,
5. tests de tools MCP nuevas y de cliente HTTP,
6. documentacion de checkpoint al cierre.

### Excluye

1. UI administrativa,
2. bulk updates o bulk deletes,
3. soft delete universal,
4. coverage completa sobre entidades secundarias como leads, conversaciones o configuraciones,
5. cambios de esquema mayores fuera de lo necesario para soportar update o lectura.

---

## 5. Entidades objetivo y operaciones requeridas

### 5.1 Clients

#### MCP esperado

1. `bridge_list_clients`
2. `bridge_get_client`
3. `bridge_create_client` (ya existe)
4. `bridge_update_client`
5. `bridge_delete_client` queda **fuera de este corte**

#### Decision

`clients` entra con `list/get/create/update`, pero **sin delete** en esta V1 incremental, porque eliminar clientes es mas sensible y no forma parte del alcance ya aprobado en borrado operativo.

### 5.2 Projects

#### MCP esperado

1. `bridge_list_projects`
2. `bridge_get_project`
3. `bridge_create_project` (ya existe)
4. `bridge_update_project`
5. `bridge_delete_project` (ya existe)

### 5.3 Briefs

#### MCP esperado

1. `bridge_list_briefs`
2. `bridge_get_brief` (ya existe, pero esta orientado a brief consolidado; debe considerarse la herramienta de consulta)
3. `bridge_create_brief` queda fuera de este corte si el modelo actual no la necesita para operacion Vika
4. `bridge_update_brief`
5. `bridge_delete_brief` (ya existe)

#### Decision

No se fuerza `create_brief` en este corte si hoy el brief ya se genera por flujo conversacional y no por insercion manual directa desde MCP. La paridad minima exigida aqui para `briefs` es `list/get/update/delete`.

### 5.4 Quotations

#### MCP esperado

1. `bridge_list_quotations`
2. `bridge_get_quotation`
3. `bridge_write_quotation` se mantiene como operacion de creacion/actualizacion versionada
4. `bridge_update_quotation_status` o equivalente acotado
5. `bridge_delete_quotation` (ya existe)

#### Decision

`quotations` no necesita un `update` libre y general. Debe resolverse con updates controlados de estado o vigencia, manteniendo la logica versionada existente.

### 5.5 Assets

#### MCP esperado

1. `bridge_list_assets` (ya existe)
2. `bridge_get_asset_context` se mantiene como consulta rica del activo
3. `bridge_create_asset` (ya existe)
4. `bridge_update_asset`
5. `bridge_delete_asset` (ya existe)

---

## 6. Principios de diseño

### 6.1 MCP sin logica duplicada

El MCP debe ser solo un cliente operativo. Toda regla de negocio vive en API interna y librerias compartidas.

### 6.2 Update por allowlist

Ninguna entidad tendra `update` arbitrario. Cada entidad debe definir campos editables y campos intocables.

### 6.3 Delete endurecido

Se conserva lo ya definido en ARCH-20260526-03:

1. `preview` obligatorio segun impacto,
2. `execute` con confirmacion explicita,
3. impacto descendente, nunca ascendente,
4. auditoria persistente.

### 6.4 Lectura operativa, no exhaustiva

`list` y `get` deben ser suficientes para operar. No deben intentar devolver “todo el universo” de dependencias salvo en tools ricas ya existentes como `bridge_get_asset_context`.

---

## 7. Contrato operativo minimo por entidad

### 7.1 List

Todos los `list` deben devolver como minimo:

1. `id`,
2. etiqueta principal (`name`, `title` o equivalente),
3. `status`,
4. referencias minimas necesarias para operar (`clientId`, `projectId`, etc.),
5. orden estable,
6. filtros tenant-aware.

### 7.2 Get

Todos los `get` deben devolver:

1. identificadores,
2. campos principales,
3. relaciones minimas operativas,
4. timestamps si existen y son utiles,
5. errores claros `not_found` / `tenant_not_found`.

### 7.3 Create

Se reutilizan las tools existentes donde ya hay comportamiento valido. Donde no exista create, no se inventa si el flujo real no lo requiere en este corte.

### 7.4 Update

#### Clients

Campos editables esperados:

1. `name`
2. `legalName`
3. `status`
4. `primaryContactName`
5. `primaryContactChannel`
6. `primaryContactEmail` si ya existe en el modelo
7. `primaryContactWhatsapp` si ya existe en el modelo
8. `notes`

#### Projects

Campos editables esperados:

1. `name`
2. `objective`
3. `status`
4. `startDate`
5. `endDate`

No editable en este corte:

1. `tenant_id`
2. `client_id` por update libre
3. `project_type` si su cambio afecta trazabilidad historica

#### Briefs

Update solo sobre campos compatibles con el flujo existente de brief consolidado. Si el brief actual se persiste en una estructura mas compleja, SOFIA debe acotar el update a:

1. metadatos de estado,
2. notas operativas,
3. bandera de revision humana,
4. campos ya expuestos por la capa actual.

#### Quotations

Update acotado a:

1. estado,
2. vigencia,
3. activacion de version,
4. metadatos administrativos seguros.

No se autoriza mutacion libre del cuerpo comercial historico por `PATCH` generico.

#### Assets

Campos editables esperados:

1. `title`
2. `status`
3. `quotationId` si el modelo permite reasignacion controlada
4. etiquetas operativas o visibilidad ligera ya existentes

No editable en este corte:

1. claves estructurales de tipificacion si romperian consistencia historica sin migracion.

### 7.5 Delete

#### Entra en este corte

1. `projects`
2. `briefs`
3. `quotations`
4. `assets`

#### No entra en este corte

1. `clients`

---

## 8. Superficies a modificar

SOFIA debe operar sobre una superficie equivalente a esta:

1. `/home/frank/proyectos/agencia/Bridge/app/api/v1/projects/route.ts`
2. `/home/frank/proyectos/agencia/Bridge/app/api/v1/clients/route.ts`
3. nuevas rutas GET/PATCH equivalentes para `projects`, `clients`, `briefs`, `quotations` y `assets` donde hoy falten,
4. `/home/frank/proyectos/agencia/Bridge/lib/assets.ts`
5. librerias equivalentes donde hoy viva la logica de briefs y quotations,
6. `/home/frank/proyectos/agencia/Bridge/mcp/src/bridge-client.ts`
7. `/home/frank/proyectos/agencia/Bridge/mcp/src/index.ts`
8. nuevos archivos en `/home/frank/proyectos/agencia/Bridge/mcp/src/tools/`
9. tests MCP y de dominio afectados,
10. `/home/frank/proyectos/agencia/Bridge/context/checkpoints/`

Si alguna entidad ya cuenta con superficie equivalente reusable, SOFIA debe preferirla antes de crear una nueva ruta paralela.

---

## 9. Taxonomia final de tools MCP esperada

### Clients

1. `bridge_list_clients`
2. `bridge_get_client`
3. `bridge_create_client`
4. `bridge_update_client`

### Projects

1. `bridge_list_projects`
2. `bridge_get_project`
3. `bridge_create_project`
4. `bridge_update_project`
5. `bridge_delete_project`

### Briefs

1. `bridge_list_briefs`
2. `bridge_get_brief`
3. `bridge_update_brief`
4. `bridge_delete_brief`

### Quotations

1. `bridge_list_quotations`
2. `bridge_get_quotation`
3. `bridge_write_quotation`
4. `bridge_update_quotation_status` o equivalente claramente nombrado
5. `bridge_delete_quotation`

### Assets

1. `bridge_list_assets`
2. `bridge_get_asset_context`
3. `bridge_create_asset`
4. `bridge_update_asset`
5. `bridge_delete_asset`

---

## 10. Endpoints API internos esperados

### Reglas

1. `list/get/create/update` deben vivir en rutas REST internas consistentes.
2. `delete` mantiene el patron administrativo `POST .../delete` ya autorizado.
3. `update` debe preferir `PATCH` con payload parcial.

### Minimo esperado

1. `GET /api/v1/clients`
2. `GET /api/v1/clients/[id]`
3. `PATCH /api/v1/clients/[id]`
4. `GET /api/v1/projects`
5. `GET /api/v1/projects/[id]`
6. `PATCH /api/v1/projects/[id]`
7. `GET /api/v1/briefs` o ruta equivalente derivable desde proyecto si el modelo no admite un indice global honesto
8. `GET /api/v1/briefs/[id]` o equivalente real ya existente
9. `PATCH /api/v1/briefs/[id]` o equivalente
10. `GET /api/v1/quotations` o ruta equivalente por proyecto con agregador MCP si el indice global no existe
11. `GET /api/v1/quotations/[id]` o equivalente
12. `PATCH /api/v1/quotations/[id]` acotado a estado/vigencia o ruta especializada equivalente
13. `GET /api/v1/assets`
14. `GET /api/v1/assets/[id]`
15. `PATCH /api/v1/assets/[id]`

SOFIA puede mapear `briefs` y `quotations` a rutas equivalentes si la estructura actual es project-scoped. Lo importante es cerrar la capacidad, no forzar una URL artificial.

---

## 11. Guardrails

1. Todas las operaciones deben validar `Authorization: Bearer <BRIDGE_MCP_SECRET>`.
2. Todas las operaciones deben resolver tenant por `X-Bridge-Tenant`.
3. Ninguna lectura debe cruzar entidades fuera del tenant.
4. `update` debe rechazar campos fuera de allowlist.
5. `delete` debe conservar confirmacion explicita y preview segun impacto.
6. Si una entidad no puede soportar un update general sin riesgo, debe exponerse una accion especializada y no un parche abierto.

---

## 12. Estrategia de implementacion recomendada

### Fase 1 — Discovery de superficie reusable

1. identificar que ya existe para `clients`, `projects`, `briefs`, `quotations` y `assets`,
2. evitar rutas duplicadas si una superficie equivalente ya puede endurecerse.

### Fase 2 — Lectura faltante

1. cerrar `list/get` de `projects`,
2. cerrar `list/get` de `clients`,
3. cerrar `list/get` de `briefs` y `quotations` con el menor numero de rutas nuevas posible.

### Fase 3 — Updates seguros

1. `update_client`,
2. `update_project`,
3. `update_asset`,
4. update especializado para `quotation`,
5. update acotado para `brief` si la estructura actual lo soporta de forma clara.

### Fase 4 — MCP y tests

1. extender `bridge-client.ts`,
2. registrar tools en `index.ts`,
3. cubrir tests MCP,
4. validar build app + build MCP.

---

## 13. Criterios de aceptacion

1. Vika puede listar proyectos reales por MCP.
2. Vika puede consultar un proyecto puntual por MCP.
3. Vika puede actualizar un proyecto en campos autorizados por MCP.
4. Vika puede listar clientes y consultar un cliente por MCP.
5. Vika puede actualizar clientes en campos autorizados por MCP.
6. Vika puede listar y consultar briefs de forma operable por MCP.
7. Vika puede listar y consultar cotizaciones de forma operable por MCP.
8. Vika puede ejecutar updates acotados sobre quotations sin romper el modelo versionado.
9. Vika puede actualizar activos en campos autorizados por MCP.
10. Los deletes ya existentes siguen operando con sus guardrails.
11. `clients` no expone delete en este corte.
12. Build de `Bridge` pasa.
13. Build de `Bridge/mcp` pasa.
14. Las tools nuevas quedan visibles en `ListToolsRequestSchema`.
15. El checkpoint final documenta coberturas y exclusiones remanentes.

---

## 14. Riesgos remanentes aceptados

1. `briefs` puede requerir una implementacion menos uniforme si su persistencia real no es plana.
2. `quotations` puede necesitar rutas especializadas de update para no erosionar la logica versionada.
3. `clients.delete` queda deliberadamente fuera para no ampliar el riesgo de impacto contenedor.

---

## 15. Handoff manual a SOFIA

Dile a Sofia: Trabaja sobre /home/frank/proyectos/agencia/Bridge/context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md. Estado actual: SPEC autorizada, sin implementacion. Issue Jira: SIN-ISSUE. Objetivo: completar el contrato MCP de Bridge para operaciones logicas por entidad con cobertura de list/get/create/update/delete segun la matriz aprobada, priorizando `projects`, `clients`, `briefs`, `quotations` y `assets`, sin duplicar logica en el MCP. Salida esperada: codigo listo para validacion con endpoints internos, tools MCP nuevas o endurecidas, tests y checkpoint final para Val. Restricciones: no abrir delete para `clients`, no crear updates arbitrarios fuera de allowlist, mantener preview/execute en deletes existentes, y no expandir el slice a entidades no incluidas.