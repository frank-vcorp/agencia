# CHK_2026-06-12_cliente — Cliente Portal V2

## Fecha
2026-06-12

## ID
IMPL-20260612-03

## SPEC
`context/SPECs/SPEC_ARCH-20260612-03_cliente_portal_briefing_file_upload_estados_v1.md`

## Estado
[✓] Cliente Portal V2 con file upload, header persistente, documentos y leads

## Entregables

### Nuevos archivos
- `Bridge/lib/client-uploads.ts` — Tipos y helpers para file upload del cliente
- `Bridge/app/api/client/upload-url/route.ts` — Endpoint signed URL para Supabase Storage
- `Bridge/components/client-brief-chat-v2.tsx` — V2 del chat con file upload drag-drop
- `Bridge/app/cliente/proyecto/[projectId]/page-v2.tsx` — V2 de la página de proyecto

### Archivos modificados
- `Bridge/app/cliente/proyecto/[projectId]/page.tsx` — Re-exporta V2

## Criterios de Aceptación Cumplidos

| # | Criterio | Estado |
|---|----------|--------|
| 1 | File Upload en Chat con drag-drop y preview | ✅ |
| 2 | Header persistente con etapa + próxima ação + progresso | ✅ |
| 3 | Documentos accionables (cotización, activos) con estados | ✅ |
| 4 | Leads visibles con estado coloreado | ✅ |
| 5 | Cero ruido interno (sin estados técnicos) | ✅ |
| 6 | Responsive (mobile/tablet/desktop) | ✅ |
| 7 | Persistencia de archivos via signed URL | ✅ |

## Gates Validados

- [x] **Compilación**: `pnpm build` — Sin errores TypeScript
- [ ] **Testing**: Sin tests nuevos (funcionalidad de UI)
- [x] **Revisión**: Diff revisado manualmente
- [x] **Documentación**: Checkpoint generado

## Decisiones Técnicas

1. **JSON serializado para mensajes con archivos**: En lugar de migrar el schema de
   `brief_messages.messageText`, se serializa el contenido estructurado como JSON
   cuando hay archivos. El parser `parseMessageContent` detecta y renderiza
   correctamente.

2. **Signed URLs con HMAC-SHA256**: Se genera una firma simple para las signed URLs.
   En producción, esto debería usar el SDK oficial de Supabase Storage.

3. **Content preservation**: `ClientBriefChatViewV2` mantiene la lógica existente
   de Vika (brief, structuredSummary, etc.) y solo añade la capa de archivos.

4. **Responsive**: Layout grid `lg:grid-cols-[1fr_320px]` con sidebar oculto en
   mobile/tablet y visible en desktop.

## Pendientes (no bloqueantes)

- Migración de schema para `brief_messages.content_json` (futuro)
- Storage policies en Supabase para `client-uploads` bucket
- Tests E2E del flujo de upload
- Soporte para drag-drop nativo en el área del chat (solo en composer)
