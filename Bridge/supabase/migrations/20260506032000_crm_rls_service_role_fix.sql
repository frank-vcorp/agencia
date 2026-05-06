/*
 * FIX-20260505-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-26_crm_ligero_operativo_y_seguimiento_minimo_v1.md
 */

drop policy if exists "Public insert tenant leads" on public.leads;
drop policy if exists "Public update tenant leads" on public.leads;
drop policy if exists "Public insert tenant lead_notes" on public.lead_notes;

drop policy if exists "Service role write leads" on public.leads;
create policy "Service role write leads"
on public.leads
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role write lead_notes" on public.lead_notes;
create policy "Service role write lead_notes"
on public.lead_notes
for all
to service_role
using (true)
with check (true);