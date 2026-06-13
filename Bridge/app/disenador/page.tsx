/**
 * IMPL-20260612-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-02_disenador_estacion_creativa_refinada_firefly_versionado_v1.md
 *
 * V2 del workspace del diseñador con cola accionable, referencias visuales,
 * Firefly deep link, y versionado visual 3 niveles.
 *
 * IMPL-20260505-01 | IMPL-20260506-44 | IMPL-20260510-02 | IMPL-20260513-20 | IMPL-20260514-01
 * Respaldo: context/00_ARQUITECTURA.md, context/DIRECCION_VISUAL_V1.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-41_workspace_disenador_guiado.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-03_chat_asistente_produccion_disenador.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-20_workspace_disenador_estacion_unica_v2.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260514-01_foco_intra_workspace_disenador_v1.md
 */
import { getDesignerWorkspace } from "@/lib/designer-workspace";

import DesignerPageV2 from "./page-v2";

export default async function DisenadorPage({
  searchParams
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  const workspace = await getDesignerWorkspace({ focusedAssetId: focus ?? null });

  return <DesignerPageV2 workspace={workspace} />;
}
