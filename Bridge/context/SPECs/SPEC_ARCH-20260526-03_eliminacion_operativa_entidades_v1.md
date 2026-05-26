# SPEC ARCH-20260526-03: Eliminacion operativa de entidades bajo demanda V1

**ID:** ARCH-20260526-03  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-26  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Puntaje de prioridad:** (Valor 9 x 3) + (Urgencia 9 x 2) - (Complejidad 6 x 0.5) = 42  
**Depende de:** ARCH-20260505-22, ARCH-20260505-23, ARCH-20260505-24, ARCH-20260510-08, ARCH-20260510-11  
**Origen:** INTERCONSULTA_ARCH-20260526-01_eliminacion_segura_entidades

---

## 1. Contexto

Bridge ya está entrando a fase de pruebas reales. En este punto, el sistema necesita una capacidad básica y normal de cualquier producto operativo: **eliminar cosas bajo demanda** cuando fueron creadas por error, ya no se contrataron, quedaron obsoletas o deben limpiarse antes de pruebas reales.

La necesidad real del usuario no es una “purga total del tenant”, sino una capacidad operativa controlada para eliminar:

1. proyectos completos,
2. cotizaciones individuales,
3. activos individuales,
4. briefs individuales,
5. componentes subordinados de un activo o de una cotización cuando aplique.

Hoy Bridge no ofrece esa operación de forma explícita. Eso obliga a convivir con residuos operativos o a resolver borrados por vías ad hoc, lo que es peor que exponer una capacidad clara, restringida y trazable.

Además, esta capacidad no debe quedar solo en la API interna: también debe estar disponible para Vika a través del MCP de Bridge, porque parte del flujo operativo real ocurrirá desde agentes y no solo desde superficies humanas.

---

## 2. Objetivo

Implementar una capa de eliminación operativa por entidad bajo demanda, tenant-aware, con confirmación explícita según el nivel de impacto, para que el operador pueda borrar registros erróneos o no vigentes sin depender de limpieza manual de base de datos.

Esta misma capacidad debe quedar expuesta tanto en la API interna como en el MCP consumido por Vika.

---

## 3. Resultado esperado

Al cerrar este slice:

1. Bridge puede eliminar entidades operativas individuales de forma explícita,
2. el sistema diferencia entre borrado simple y borrado destructivo con cascada,
3. cada operación devuelve impacto claro antes de ejecutarse cuando corresponde,
4. existe auditoría mínima persistente del borrado,
5. Vika puede operar el borrado desde MCP con el mismo contrato y restricciones,
6. el sistema queda listo para pruebas reales con limpieza controlada de datos equivocados o descartados.

---

## 4. Alcance

### Incluye

1. eliminación de `project` completo,
2. eliminación de `quotation` individual,
3. eliminación de `asset` individual,
4. eliminación de `brief` individual,
5. eliminación de componentes subordinados de `asset` cuando ya existan como entidades propias persistidas,
6. modo `preview` cuando el borrado tenga impacto cascada o lateral,
7. auditoría mínima persistente,
8. validaciones tenant-aware y confirmación explícita,
9. exposición de la misma capacidad en MCP para Vika.

### Excluye

1. purga total del tenant,
2. eliminación de `client` en este corte,
3. papelera o recuperación completa tipo soft delete universal,
4. UI administrativa amplia.

---

## 5. Decisión arquitectónica

### 5.1 Borrado por entidad, no solo por bundle

La arquitectura correcta para este momento del producto es **eliminación operativa por entidad bajo demanda**.

Eso implica que el sistema debe soportar, como mínimo:

1. borrar un `project`,
2. borrar una `quotation`,
3. borrar un `asset`,
4. borrar un `brief`,
5. borrar componentes subordinados que vivan como filas independientes.

### 5.1.1 Principio de contención

La regla estructural de este slice es:

1. una entidad contenedora puede eliminar su contenido dependiente cuando el modelo ya expresa esa cascada o cuando la lógica del slice la resuelve explícitamente,
2. una entidad hija nunca puede eliminar su contenedor superior como efecto colateral,
3. eliminar una entidad intermedia no debe subir destruyendo el `project` ni el `client`,
4. el sistema debe comportarse como una jerarquía descendente de impacto, no ascendente.

Ejemplos obligatorios:

1. si se elimina un `project`, sí puede eliminar o arrastrar `quotations`, `assets` y demás dependencias hijas,
2. si se elimina una `quotation`, no debe eliminar el `project`,
3. si se elimina un `asset`, no debe eliminar el `project` ni la `quotation`,
4. si se elimina un `brief`, no debe eliminar el `project`,
5. si se elimina una evidencia o propuesta, no debe eliminar el `asset` contenedor.

### 5.2 Dos niveles de borrado

El sistema debe distinguir dos niveles:

1. **borrado simple**: elimina una entidad individual sin cascada amplia o con impacto acotado,
2. **borrado de alto impacto**: elimina una entidad que arrastra hijas o genera desvinculaciones relevantes.

Regla base:

1. `asset`, `quotation`, `brief` y componentes subordinados pueden resolverse como borrado simple o semiguiado según impacto,
2. `project` siempre debe tratarse como borrado de alto impacto.

Regla adicional no negociable:

1. el impacto permitido siempre es descendente,
2. nunca ascendente.

### 5.3 Hard delete explícito en V1

Para este corte la decisión es **hard delete explícito por entidad**, no soft delete transversal, porque:

1. Bridge todavía no tiene papelera unificada,
2. abrir soft delete en todas las entidades multiplicaría complejidad de queries, UI y reglas de consistencia,
3. la necesidad inmediata es corrección operativa y limpieza antes de pruebas reales.

### 5.4 Preview obligatorio según impacto

Debe existir `preview` obligatorio para:

1. `project`,
2. cualquier entidad cuyo borrado afecte hijas directas o deje referencias en `null`,
3. cualquier eliminación con más de una entidad impactada.

El preview puede omitirse solo en borrados claramente unitarios y sin cascada amplia, si la implementación demuestra esa condición de forma segura.

### 5.5 Endpoint administrativo interno, no DELETE plano

No se recomienda usar `DELETE` HTTP desnudo para esta V1, porque la operación necesita:

1. `preview`,
2. `execute`,
3. razón operativa,
4. texto de confirmación cuando aplique,
5. payload consistente entre entidades.

La recomendación es una familia de endpoints administrativos internos del tipo:

1. `POST /api/v1/projects/[id]/delete`,
2. `POST /api/v1/quotations/[id]/delete`,
3. `POST /api/v1/assets/[id]/delete`,
4. `POST /api/v1/briefs/[id]/delete`.

Si un componente subordinado ya vive en una tabla propia con endpoint claro, debe seguir el mismo patrón.

### 5.6 MCP para Vika con mismo contrato operativo

Este slice debe exponer también tools MCP para que Vika pueda ejecutar la misma capacidad sin salir del flujo Bridge.

Reglas obligatorias:

1. el MCP no define lógica propia de borrado,
2. el MCP delega a la misma API interna ya endurecida,
3. el MCP debe soportar `preview` y `execute`,
4. el MCP debe exigir los mismos campos de confirmación,
5. el MCP no puede relajar guardrails por tratarse de una operación por agente.

Tools mínimas esperadas:

1. `bridge_delete_project`,
2. `bridge_delete_quotation`,
3. `bridge_delete_asset`,
4. `bridge_delete_brief`.

Si en el primer corte no conviene exponer componentes subordinados como tools separadas, pueden quedar para un slice incremental posterior siempre que las cuatro tools base queden operativas.

---

## 6. Matriz mínima por entidad

### Project

1. tipo: alto impacto,
2. preview: obligatorio,
3. confirmación explícita: obligatoria,
4. efecto esperado: puede eliminar `quotations`, `assets` y demás dependencias hijas del proyecto; debe reportar explícitamente desvinculaciones laterales si existen.

### Quotation

1. tipo: medio impacto,
2. preview: obligatorio si tiene versiones o vínculos activos,
3. confirmación explícita: obligatoria si es la vigente o si afecta activos referenciados,
4. efecto esperado: borra la cotización y sus versiones; nunca elimina el `project` contenedor; activos relacionados pueden quedar con referencias en `null` si así lo define el esquema.

### Asset

1. tipo: medio impacto,
2. preview: obligatorio si tiene prompts, propuestas, evidencias, aprobaciones o sesiones,
3. confirmación explícita: obligatoria,
4. efecto esperado: borra el activo y sus hijas por cascada; nunca elimina el `project` ni la `quotation` contenedora.

### Brief

1. tipo: medio impacto,
2. preview: obligatorio si está ligado a cotizaciones, activos o historial relevante,
3. confirmación explícita: obligatoria,
4. efecto esperado: borra el brief y sus versiones/respuestas relacionadas; nunca elimina el `project`; referencias externas deben resolverse según FK vigente y reportarse.

### Componentes subordinados

Ejemplos: propuestas de activo, evidencias, aprobaciones específicas, versiones hijas.

1. tipo: bajo o medio impacto,
2. preview: opcional si el impacto es unitario y claro,
3. confirmación explícita: obligatoria,
4. efecto esperado: elimina solo la fila y sus dependencias hijas directas; nunca elimina su entidad contenedora.

---

## 7. Superficies a modificar

SOFIA debe concentrar el cambio alrededor de estas rutas:

1. `Bridge/lib/entity-delete.ts`
2. `Bridge/lib/entity-delete.test.ts`
3. `Bridge/app/api/v1/projects/[id]/delete/route.ts`
4. `Bridge/app/api/v1/assets/[id]/delete/route.ts`
5. `Bridge/app/api/v1/projects/[id]/quotation/delete/route.ts` o ruta equivalente ya alineada a la entidad real
6. `Bridge/app/api/v1/projects/[id]/brief/delete/route.ts` o ruta equivalente ya alineada a la entidad real
7. `Bridge/supabase/migrations/[timestamp]_entity_delete_events_v1.sql`
8. `Bridge/mcp/src/bridge-client.ts`
9. `Bridge/mcp/src/index.ts`
10. `Bridge/mcp/src/tools/` con las nuevas tools de borrado
11. `Bridge/mcp/src/__tests__/mcp-tools.test.ts`
12. `Bridge/context/checkpoints/` para cierre del slice

Si la estructura real del repo exige otra ruta equivalente para `quotation` o `brief`, SOFIA puede ajustarla sin cambiar la decisión de arquitectura.

---

## 8. Modelo de auditoría esperado

Se debe agregar una tabla de auditoría mínima, por ejemplo `entity_delete_events`, con un shape equivalente a:

1. `id uuid primary key default gen_random_uuid()`,
2. `tenant_id uuid not null references public.tenants(id) on delete cascade`,
3. `entity_type text not null`,
4. `entity_id uuid not null`,
5. `entity_label text not null`,
6. `requested_by_label text not null`,
7. `approved_by_label text not null`,
8. `reason text not null`,
9. `mode text not null check (mode in ('simple','impactful'))`,
10. `impact_summary_json jsonb not null default '{}'::jsonb`,
11. `created_at timestamptz not null default timezone('utc', now())`.

No debe depender por FK viva a la entidad eliminada, porque la fila ya no existirá tras el borrado.

---

## 9. Contrato API esperado

### 9.1 Shape común

Todas las rutas de borrado deben aceptar un payload común como base:

```json
{
  "mode": "preview" | "execute",
  "requestedByLabel": "Vika",
  "approvedByLabel": "Frank Saavedra",
  "reason": "dato_erroneo|no_contratado|reset_pruebas|duplicado|otro",
  "confirmationText": "..."
}
```

El MCP debe reutilizar este mismo shape de negocio, aunque adapte nombres de argumentos al estilo de tool cuando haga falta.

### 9.2 Reglas

1. `mode` es obligatorio,
2. `requestedByLabel` es obligatorio,
3. `approvedByLabel` es obligatorio,
4. `reason` es obligatorio,
5. `confirmationText` es obligatorio para `execute`,
6. cada preview debe devolver el texto exacto de confirmación requerido.

### 9.3 Respuesta preview

Debe devolver, como mínimo:

1. entidad objetivo,
2. tipo de impacto,
3. conteo de hijas afectadas,
4. referencias que quedarán en `null` si aplica,
5. `confirmationText` canónico.

### 9.4 Respuesta execute

Debe devolver, como mínimo:

1. `ok: true`,
2. entidad eliminada,
3. resumen de impacto ejecutado,
4. `eventId` de auditoría,
5. mensaje legible.

---

## 10. Reglas de dominio

`Bridge/lib/entity-delete.ts` debe centralizar la lógica reusable.

Se espera, como mínimo:

1. resolver tenant activo,
2. cargar entidad objetivo y verificar pertenencia al tenant,
3. calcular impacto por tipo de entidad,
4. construir confirmación canónica,
5. ejecutar borrado real solo si la confirmación coincide,
6. persistir auditoría,
7. devolver resultado tipado y controlado.

La lógica no debe quedar duplicada entre varias rutas.

La capa MCP debe limitarse a:

1. validar argumentos de tool,
2. llamar al endpoint correcto,
3. formatear respuesta legible para agente.

---

## 11. Guardrails obligatorios

1. toda operación debe ser tenant-aware,
2. ninguna operación puede borrar más de una entidad raíz por llamada,
3. `project` siempre debe requerir preview + execute,
4. toda ejecución debe exigir confirmación explícita,
5. los errores deben salir como JSON controlado, nunca como 500 vacío,
6. no debe existir en este corte un endpoint de purga total del tenant,
7. no debe tocarse `client` en este corte,
8. la respuesta debe dejar claro el alcance real de lo eliminado,
9. ninguna operación hija puede eliminar su contenedor superior,
10. MCP y API deben compartir exactamente el mismo nivel de restricción operativa.

---

## 12. Criterios de aceptación

1. existe capacidad operativa para eliminar `project`, `quotation`, `asset` y `brief` bajo demanda,
2. el sistema distingue correctamente entre borrado simple y de alto impacto,
3. `project` exige preview y confirmación explícita,
4. `asset` puede eliminarse junto con prompts, propuestas, evidencias y sesiones hijas cuando aplique,
5. `quotation` elimina sus versiones y reporta impactos laterales, pero no elimina el `project`,
6. `brief` puede eliminarse de forma explícita y controlada, pero no elimina el `project`,
7. toda ejecución persiste auditoría mínima,
8. `asset` puede eliminar sus hijas, pero no elimina `project` ni `quotation`,
9. Vika puede ejecutar `preview` y `execute` de borrado vía MCP usando las tools autorizadas,
10. los tests del slice pasan,
11. el sistema queda apto para limpieza previa a pruebas reales sin tocar base de datos manualmente.

---

## 13. Estrategia de pruebas

### Obligatorias

1. test de preview y execute para `project`,
2. test de delete para `asset` con hijas,
3. test de delete para `quotation` con versiones,
4. test de delete para `brief`,
5. test de aislamiento entre tenants,
6. test de bloqueo por `confirmationText` inválido,
7. test de auditoría persistida,
8. tests MCP para las nuevas tools de borrado.

### No obligatorias en este corte

1. UI dedicada,
2. delete de `client`,
3. purga total del tenant.

---

## 14. Riesgos conocidos

1. subestimar dependencias laterales entre entidades,
2. dejar confirmaciones inconsistentes entre rutas,
3. mezclar este slice con papelera universal,
4. intentar resolver todo vía cascadas sin reporte explícito del impacto,
5. inflar el corte hasta tocar `client` o tenant completo.

---

## 15. Orden recomendado para SOFIA

1. crear la migración `entity_delete_events`,
2. implementar `Bridge/lib/entity-delete.ts` con preview, confirmación y execute por entidad,
3. implementar tests de dominio en `Bridge/lib/entity-delete.test.ts`,
4. montar las rutas por entidad con el mismo contrato,
5. extender `Bridge/mcp` con las tools de borrado que delegan a la API,
6. validar de forma estrecha en app y MCP,
7. emitir checkpoint.

---

## 16. Definición de terminado

Este slice se considera terminado cuando Bridge puede eliminar bajo demanda entidades operativas equivocadas o descartadas, con guardrails proporcionales a su impacto, tanto desde la API interna como desde el MCP usado por Vika, sin depender de limpieza manual de base de datos y sin abrir todavía purgas masivas de cliente o tenant.