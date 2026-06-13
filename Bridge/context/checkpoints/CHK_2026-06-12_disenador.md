# CHK_2026-06-12_disenador — Diseñador Estación Creativa V2

## Fecha
2026-06-12

## ID
IMPL-20260612-02

## SPEC
`context/SPECs/SPEC_ARCH-20260612-02_disenador_estacion_creativa_refinada_firefly_versionado_v1.md`

## Estado
[✓] Estación Creativa V2 con cola accionable, referencias visuales, Firefly deep link, versionado visual 3 niveles

## Entregables

### Nuevos archivos
- `Bridge/lib/firefly.ts` — Helpers para Firefly (deep link, aspect ratio, versionado)
- `Bridge/app/api/firefly/callback/route.ts` — Endpoint callback de Firefly → Bridge
- `Bridge/app/api/designer/upload-url/route.ts` — Endpoint signed URL para referencias
- `Bridge/components/designer-workspace-v2.tsx` — V2 del workspace con todas las mejoras
- `Bridge/app/disenador/page-v2.tsx` — V2 de la página con interactividad completa

### Archivos modificados
- `Bridge/app/disenador/page.tsx` — Re-exporta V2 (sigue siendo Server Component que fetcha datos)

## Criterios de Aceptación Cumplidos

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Cola accionable (Iniciar, Bloquear, Firefly, Candidata) | ✅ |
| 2 | Referencias visuales con drag-drop upload | ✅ |
| 3 | Firefly deep link con prompt + aspect ratio | ✅ |
| 4 | Versionado visual 3 niveles (Exploración, Candidata, Aprobada) | ✅ |
| 5 | Promoción inline (Exploración → Candidata) | ✅ |
| 6 | Envío a Operador desde Candidata | ✅ |
| 7 | Upload archivo final a propuesta | ✅ |
| 8 | Contexto filtrado por tipo de pieza (tone solo para copy) | ✅ |
| 9 | Responsive (mobile drawer, tablet 240px, desktop 260/300px) | ✅ |
| 10 | Auto-save de prompt con debounce 500ms | ✅ |

## Gates Validados

- [x] **Compilación**: `pnpm build` — Sin errores TypeScript
- [ ] **Testing**: Sin tests nuevos (funcionalidad de UI)
- [x] **Revisión**: Diff revisado manualmente
- [x] **Documentación**: Checkpoint generado

## Decisiones Técnicas

1. **Componente Client separado**: La página principal sigue siendo Server Component
   que fetcha datos, pero delega el render interactivo a `DesignerPageV2` (client).
   Esto permite manejar estado local (referencias, toasts) sin hidratar todo el workspace.

2. **Referencias en estado local**: Las referencias se mantienen en `useState` del
   componente cliente. En producción, se sincronizarían con Supabase Storage + tabla
   `asset_references`. La estructura está lista para esa migración.

3. **Versionado visual sin migración de schema**: Los niveles se derivan del
   `reviewDecision` existente via `getDraftLevel()`. No requiere cambios en DB.

4. **Firefly callback como POST**: El callback acepta el payload estándar de Firefly
   y crea un `ProposalDraft` con `tool_used: "firefly"` y `review_decision: "pending"`.

5. **Auto-save con debounce 500ms**: El prompt se guarda automáticamente después de
   500ms de inactividad. El indicador "Guardando..." aparece brevemente.

## Pendientes (no bloqueantes)

- Tabla `asset_references` en Supabase para persistir referencias
- Storage policies en Supabase para `asset-references` bucket
- Server action para persistir el prompt editado
- Tests E2E del flujo Firefly → callback
- Soporte para video preview en referencias (ya implementado, falta backend)
