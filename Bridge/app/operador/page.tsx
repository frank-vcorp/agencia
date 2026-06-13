/**
 * IMPL-20260612-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-01_operador_dashboard_acciones_crud_comentarios_agente_v1.md
 *
 * V2 del dashboard del operador (Cabina de Control). El Server Component
 * fetcha datos y delega a page-v2 (patron del diseno cliente/disenador).
 *
 * Respaldo: IMPL-20260505-01 | IMPL-20260506-39
 * Respaldo: context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-39_radar_priorizado_operador_por_proyecto.md
 */
import OperadorPageV2 from "./page-v2";

export default async function OperadorPage({
  searchParams
}: {
  searchParams: Promise<{ project?: string; tab?: string }>;
}) {
  return <OperadorPageV2 searchParams={searchParams} />;
}
