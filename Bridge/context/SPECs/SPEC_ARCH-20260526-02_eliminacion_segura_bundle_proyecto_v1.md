# SPEC ARCH-20260526-02: Eliminacion segura de bundle por proyecto para reset operativo V1

**ID:** ARCH-20260526-02  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-26  
**Estado:** Reemplazada por SPEC_ARCH-20260526-03_eliminacion_operativa_entidades_v1.md  
**Prioridad:** Alta  
**Puntaje de prioridad:** (Valor 9 x 3) + (Urgencia 9 x 2) - (Complejidad 5 x 0.5) = 42.5  
**Depende de:** ARCH-20260505-22, ARCH-20260505-23, ARCH-20260505-24, ARCH-20260510-08, ARCH-20260510-11  
**Origen:** INTERCONSULTA_ARCH-20260526-01_eliminacion_segura_entidades

---

## 1. Contexto

Esta SPEC queda reemplazada por una versión de alcance más preciso para la necesidad operativa real del proyecto: `SPEC_ARCH-20260526-03_eliminacion_operativa_entidades_v1.md`.

El motivo del reemplazo es que el usuario no requiere solo eliminación de bundle por proyecto, sino capacidad de eliminación bajo demanda por entidad o componente, como parte normal de la operación previa a pruebas reales.

No debe implementarse este documento salvo para referencia histórica.

---

## Documento reemplazado

El contenido restante se conserva solo como respaldo del primer corte de análisis.

---

## 1. Contexto

Bridge ya permite crear y operar `clients`, `projects`, `quotations`, `assets`, `briefs` y derivados. Sin embargo, hoy no existe una superficie segura para limpiar entidades operativas cuando se requiere reiniciar una prueba end-to-end.

La revisión local confirmó tres hechos estructurales:

1. la API pública actual de `projects` expone solo lectura y creación,
2. el MCP actual no expone ninguna tool de eliminación,
3. el modelo de datos ya tiene cascadas reales desde `projects` hacia `quotations` y `assets`, pero `briefs` y `leads` vinculados quedan en `null` por `on delete set null`.

El humano otorgó aprobación explícita para analizar y preparar el mecanismo de eliminación, pero no para ejecutar borrados masivos sin guardrails.

Por lo tanto, el primer corte no debe intentar resolver “purga total del tenant”. Debe resolver una unidad operativa más estrecha, trazable y reversible desde la arquitectura: **el bundle de un proyecto individual**.

---

## 2. Objetivo

Implementar una superficie tenant-aware y segura para previsualizar y ejecutar la eliminación de un solo `project` con sus entidades hijas directas, dejando trazabilidad persistente y sin abrir todavía una puerta de purga masiva del tenant.

---

## 3. Resultado esperado

Al cerrar este slice:

1. existe una acción API restringida para `preview` y `execute` de eliminación por proyecto,
2. el sistema puede informar antes de ejecutar qué registros caerán por cascada y cuáles quedarán desvinculados,
3. la ejecución exige aprobación explícita en el payload,
4. la eliminación real borra el `project` y deja que la base resuelva cascadas soportadas,
5. se registra un evento persistente de auditoría mínima de la eliminación,
6. el sistema queda listo para resetear casos de prueba por proyecto sin exponer todavía purga de cliente o tenant completo.

---

## 4. Alcance

### Incluye

1. nueva ruta server-side para purga controlada de un `project`,
2. modo `preview` y modo `execute` sobre la misma acción,
3. cómputo explícito del impacto esperado antes de borrar,
4. auditoría persistente mínima del evento de eliminación,
5. validaciones tenant-aware y confirmación explícita en el payload,
6. tests del slice en la capa de dominio,
7. checkpoint de implementación.

### Excluye

1. purga total del tenant,
2. eliminación de `clients`,
3. eliminación automática de `briefs` desvinculados,
4. eliminación automática de `leads` desvinculados,
5. tool MCP de borrado en este primer corte,
6. UI administrativa dedicada,
7. cambios en políticas RLS fuera de lo estrictamente necesario para esta ruta.

---

## 5. Decisión arquitectónica

### 5.1 Unidad de eliminación: project bundle

El primer corte autorizado será exclusivamente el bundle de un `project`.

Eso significa:

1. se borra un solo `project` por llamada,
2. se aprovechan las cascadas ya existentes sobre `quotations` y `assets`,
3. no se borran varios proyectos en lote,
4. no se borra el `client` contenedor,
5. no se borra el tenant.

### 5.2 Hard delete del project, no soft delete transversal

Para este corte, la decisión es **hard delete del registro `projects`**, porque:

1. el esquema actual ya expresa la semántica real de cascada,
2. introducir soft delete transversal en `projects`, `assets`, `quotations` y derivados abriría un refactor mucho mayor,
3. el objetivo inmediato es reset operativo de pruebas, no papelera universal.

Esta decisión queda acotada al bundle por proyecto y no autoriza aún hard delete libre en otras entidades.

### 5.3 Briefs y leads no se borran en V1

El análisis del modelo muestra que `briefs.project_id` y `leads.project_id` quedan en `null` al eliminar el proyecto.

En este corte:

1. esos registros no deben borrarse,
2. deben contarse y reportarse en el `preview`,
3. deben devolverse como “desvinculados” en el resultado de `execute`,
4. su limpieza posterior, si se desea, debe salir en un slice separado.

### 5.4 Acción explícita, no DELETE plano

La operación no debe exponerse como `DELETE /api/v1/projects/:id` sin body, porque este slice necesita:

1. distinguir `preview` y `execute`,
2. recibir aprobación explícita,
3. recibir razón operativa,
4. exigir texto de confirmación.

La superficie recomendada es:

1. `POST /api/v1/projects/[id]/purge`

con body tipado y validado.

### 5.5 Sin tool MCP en este primer corte

Aunque el caso de uso original nace desde agentes, INTEGRA decide dejar la tool MCP fuera de este primer slice para no mezclar en el mismo corte:

1. operación destructiva,
2. API nueva,
3. exposición remota adicional por stdio,
4. validación de blast radius.

Primero se valida el endpoint restringido. Luego, si hace falta, se deriva un segundo slice para exponerlo al MCP con guardrails equivalentes.

---

## 6. Superficies a modificar

SOFIA debe concentrar este cambio alrededor de estas rutas:

1. `Bridge/app/api/v1/projects/[id]/purge/route.ts`
2. `Bridge/lib/project-purge.ts`
3. `Bridge/lib/project-purge.test.ts`
4. `Bridge/supabase/migrations/[timestamp]_project_purge_events_v1.sql`
5. `Bridge/context/checkpoints/` para el cierre del slice

Si SOFIA detecta que necesita abrir una sexta superficie estructural, debe detenerse y pedir confirmación humana antes de ampliar alcance.

---

## 7. Modelo de datos esperado

Se debe agregar una tabla de auditoría mínima, por ejemplo `project_purge_events`, con un shape equivalente a:

1. `id uuid primary key default gen_random_uuid()`,
2. `tenant_id uuid not null references public.tenants(id) on delete cascade`,
3. `deleted_project_id uuid not null`,
4. `deleted_project_name text not null`,
5. `client_id uuid null`,
6. `approved_by_label text not null`,
7. `requested_by_label text not null`,
8. `reason text not null`,
9. `confirmation_text text not null`,
10. `impact_summary_json jsonb not null default '{}'::jsonb`,
11. `detached_brief_ids jsonb not null default '[]'::jsonb`,
12. `detached_lead_ids jsonb not null default '[]'::jsonb`,
13. `created_at timestamptz not null default timezone('utc', now())`.

Notas de diseño:

1. `deleted_project_id` no debe depender por FK viva a `projects`, porque el proyecto ya no existirá tras la operación,
2. `approved_by_label` y `requested_by_label` pueden ser texto en este corte para no abrir todavía una integración completa con identidad humana autenticada,
3. `impact_summary_json` debe preservar el resumen del preview ejecutado.

---

## 8. Contrato API esperado

### 8.1 Ruta

`POST /api/v1/projects/[id]/purge`

### 8.2 Auth

1. `Authorization: Bearer <BRIDGE_MCP_SECRET>`
2. `X-Bridge-Tenant: <tenant-slug>`

### 8.3 Request body

Body mínimo esperado:

```json
{
  "mode": "preview" | "execute",
  "approvedByLabel": "Frank Saavedra",
  "requestedByLabel": "Vika",
  "reason": "reset_prueba_completa",
  "confirmationText": "ELIMINAR PROYECTO <nombre>"
}
```

Reglas:

1. `mode` es obligatorio y solo admite `preview` o `execute`,
2. `approvedByLabel` es obligatorio,
3. `requestedByLabel` es obligatorio,
4. `reason` es obligatorio y no puede venir vacío,
5. `confirmationText` es obligatorio solo en `execute`,
6. el texto de confirmación debe coincidir exactamente con el patrón devuelto por `preview`.

### 8.4 Response preview

Respuesta orientativa:

```json
{
  "ok": true,
  "mode": "preview",
  "project": {
    "id": "...",
    "name": "...",
    "clientId": "...",
    "status": "active"
  },
  "impact": {
    "quotations": 1,
    "quotationVersions": 2,
    "assets": 5,
    "assetPromptVersions": 7,
    "assetProposals": 3,
    "assetProposalEvidences": 8,
    "assetApprovals": 1,
    "workSessions": 2,
    "briefsToDetach": ["..."],
    "leadsToDetach": ["..."]
  },
  "guardrails": {
    "confirmationText": "ELIMINAR PROYECTO Nombre del proyecto",
    "scope": "project_bundle_only"
  }
}
```

### 8.5 Response execute

Respuesta orientativa:

```json
{
  "ok": true,
  "mode": "execute",
  "deletedProjectId": "...",
  "detachedBriefIds": ["..."],
  "detachedLeadIds": ["..."],
  "eventId": "...",
  "message": "Proyecto eliminado con exito dentro del tenant activo."
}
```

---

## 9. Comportamiento de dominio esperado

`Bridge/lib/project-purge.ts` debe concentrar la logica reusable del slice.

Se espera, como minimo:

1. resolver el `tenantId` a partir del slug activo,
2. cargar el proyecto y confirmar que pertenece al tenant,
3. calcular el impacto antes de borrar,
4. construir el `confirmationText` canónico,
5. devolver preview legible y tipado,
6. ejecutar borrado real del proyecto cuando `mode === execute`,
7. registrar el evento en `project_purge_events`,
8. devolver ids de briefs y leads que quedaron desvinculados.

La lógica no debe vivir distribuida en el route salvo validaciones HTTP básicas.

---

## 10. Guardrails obligatorios

1. la ruta debe fallar si el proyecto no pertenece al tenant del header,
2. la ruta debe fallar si `mode` no es válido,
3. la ruta debe fallar si faltan `approvedByLabel`, `requestedByLabel` o `reason`,
4. `execute` debe fallar si `confirmationText` no coincide exactamente,
5. la ruta no debe aceptar más de un `projectId` por llamada,
6. la respuesta debe dejar explícito que el scope es solo `project_bundle_only`,
7. la operación no debe tocar `clients`, `briefs` ni `leads` más allá de la desvinculación resultante por FK,
8. toda respuesta de error debe ser JSON controlado, nunca 500 vacío.

---

## 11. Criterios de aceptación

1. existe `POST /api/v1/projects/[id]/purge` con soporte `preview` y `execute`,
2. `preview` informa correctamente cuántas entidades caerán por cascada y cuáles quedarán desvinculadas,
3. `execute` solo funciona con confirmación explícita válida,
4. al ejecutar, el `project` desaparece del tenant activo,
5. `quotations` y `assets` hijos se eliminan por cascada como espera el modelo,
6. `briefs` y `leads` vinculados no se borran y quedan reportados como desvinculados,
7. se persiste un registro en `project_purge_events` por cada ejecución real,
8. los errores salen como respuestas controladas con `error` legible,
9. los tests del slice pasan,
10. se emite checkpoint con riesgos remanentes y exclusiones.

---

## 12. Estrategia de pruebas

### Obligatorias

1. test de preview cuando el proyecto existe y tiene descendencia,
2. test de preview cuando el proyecto no existe en el tenant,
3. test de execute bloqueado por `confirmationText` inválido,
4. test de execute exitoso con auditoría persistida,
5. test de no contaminación entre tenants,
6. test de que briefs y leads quedan en reporte de desvinculación y no en lista de borrado.

### No obligatorias en este corte

1. tests MCP,
2. tests UI,
3. pruebas de lote multi-proyecto,
4. pruebas de purga de cliente o tenant.

---

## 13. Riesgos conocidos

1. asumir que todas las relaciones usan cascada cuando algunas solo usan `set null`,
2. mezclar este slice con purga total del tenant y abrir un blast radius injustificado,
3. intentar resolver identidad humana fuerte dentro del mismo corte y sobredimensionarlo,
4. exponer la operación vía MCP antes de validar el endpoint restringido,
5. dejar respuestas ambiguas si el proyecto existe pero el impacto calculado es parcial.

---

## 14. Orden recomendado para SOFIA

1. crear la migración `project_purge_events`,
2. implementar `Bridge/lib/project-purge.ts` con preview, confirmación canónica y execute,
3. implementar tests de dominio en `Bridge/lib/project-purge.test.ts`,
4. montar `Bridge/app/api/v1/projects/[id]/purge/route.ts` sobre esa capa,
5. validar el slice de forma estrecha,
6. emitir checkpoint.

---

## 15. Definición de terminado

Este slice se considera terminado cuando Bridge puede eliminar de forma controlada un proyecto individual con reporte previo, confirmación explícita y auditoría persistente, dejando listo el reset operativo de casos de prueba sin abrir todavía purgas masivas ni tool MCP destructiva.