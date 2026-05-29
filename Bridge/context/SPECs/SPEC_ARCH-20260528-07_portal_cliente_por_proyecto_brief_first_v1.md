# SPEC ARCH-20260528-07: Portal cliente por proyecto con brief conversacional como entrada principal — V1

**ID:** ARCH-20260528-07  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-28  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo:** `Bridge/context/FLUJO_BRANDKIT_ADOBE_V1.md`, `Bridge/context/SPECs/SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md`, `Bridge/context/SPECs/SPEC_ARCH-20260528-04_brief_chat_portal_cliente_v1.md`

---

## 1. Objetivo unico y medible

Dejar `Bridge/app/cliente/proyecto/[projectId]/page.tsx` como entrada canonica del portal cliente para este corte, y hacer que `Bridge/app/cliente/page.tsx` deje de depender de un brief preexistente para enviar al cliente a su proyecto.

## 2. Problema exacto que resuelve

Hoy la experiencia del cliente quedo partida en dos ideas:

1. una portada `/cliente` heredada del corte comercial/PWA,
2. una ruta `/cliente/brief/[projectId]` que ya representa mejor el flujo real del negocio, pero con una URL poco obvia para el cliente.

El flujo operativo acordado es claro:

1. el operador crea cliente y proyecto,
2. el cliente entra a su proyecto,
3. el cliente crea o continua su brief conversacional con IA dentro de ese proyecto.

La portada actual no gobierna correctamente ese flujo porque su CTA al brief depende de `getBriefWorkspace()`. Si el proyecto existe pero el brief todavia no fue creado, la portada no puede resolver la entrada aunque la ruta por proyecto si pueda crearlo automaticamente.

Ademas, la URL actual `/cliente/brief/[projectId]` no comunica de forma suficientemente clara que el cliente esta entrando a su proyecto.

## 3. Decision arquitectonica cerrada

Para este slice, el portal cliente se define **por proyecto** y el brief conversacional es la entrada principal.

La ruta canonica del cliente para este corte es:

`/cliente/proyecto/[projectId]`

Consecuencias obligatorias:

1. `/cliente/proyecto/[projectId]` pasa a ser la superficie principal del cliente.
2. `app/cliente/page.tsx` deja de ser la experiencia primaria; queda como entrada de compatibilidad.
3. La entrada de compatibilidad debe resolver el proyecto activo sin requerir que el brief ya exista.
4. La capa informativa adicional del portal cliente posterior al brief queda **fuera de alcance** de esta SPEC y se tratara en un slice independiente.
5. La ruta legacy `/cliente/brief/[projectId]` debe mantenerse solo como compatibilidad y redirigir a la nueva ruta canonica.
6. Todo link visible que hoy apunte al panel cliente por proyecto debe publicar la nueva ruta canonica.

## 4. Datos existentes a reutilizar

1. `Bridge/app/cliente/brief/[projectId]/page.tsx` ya implementa el patron leer-o-crear por `projectId` y sirve como referencia funcional.
2. `Bridge/lib/briefing.ts` ya expone `getBriefByProjectId(projectId)` y `createBriefForProject(projectId)`.
3. `Bridge/components/client-brief-chat.tsx` ya implementa la superficie conversacional del brief cliente.
4. `Bridge/lib/client-portal.ts` ya resuelve señales del cliente y tiene helpers locales de lectura por PostgREST.
5. `Bridge/lib/clients.ts` ya demuestra el patron operativo correcto para resolver `recentProjectId` por cliente sin depender del brief.
6. `Bridge/app/cliente/brief/[projectId]/actions.ts` ya concentra las server actions del chat y puede reutilizarse si Sofia mantiene ese archivo como capa interna.

## 5. Datos faltantes a crear

### 5.1 En `Bridge/lib/client-portal.ts`

Agregar al contrato `ClientPortal` los siguientes campos nuevos:

```ts
activeProjectId: string | null;
briefEntryState: "start" | "continue" | "view";
```

Reglas exactas:

1. `activeProjectId` usa primero `brief.project_id` si existe.
2. Si no existe `brief.project_id`, debe resolver el proyecto mas reciente del tenant en una lectura local de `projects` ordenada por `updated_at.desc`, `limit 1`.
3. `briefEntryState` se deriva asi:
   - `start` si no existe brief para ese proyecto,
   - `view` si el brief existe y su status es `approved_locked`,
   - `continue` para cualquier otro caso.

Crear el helper interno minimo necesario para ese lookup si hace falta:

```ts
async function fetchMostRecentProject(tenantId: string): Promise<ProjectRow | null>
```

### 5.2 En `Bridge/app/cliente/page.tsx`

La pagina deja de consultar `getBriefWorkspace()`.

Debe usar exclusivamente `getClientPortal()` para resolver el proyecto activo y decidir la navegacion.

Comportamiento exacto:

1. Si `portal.activeProjectId` existe, hacer `redirect(`/cliente/proyecto/${portal.activeProjectId}`)` desde el server component.
2. Si no existe `portal.activeProjectId`, renderizar un estado vacio honesto indicando que todavia no hay un proyecto asignado para iniciar el brief.
3. No renderizar la portada comercial anterior como experiencia primaria cuando ya existe proyecto activo.

### 5.3 En la nueva ruta canonica `Bridge/app/cliente/proyecto/[projectId]/page.tsx`

Crear la nueva ruta canonica reutilizando el mismo comportamiento funcional ya validado para el brief cliente.

Comportamiento exacto:

1. Await `params` y obtener `projectId`.
2. Leer el brief con `getBriefByProjectId(projectId)`.
3. Si no existe, crearlo con `createBriefForProject(projectId)`.
4. Renderizar `ClientBriefChatView` con ese brief.

### 5.4 En la ruta legacy `Bridge/app/cliente/brief/[projectId]/page.tsx`

Mantener compatibilidad con redireccion server-side:

1. Await `params`.
2. Hacer `redirect(`/cliente/proyecto/${projectId}`)`.

### 5.5 En links visibles del sistema

Actualizar el link visible que hoy expone la URL del panel cliente por proyecto para que use la nueva ruta canonica.

Minimo obligatorio de este corte:

1. `Bridge/components/client-list.tsx` debe mostrar `/cliente/proyecto/{projectId}`.

### 5.6 En `Bridge/app/cliente/brief/[projectId]/actions.ts`

Las actions pueden permanecer en ese archivo como capa interna para no abrir mas alcance, pero deben revalidar la nueva ruta canonica:

1. `revalidatePath(`/cliente/proyecto/${projectId}`)`.
2. No es obligatorio mover el archivo de actions a `proyecto/[projectId]/actions.ts` en este corte.

## 6. Archivos exactos a crear o modificar

1. `Bridge/lib/client-portal.ts` — MODIFICAR
2. `Bridge/app/cliente/page.tsx` — MODIFICAR
3. `Bridge/app/cliente/proyecto/[projectId]/page.tsx` — CREAR
4. `Bridge/app/cliente/brief/[projectId]/page.tsx` — MODIFICAR
5. `Bridge/app/cliente/brief/[projectId]/actions.ts` — MODIFICAR
6. `Bridge/components/client-list.tsx` — MODIFICAR

Maximo permitido: 6 archivos. Este alcance queda expresamente autorizado por la decision de producto de renombrar la ruta canonica.

## 7. Cambio exacto esperado

1. La ruta principal del cliente queda operativamente centrada en `/cliente/proyecto/[projectId]`.
2. `/cliente` deja de depender de la existencia previa del brief para enviar al cliente a su proyecto.
3. Si existe proyecto activo pero aun no existe brief, el cliente igual llega a `/cliente/proyecto/[projectId]` y esa ruta crea el brief.
4. `/cliente/brief/[projectId]` queda como compatibilidad y redirige a la nueva ruta.
5. El dashboard comercial previo deja de gobernar la entrada principal del cliente.

## 8. Restricciones de alcance

1. No redisenar `Bridge/components/client-brief-chat.tsx`.
2. No modificar `Bridge/lib/briefing.ts` salvo que TypeScript obligue por contrato; si eso pasa, detenerse y devolver `BLOQUEO DE CONTEXTO`.
3. No tocar MCT, emails, magic links ni la generacion automatica del link por evento; ese slice queda fuera de esta SPEC.
4. No reintroducir la portada comercial como experiencia primaria.
5. No agregar dependencias nuevas.

## 9. Validacion minima obligatoria

1. `cd Bridge && npm run build`

## 10. Criterios de aceptacion verificables

1. `app/cliente/page.tsx` ya no usa `getBriefWorkspace()`.
2. Cuando existe proyecto activo, `/cliente` redirige a `/cliente/proyecto/[projectId]`.
3. Cuando no existe proyecto activo, `/cliente` muestra estado vacio honesto en vez de una CTA rota o dependiente del brief.
4. Si el proyecto existe sin brief previo, la entrada sigue funcionando porque `/cliente/proyecto/[projectId]` conserva el patron leer-o-crear.
5. La ruta legacy `/cliente/brief/[projectId]` redirige correctamente a `/cliente/proyecto/[projectId]`.
6. El link visible del panel cliente por proyecto usa `/cliente/proyecto/[projectId]`.
7. `npm run build` termina sin errores.

## 11. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/lib/client-portal.ts`

**Datos existentes a reutilizar:**
1. `getClientPortal()`
2. `fetchMostRecentBrief()`
3. `fetchProjectById()`
4. `postgrest()`
5. Patron `recentProjectId` de `Bridge/lib/clients.ts` solo como referencia de comportamiento

**Datos faltantes a crear:**
1. `activeProjectId` en `ClientPortal`
2. `briefEntryState` en `ClientPortal`
3. `fetchMostRecentProject()` dentro de `Bridge/lib/client-portal.ts` si hace falta

**Archivos exactos a tocar:**
1. `Bridge/lib/client-portal.ts`
2. `Bridge/app/cliente/page.tsx`
3. `Bridge/app/cliente/proyecto/[projectId]/page.tsx`
4. `Bridge/app/cliente/brief/[projectId]/page.tsx`
5. `Bridge/app/cliente/brief/[projectId]/actions.ts`
6. `Bridge/components/client-list.tsx`

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`

**Condicion de detencion si falta contexto:**
1. Si para resolver el proyecto activo hay que tocar autenticacion, tenant runtime o rutas del brief, devolver `BLOQUEO DE CONTEXTO`.
2. Si el cambio exige modificar mas de 6 archivos, devolver `BLOQUEO DE CONTEXTO`.

## 12. Fuera de alcance explicito

1. Definir la capa informativa posterior al brief dentro del portal del cliente.
2. Exponer entregables, activos, revisiones o resultados dentro de una nueva vista por proyecto.
3. Cambiar el contrato de emails o WhatsApp para emitir links por proyecto.
4. Mover o duplicar la logica del brief a un segundo componente distinto de `ClientBriefChatView`.

## 13. Definicion de terminado

Slice terminado cuando la entrada general `/cliente` deja de gobernar la experiencia, el proyecto activo se resuelve sin depender de un brief previo, la navegacion principal del cliente queda efectivamente centrada en `/cliente/proyecto/[projectId]`, y la ruta anterior queda solo como compatibilidad.