/**
 * IMPL-20260505-01 | IMPL-20260506-44 | IMPL-20260510-02 | IMPL-20260513-20 | IMPL-20260514-01
 * Respaldo: context/00_ARQUITECTURA.md, context/DIRECCION_VISUAL_V1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-41_workspace_disenador_guiado.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-03_chat_asistente_produccion_disenador.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-20_workspace_disenador_estacion_unica_v2.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260514-01_foco_intra_workspace_disenador_v1.md
 */
import { DesignerChatPanel } from "@/components/designer-chat-panel";
import { DesignerWorkspaceView } from "@/components/designer-workspace";
import { getDesignerWorkspace } from "@/lib/designer-workspace";

export default async function DisenadorPage({
  searchParams
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  const workspace = await getDesignerWorkspace({ focusedAssetId: focus ?? null });

  // El activo enfocado rige el contexto que recibe el asistente de produccion.
  // Usa focusedAsset (tarea activa o siguiente sugerida) para inyectar contexto al chat.
  const focusedTask = workspace.focusedAsset;
  const assetContext = focusedTask
    ? {
        tool: focusedTask.suggestedTool,
        promptText: focusedTask.promptText ?? "",
        format: focusedTask.formatCode,
        name: focusedTask.assetTitle
      }
    : undefined;

  return (
    <DesignerWorkspaceView
      workspace={workspace}
      productionAssistant={<DesignerChatPanel assetContext={assetContext} />}
    />
  );
}
