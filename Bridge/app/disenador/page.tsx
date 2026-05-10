/**
 * IMPL-20260505-01 | IMPL-20260506-44 | IMPL-20260510-02
 * Respaldo: context/00_ARQUITECTURA.md, context/DIRECCION_VISUAL_V1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-41_workspace_disenador_guiado.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-03_chat_asistente_produccion_disenador.md
 */
import { DesignerChatPanel } from "@/components/designer-chat-panel";
import { DesignerWorkspaceView } from "@/components/designer-workspace";
import { getDesignerWorkspace } from "@/lib/designer-workspace";

export default async function DisenadorPage() {
  const workspace = await getDesignerWorkspace();

  // Extrae contexto del activo enfocado (tarea activa o siguiente sugerida)
  const focusedTask = workspace.activeTask ?? workspace.nextSuggestedTask;
  const assetContext = focusedTask
    ? {
        tool: focusedTask.suggestedTool,
        promptText: focusedTask.promptText ?? "",
        format: focusedTask.formatCode,
        name: focusedTask.assetTitle
      }
    : undefined;

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* Contenido principal del workspace */}
      <div className="min-w-0 flex-1">
        <DesignerWorkspaceView workspace={workspace} />
      </div>

      {/* Asistente de produccion — barra lateral derecha */}
      <DesignerChatPanel assetContext={assetContext} />
    </div>
  );
}
