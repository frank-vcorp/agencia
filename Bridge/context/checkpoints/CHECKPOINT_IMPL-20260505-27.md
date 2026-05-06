# Checkpoint IMPL-20260505-27
**Fecha:** 2026-05-05  
**Agente:** SOFIA - Builder  
**SPEC:** context/SPECs/SPEC_ARCH-20260505-27_vinculacion_explicita_lead_client_project_v1.md  
**Estado:** ✅ Entregado — Soft Gates validados

---

## Resumen de cambios

### `lib/crm.ts`
- Agrega tipos exportados: `CrmClient`, `CrmProject`, `CrmLinkOptions`
- Agrega filas internas: `CrmClientRow`, `CrmProjectRow`
- Nueva función pública `getCrmLinkOptionsForDefaultTenant()`: consulta `clients` y `projects` del tenant en paralelo, devuelve listas vacías si Supabase no está configurado o no hay tenant.
- `CreateLeadInput` extendido con `clientId?: string | null` y `projectId?: string | null`
- `createLeadForDefaultTenant` ahora persiste `client_id` y `project_id` nullable usando spread condicional.

### `app/crm/page.tsx`
- Importa `getBriefWorkspace` de `@/lib/briefing` (sin acoplamiento de tipos cruzados)
- Importa `getCrmLinkOptionsForDefaultTenant` de `@/lib/crm`
- Server component llama las 3 fuentes en `Promise.all`: leads, linkOptions, briefWorkspace
- `createLeadAction` extendida para pasar `clientId` y `projectId` al create
- Formulario: selects de cliente y proyecto aparecen solo si existen datos, con `defaultValue` del contenedor activo
- Proyectos se etiquetan como `"NombreCliente — NombreProyecto"` para diferenciarlos
- Tarjetas de lead: muestran nombre real del cliente y proyecto en lugar de texto genérico

### `lib/crm.test.ts`
- 8 tests nuevos: 3 para `CreateLeadInput` con campos opcionales, 4 para `CrmLinkOptions` incluyendo test de integridad referencial manual
- Total: **74 tests, todos pasan**

---

## Soft Gates

| Gate | Estado | Evidencia |
|------|--------|-----------|
| 1. Compilación | ✅ | `npm run build` — 13 páginas generadas, sin errores |
| 2. Testing | ✅ | 74/74 tests pasan, 8 nuevos del slice 27 |
| 3. Revisión | ✅ | TypeScript sin errores en los 3 archivos modificados |
| 4. Documentación | ✅ | Marcas de agua IMPL-20260505-27, checkpoint generado |

---

## Criterios de aceptación verificados

1. ✅ El operador puede elegir cliente y proyecto desde `/crm` (selects condicionales)
2. ✅ Si existe contenedor activo, el formulario propone esa relación por defecto
3. ✅ `client_id` y `project_id` se persisten en Supabase al crear el lead
4. ✅ La tarjeta del lead muestra nombres reales de cliente y proyecto
5. ✅ Si no hay clientes/proyectos, el formulario sigue permitiendo alta mínima
6. ✅ Build y tests pasan

---

## Archivos modificados (3)

- `Bridge/lib/crm.ts` (+63 líneas netas)
- `Bridge/app/crm/page.tsx` (+75 líneas netas)
- `Bridge/lib/crm.test.ts` (+77 líneas netas)

---

## Riesgos abiertos

- **Filtrado dinámico por cliente**: el select de proyecto muestra todos los proyectos del tenant (no filtra al cambiar el cliente seleccionado). Requeriría JavaScript del lado cliente. Fuera del alcance de este corte según SPEC — se etiquetan con nombre de cliente como mitigación UX.
- **Validación de consistencia cliente/proyecto**: si el operador selecciona un proyecto de cliente A pero un clientId de cliente B, ambos se persisten como enviados. La consistencia depende de que el formulario precargue correctamente. No existe validación back-end cruzada en este slice.

---

## Commit

`ae33bba` — `feat(crm): vincular lead a cliente y proyecto desde formulario de alta`
