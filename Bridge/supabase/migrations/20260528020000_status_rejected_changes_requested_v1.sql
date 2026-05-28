/**
 * ARCH-20260528-03
 * Agrega estados faltantes detectados en revisión del flujo operativo:
 * - 'rejected' en quotations.status -> cotización rechazada por el cliente
 * - 'changes_requested' en assets.status -> activo con cambios solicitados por el cliente
 */

-- Ampliar constraint de estado en cotizaciones
alter table public.quotations
  drop constraint if exists quotations_status_check;

alter table public.quotations
  add constraint quotations_status_check
  check (status in ('draft', 'sent', 'approved', 'invoiced', 'paid', 'rejected'));

-- Ampliar constraint de estado en activos
alter table public.assets
  drop constraint if exists assets_status_check;

alter table public.assets
  add constraint assets_status_check
  check (status in ('draft', 'in_progress', 'in_review', 'approved', 'delivered', 'archived', 'changes_requested'));