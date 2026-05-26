/*
 * IMPL-20260526-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-03_eliminacion_operativa_entidades_v1.md
 *
 * Tabla de auditoría para eventos de eliminación de entidades.
 * Permite rastrear qué se borró, por quién y con qué impacto.
 *
 * Columnas:
 *   id                    — PK
 *   tenant_id             — aislamiento multitenant
 *   entity_type           — tipo de entidad: project, quotation, asset, brief
 *   entity_id             — ID de la entidad eliminada
 *   entity_label          — nombre legible para reporte
 *   requested_by_label    — actor que solicitó la eliminación
 *   approved_by_label     — actor que aprobó la eliminación
 *   reason                — razón operativa
 *   mode                  — preview o execute
 *   impact_summary_json   — resumen de impacto calculado
 *   created_at            — timestamp UTC
 */

create table if not exists public.entity_delete_events (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  entity_type           text not null,
  entity_id             uuid not null,
  entity_label          text not null,
  requested_by_label    text not null,
  approved_by_label     text not null,
  reason                text not null,
  mode                  text not null check (mode in ('preview', 'execute')),
  impact_summary_json   jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default timezone('utc'::text, now())
);

create index if not exists entity_delete_events_tenant_idx
  on public.entity_delete_events (tenant_id, created_at desc);

alter table public.entity_delete_events enable row level security;

drop policy if exists "Public read active tenant entity_delete_events" on public.entity_delete_events;
create policy "Public read active tenant entity_delete_events"
on public.entity_delete_events
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = entity_delete_events.tenant_id
      and tenants.status = 'active'
  )
);

drop policy if exists "Service role write entity_delete_events" on public.entity_delete_events;
create policy "Service role write entity_delete_events"
on public.entity_delete_events
for all
to service_role
using (true)
with check (true);
