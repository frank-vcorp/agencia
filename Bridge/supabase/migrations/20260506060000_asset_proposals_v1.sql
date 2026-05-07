/*
 * IMPL-20260506-46
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-46_cierre_activo_propuestas_persistentes_y_revision.md
 *
 * Persistencia mínima de propuestas por activo creativo.
 * Cierra el vacio "asset_proposals tabla no existe" del corte 45.
 *
 * Columnas:
 *   is_primary      — la propuesta designada como principal por el operador/diseñador
 *   note            — descripción corta del diseñador sobre esta entrega
 *   tool_used       — herramienta creativa usada en la estación Adobe
 *   prompt_version_id — referencia trazable al prompt origen (nullable si se pierde el vínculo)
 *   review_decision — estado operativo interno: pending | needs_adjustment | in_review | approved_internal
 */

create table if not exists public.asset_proposals (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null references public.tenants(id) on delete cascade,
  asset_id          uuid        not null references public.assets(id) on delete cascade,
  prompt_version_id uuid        references public.asset_prompt_versions(id) on delete set null,
  is_primary        boolean     not null default false,
  note              text        not null,
  tool_used         text        not null default 'other'
    check (tool_used in ('firefly', 'adobe_express', 'photoshop', 'other')),
  review_decision   text        not null default 'pending'
    check (review_decision in ('pending', 'needs_adjustment', 'in_review', 'approved_internal')),
  created_at        timestamptz not null default timezone('utc'::text, now())
);

create index if not exists asset_proposals_asset_idx
  on public.asset_proposals (asset_id, created_at desc);

alter table public.asset_proposals enable row level security;

drop policy if exists "Public read active tenant asset_proposals" on public.asset_proposals;
create policy "Public read active tenant asset_proposals"
on public.asset_proposals
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = asset_proposals.tenant_id
      and tenants.status = 'active'
  )
);

drop policy if exists "Service role write asset_proposals" on public.asset_proposals;
create policy "Service role write asset_proposals"
on public.asset_proposals
for all
to service_role
using (true)
with check (true);
