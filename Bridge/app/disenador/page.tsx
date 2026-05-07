/**
 * IMPL-20260505-01 | IMPL-20260506-44
 * Respaldo: context/00_ARQUITECTURA.md, context/DIRECCION_VISUAL_V1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-41_workspace_disenador_guiado.md
 */
import { DesignerWorkspaceView } from "@/components/designer-workspace";
import { getDesignerWorkspace } from "@/lib/designer-workspace";

export default async function DisenadorPage() {
  const workspace = await getDesignerWorkspace();
  return <DesignerWorkspaceView workspace={workspace} />;
}
