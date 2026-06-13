/**
 * IMPL-20260612-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-01_operador_dashboard_acciones_crud_comentarios_agente_v1.md
 *
 * V2 del dashboard del operador — Cabina de Control.
 * Server Component que carga los datos desde la capa de cabina y delega
 * el render interactivo a OperatorCabinViewV2 (client component).
 */
import { OperatorCabinViewV2 } from "@/components/operator-cabin-v2";
import { getOperatorCabin } from "@/lib/operator-radar";

export default async function OperadorPageV2({
  searchParams
}: {
  searchParams: Promise<{ project?: string; tab?: string }>;
}) {
  const { project, tab } = await searchParams;
  const cabin = await getOperatorCabin(undefined, project ?? null);

  return (
    <OperatorCabinViewV2
      cabin={cabin}
      initialTab={tab ?? null}
    />
  );
}
