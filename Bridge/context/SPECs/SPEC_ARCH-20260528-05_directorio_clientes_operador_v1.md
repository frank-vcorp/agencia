# SPEC ARCH-20260528-05: Directorio de Clientes en el Panel del Operador V1

**ID:** ARCH-20260528-05  
**Fecha:** 2026-05-28  
**Estado:** Autorizado — listo para Sofia  
**Respaldo:** Bridge/context/00_ARQUITECTURA.md

---

## 1. Problema

El operador no tiene ninguna vista para ver sus clientes registrados en Bridge. Cuando Vika crea
RodaMax (u otros clientes), el operador no tiene dónde verlos con sus datos de contacto. El único
lugar donde aparecen clientes es indirectamente en el radar de proyectos — pero sin email ni
WhatsApp visibles.

---

## 2. Objetivo

Agregar un módulo `/clientes` al nav de Bridge que muestre el directorio del tenant: nombre de
empresa, nombre del contacto, email, WhatsApp, estado y notas. El operador puede ver de un vistazo
con quién tiene que hablar y por qué canal.

---

## 3. Datos existentes a reutilizar

| Dato | Dónde vive |
|------|------------|
| `getClientsByTenant(tenantId)` | `Bridge/lib/assets.ts` (exportada) |
| `getTenantIdBySlug(slug)` | `Bridge/lib/assets.ts` (exportada) |
| `supabaseEnv.defaultTenant` | `Bridge/lib/supabase.ts` |
| `isSupabaseConfigured` | `Bridge/lib/supabase.ts` |
| Patrón de lib con resolución de tenant | `Bridge/lib/operator-radar.ts` (referencia) |
| Patrón de server component + componente separado | `Bridge/app/operador/page.tsx` + `Bridge/components/operator-radar.tsx` |
| `ModuleKey`, `modulePages` en nav | `Bridge/lib/bridge-data.ts` |

Los campos que `getClientsByTenant()` retorna son:
`id, name, legal_name, status, primary_contact_name, primary_contact_email, primary_contact_whatsapp, primary_contact_channel, notes`

---

## 4. Datos a crear

| Dato | Dónde se crea |
|------|---------------|
| Tipo `ClientSummary` | `Bridge/lib/clients.ts` |
| Tipo `ClientDirectory` | `Bridge/lib/clients.ts` |
| Función `getClientDirectory()` | `Bridge/lib/clients.ts` |
| Componente `ClientListView` | `Bridge/components/client-list.tsx` |
| Ruta `/clientes` | `Bridge/app/clientes/page.tsx` |
| `"clientes"` en `ModuleKey` | `Bridge/lib/bridge-data.ts` |
| Entry `clientes` en `modulePages` | `Bridge/lib/bridge-data.ts` |

---

## 5. Archivos exactos

| # | Archivo | Tipo |
|---|---------|------|
| 1 | `Bridge/lib/clients.ts` | NUEVO |
| 2 | `Bridge/app/clientes/page.tsx` | NUEVO |
| 3 | `Bridge/components/client-list.tsx` | NUEVO |
| 4 | `Bridge/lib/bridge-data.ts` | MODIFICAR |

Máximo permitido: 4 archivos. No crear más.

---

## 6. Contratos exactos

### 6.1 `Bridge/lib/clients.ts`

```typescript
/**
 * IMPL-ARCH-20260528-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-05_directorio_clientes_operador_v1.md
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";
import { getTenantIdBySlug, getClientsByTenant } from "./assets";

export type ClientStatus = "active" | "prospect" | "inactive";

export type ClientSummary = {
  id: string;
  name: string;
  legalName: string | null;
  status: ClientStatus;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactWhatsapp: string | null;
  primaryContactChannel: string | null;
  notes: string | null;
};

export type ClientDirectory = {
  tenantSlug: string;
  clients: ClientSummary[];
  isEmpty: boolean;
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Activo",
  prospect: "Prospecto",
  inactive: "Inactivo",
};

export async function getClientDirectory(tenantSlug?: string): Promise<ClientDirectory> {
  const slug = tenantSlug ?? supabaseEnv.defaultTenant;
  
  if (!isSupabaseConfigured) {
    return { tenantSlug: slug, clients: [], isEmpty: true };
  }

  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return { tenantSlug: slug, clients: [], isEmpty: true };
  }

  const rows = await getClientsByTenant(tenantId);
  const clients: ClientSummary[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    status: (row.status as ClientStatus) ?? "active",
    primaryContactName: row.primary_contact_name,
    primaryContactEmail: row.primary_contact_email,
    primaryContactWhatsapp: row.primary_contact_whatsapp,
    primaryContactChannel: row.primary_contact_channel,
    notes: row.notes,
  }));

  return { tenantSlug: slug, clients, isEmpty: clients.length === 0 };
}
```

### 6.2 `Bridge/app/clientes/page.tsx`

Server component. Sin params. Llama `getClientDirectory()`. Renderiza `<ClientListView directory={directory} />`.

Debe incluir el comentario de watermark con ID `IMPL-ARCH-20260528-05` y ruta a la SPEC.

### 6.3 `Bridge/components/client-list.tsx`

Client component. Props: `{ directory: ClientDirectory }`.

**Vista cuando `isEmpty`:** mensaje neutro "Aún no hay clientes registrados." sin iconos decorativos.

**Vista cuando hay clientes:** lista de tarjetas (una por cliente). Cada tarjeta muestra:
- Nombre de empresa (bold, tamaño base)
- Nombre legal entre paréntesis o nulo (texto secundario pequeño)
- Badge de estado (`active` → verde, `prospect` → ámbar, `inactive` → gris) — usando `CLIENT_STATUS_LABELS`
- Nombre del contacto principal (si existe)
- Email como `<a href="mailto:...">` (si existe)
- WhatsApp como `<a href="https://wa.me/...">` (si existe, limpiar no-dígitos antes del href, mantener texto original en el label)
- Notes truncadas a 80 chars (si existen)

Estilo consistente con el resto de Bridge: clases `panel`, `rounded-[28px]`, `ring-1 ring-[color:var(--line)]`, paleta `var(--accent)`, `var(--muted)`. No inventar nuevas variables CSS.

### 6.4 `Bridge/lib/bridge-data.ts`

**Cambio 1:** En la definición de `ModuleKey`:
```typescript
// Antes
export type ModuleKey = "briefs" | "cotizaciones" | "activos" | "crm" | "contexto-agentes";
// Después
export type ModuleKey = "briefs" | "cotizaciones" | "activos" | "crm" | "contexto-agentes" | "clientes";
```

**Cambio 2:** Al final del array `modulePages` (antes del cierre `]`), agregar:
```typescript
{
  key: "clientes",
  href: "/clientes",
  label: "Clientes",
  description: "Directorio del tenant con contacto estructurado por cliente.",
  metric: ""
}
```

---

## 7. Criterios de aceptación

1. `/clientes` está accesible y no da error 404 ni 500.
2. La sidebar muestra "Clientes" en la sección "Objetos compartidos".
3. Si hay clientes en DB, se listan con nombre, email y WhatsApp.
4. Si no hay clientes, se muestra mensaje vacío.
5. Los links de email y WhatsApp son funcionales (`mailto:` y `https://wa.me/`).
6. `npm run build` pasa sin errores TypeScript.

---

## 8. Contrato de ejecución para Sofia

- **Archivo ancla inicial:** `Bridge/lib/bridge-data.ts` (modificar primero para que el tipo compile)
- **Datos existentes:** `getClientsByTenant()` y `getTenantIdBySlug()` en `lib/assets.ts` — NO reimplementar
- **Datos a crear:** `ClientSummary`, `ClientDirectory`, `getClientDirectory()` en `lib/clients.ts` nuevo
- **Archivos exactos:** los 4 listados en §5 — no tocar otros archivos
- **Máximo:** 4 archivos
- **Validación esperada:** `npm run build` sin errores TypeScript
- **Condición de detención:** si `getClientsByTenant` no está exportada en `lib/assets.ts`, reportar BLOQUEO DE CONTEXTO. (Sí está exportada — ver línea ~900 de `lib/assets.ts`.)
