/**
 * IMPL-20260505-01 | IMPL-20260506-39
 * Respaldo: context/00_ARQUITECTURA.md, context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-39_radar_priorizado_operador_por_proyecto.md
 */
import { OperatorRadarView } from "@/components/operator-radar";
import { getOperatorRadar } from "@/lib/operator-radar";

export default async function OperadorPage() {
  const radar = await getOperatorRadar();
  return <OperatorRadarView radar={radar} />;
}
