# SPEC ARCH-20260528-04

## Titulo

Chat de briefing conversacional en portal del cliente — V1

## ID

ARCH-20260528-04

## Estado

Planificada

## Fecha

2026-05-28

## SPEC de comportamiento de referencia

SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md

## Objetivo

Exponer la lógica de briefing ya construida en `lib/briefing.ts` como superficie conversacional en el portal del cliente. El cliente debe poder iniciar o continuar su brief desde su portal, dentro del proyecto que el operador ya creó para él, sin ver complejidad interna de Bridge.

## Problema que Resuelve

`lib/briefing.ts` implementa las 3 etapas de briefing (Discovery, Precision, Commercial Fit), mensajes persistidos, resumen estructurado y envío a revisión del operador.

`app/briefs/page.tsx` expone esa lógica al **operador**, no al cliente.

`app/cliente/` solo tiene la vista de resultados y leads. No existe ninguna ruta ni componente para que el cliente cree o continúe su brief desde su portal.

Sin esta superficie, el brief debe ser creado por el operador directamente, lo que rompe el flujo definido en `FLUJO_BRANDKIT_ADOBE_V1.md` (v3), donde el brief lo genera el cliente conversacionalmente dentro de un proyecto preexistente.

## Decisión Arquitectónica

Crear la superficie mínima del cliente para briefing sobre la lib existente.

No se modifica `lib/briefing.ts` en su lógica de negocio. Solo se agregan dos funciones de acceso por `projectId`:
- `getBriefByProjectId` — obtiene el brief activo de un proyecto
- `createBriefForProject` — crea un nuevo brief vinculado a un proyecto explícito

El componente cliente usa tono natural, oculta terminología interna (no muestra "stage_1_discovery", "commercial_fit", etc.), muestra el estado de avance en lenguaje simple y bloquea el input cuando el brief está en revisión del operador.

## Datos Existentes a Reutilizar

| Artefacto | Ruta | Qué aporta |
|---|---|---|
| Tipos y funciones de briefing | `Bridge/lib/briefing.ts` | `BriefRecord`, `BriefVersion`, `BriefMessage`, `BriefingStage`, `buildAssistantGuidance`, `appendClientBriefMessage`, `submitBriefForOperatorReview`, `advanceBriefStage`, `getCriticalMissingFields` |
| Función de creación base | `lib/briefing.ts` L778 `createBriefForDefaultTenant` | Patrón exacto a replicar para `createBriefForProject` |
| Función de lectura base | `lib/briefing.ts` L743 `getBriefWorkspace` | Patrón exacto a replicar para `getBriefByProjectId`, usando `project_id=eq.{projectId}` en la query de `briefs` |
| Layout del cliente | `Bridge/app/cliente/layout.tsx` | Mobile-first, max-w-xl, PWA manifest — la nueva ruta hereda este layout automáticamente |
| Página principal del cliente | `Bridge/app/cliente/page.tsx` | Agregar CTA de acceso al brief |

## Datos Faltantes a Crear

### 1. `getBriefByProjectId` en `lib/briefing.ts`

Función pública nueva. Firma:
```ts
export async function getBriefByProjectId(
  projectId: string,
  tenantSlug?: string
): Promise<BriefRecord | null>
```

Implementación: igual que `getBriefWorkspace`, pero en lugar de `getLatestBriefRow(tenant.id)` usa una query filtrada por `project_id=eq.{projectId}` AND `tenant_id=eq.{tenantId}`, orden `updated_at.desc`, limit 1.

### 2. `createBriefForProject` en `lib/briefing.ts`

Función pública nueva. Firma:
```ts
export async function createBriefForProject(
  projectId: string,
  tenantSlug?: string
): Promise<BriefRecord>
```

Implementación: igual que `createBriefForDefaultTenant`, pero en el INSERT de `briefs` usar `project_id: projectId` explícito en lugar de `activeContainer.project?.id`. Resolver `client_id` desde `getProjectContainerById(projectId)`.

### 3. `Bridge/app/cliente/brief/[projectId]/page.tsx`

Server component. Recibe `params: Promise<{ projectId: string }>`.

Lógica:
1. Await `params` para obtener `projectId`.
2. Llamar `getBriefByProjectId(projectId)`.
3. Si no existe brief → llamar `createBriefForProject(projectId)` (crea y devuelve).
4. Renderizar `<ClientBriefChatView brief={brief} projectId={projectId} />`.

### 4. `Bridge/app/cliente/brief/[projectId]/actions.ts`

Server actions. Tres acciones:

**`sendClientMessageAction(briefId, versionId, messageText)`**
- Llama `appendClientBriefMessage({ briefId, versionId, messageText })` — usa `author_role: "client"`, `actor_label: "Cliente"`, actorUserId/actorMembershipId/actorAgentId todos null.
- Llama `appendBriefMessage` con `author_role: "assistant"` usando `buildAssistantGuidance(stage, summary)` como texto.
- Llama `revalidatePath(\`/cliente/brief/${projectId}\`)`.

**`advanceStageAction(briefId, versionId)`**
- Llama `advanceBriefStage({ briefId, versionId })`.
- Llama `revalidatePath(\`/cliente/brief/${projectId}\`)`.

**`submitBriefAction(briefId, versionId)`**
- Llama `submitBriefForOperatorReview({ briefId, versionId })`.
- Llama `revalidatePath(\`/cliente/brief/${projectId}\`)`.

### 5. `Bridge/components/client-brief-chat.tsx`

Client component. Props:
```ts
type ClientBriefChatViewProps = {
  brief: BriefRecord;
  projectId: string;
};
```

Estructura visual (mobile-first, dentro del layout existente del cliente):

**Encabezado** — nombre del proyecto (`brief.container.project?.name ?? "Tu proyecto"`), indicador de etapa en lenguaje simple:
- `discovery` → "Etapa 1 de 3 — Cuéntanos qué necesitas"
- `precision` → "Etapa 2 de 3 — Vamos a los detalles"
- `commercial_fit` → "Etapa 3 de 3 — Cerramos el encaje"
- `pending_operator_review` o `operator_review_in_progress` → "Brief enviado — Tu asesor lo está revisando"
- `approved_locked` → "Brief aprobado"
- `returned_for_rework` → "Tu asesor pidió ajustes"

**Lista de mensajes** — renderiza `brief.currentVersion?.messages` en orden cronológico. Mensajes `authorRole === "client"` alineados a la derecha (burbuja stone/neutral). Mensajes `authorRole === "assistant"` alineados a la izquierda (burbuja blanca con borde). Mensajes `authorRole === "operator"` alineados a la izquierda con etiqueta "Tu asesor".

**Input de texto** — textarea + botón "Enviar". Solo visible y habilitado si `brief.currentVersion?.editable === true`. Disabled con mensaje "En revisión" si `status === "pending_operator_review" || "operator_review_in_progress"`. Disabled con mensaje "Brief aprobado" si `status === "approved_locked"`.

**Botón "Avanzar etapa"** — visible si `editable === true` y la etapa no es `commercial_fit` y el stage actual tiene al menos 1 mensaje del cliente. Label: "Continuar a etapa siguiente →".

**Botón "Enviar a revisión"** — visible si `editable === true` y `stage === "commercial_fit"` y hay al menos 1 mensaje del cliente en esta etapa. Label: "Enviar brief para revisión". Usa `submitBriefAction`.

**Resumen estructurado** — colapsable, al fondo. Solo muestra campos con valor. Label: "Resumen de lo que capturamos hasta aquí". No editable desde esta vista.

## Archivos Exactos a Crear o Modificar

| Archivo | Acción | Descripción |
|---|---|---|
| `Bridge/lib/briefing.ts` | MODIFICAR | Agregar `getBriefByProjectId` y `createBriefForProject` al final del archivo, antes del EOF |
| `Bridge/app/cliente/brief/[projectId]/page.tsx` | CREAR | Server component — carga o crea brief por projectId |
| `Bridge/app/cliente/brief/[projectId]/actions.ts` | CREAR | Server actions — sendClientMessage, advanceStage, submitBrief |
| `Bridge/components/client-brief-chat.tsx` | CREAR | Client component — UI de chat conversacional del cliente |
| `Bridge/app/cliente/page.tsx` | MODIFICAR | Agregar CTA "Completar brief" o "Ver brief" que enlace a `/cliente/brief/{projectId}` cuando exista un proyecto activo en `portal.project` |

## Máximo de Archivos Permitidos

5 (exactamente los listados arriba).

## Contrato de Ejecución para Sofia

**Archivo ancla inicial:** `Bridge/lib/briefing.ts` — leer primero, específicamente las funciones `getBriefWorkspace` (L743) y `createBriefForDefaultTenant` (L778) para entender el patrón exacto antes de crear las dos nuevas funciones.

**Datos existentes a reutilizar:**
- `appendClientBriefMessage` en `lib/briefing.ts` — ya implementada, úsala directamente en la action `sendClientMessageAction`
- `submitBriefForOperatorReview` en `lib/briefing.ts` — ya implementada, úsala en `submitBriefAction`
- `advanceBriefStage` en `lib/briefing.ts` — ya implementada, úsala en `advanceStageAction`
- `buildAssistantGuidance(stage, summary)` en `lib/briefing.ts` — devuelve el texto del asistente para cada etapa
- `appendBriefMessage` exportado de `lib/chat.ts` — úsalo para insertar el mensaje del asistente después del mensaje del cliente
- `BriefRecord`, `BriefVersion`, `BriefMessage` — tipos ya definidos en `lib/briefing.ts`, no redefinir

**Datos faltantes a crear:**
- `getBriefByProjectId` — nueva función en `lib/briefing.ts` (ver firma en "Datos Faltantes a Crear")
- `createBriefForProject` — nueva función en `lib/briefing.ts` (ver firma en "Datos Faltantes a Crear")
- Los tres archivos nuevos listados en la tabla de arriba

**Validación esperada:**
```bash
cd Bridge && npm run build
```
Sin errores TypeScript. Sin errores de build de Next.js.

**Condición de detención si falta contexto:**
- Si `appendBriefMessage` no está exportado de `lib/chat.ts`, revisar `lib/briefing.ts` — puede estar ahí mismo. No inventar la función.
- Si `advanceBriefStage` no existe en `lib/briefing.ts`, declarar BLOQUEO DE CONTEXTO y no implementar `advanceStageAction`.
- No explorar más de 3 archivos adicionales fuera de los 5 listados. Si se necesita un 6to archivo, declarar BLOQUEO DE CONTEXTO.

## Criterios de Aceptación

1. El cliente puede acceder a `/cliente/brief/{projectId}` y ver la conversación de briefing.
2. Si no existe un brief para ese proyecto, se crea automáticamente con el mensaje inicial del asistente.
3. El cliente puede enviar mensajes y el asistente responde automáticamente con `buildAssistantGuidance`.
4. El cliente puede avanzar de etapa (Discovery → Precision → Commercial Fit).
5. El cliente puede enviar el brief a revisión del operador desde la etapa Commercial Fit.
6. Cuando el brief está en `pending_operator_review` o superior, el input queda bloqueado con mensaje claro.
7. `npm run build` pasa sin errores TypeScript.
8. La UI no usa terminología interna (no mostrar "stage_1_discovery", "commercial_fit", "BriefRecord", etc.).

## Restricciones

- No modificar la lógica existente de `lib/briefing.ts` — solo agregar las dos funciones nuevas al final.
- No tocar `app/briefs/page.tsx` ni la interfaz del operador.
- No agregar dependencias nuevas (npm packages).
- No crear rutas API adicionales — usar server actions directamente.
- El componente `client-brief-chat.tsx` debe ser un Client Component (`"use client"`) que recibe los datos como props del server component padre.
- Las acciones del servidor deben vivir en `app/cliente/brief/[projectId]/actions.ts`, no en el componente.
