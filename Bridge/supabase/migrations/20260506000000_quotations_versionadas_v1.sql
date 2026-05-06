/*
 * IMPL-20260505-23
 * Respaldo: context/COTIZACIONES_VERSIONADAS_V1.md, context/SPECs/SPEC_ARCH-20260505-23_cotizaciones_versionadas_v1.md, context/MODELO_DATOS_MULTITENANT_V1.md
 */

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  brief_id uuid references public.briefs(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'approved', 'invoiced', 'paid')),
  active_version_id uuid,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.quotation_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  version_number integer not null,
  title text not null,
  body_markdown text not null default '',
  commercial_summary_json jsonb,
  admin_status text not null default 'draft'
    check (admin_status in ('draft', 'in_review', 'approved', 'rejected', 'superseded')),
  internal_note text,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_by_agent_id uuid references public.service_agents(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (quotation_id, version_number)
);

alter table public.quotations
  add constraint fk_quotations_active_version
  foreign key (active_version_id)
  references public.quotation_versions(id)
  on delete set null
  not valid;

create index if not exists quotations_tenant_project_idx
  on public.quotations (tenant_id, project_id, created_at desc);

create index if not exists quotation_versions_quotation_idx
  on public.quotation_versions (quotation_id, version_number asc);

alter table public.quotations enable row level security;
alter table public.quotation_versions enable row level security;

drop policy if exists "Public read active tenant quotations" on public.quotations;
create policy "Public read active tenant quotations"
on public.quotations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = quotations.tenant_id
      and tenants.status = 'active'
  )
);

drop policy if exists "Public read active tenant quotation_versions" on public.quotation_versions;
create policy "Public read active tenant quotation_versions"
on public.quotation_versions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = quotation_versions.tenant_id
      and tenants.status = 'active'
  )
);

drop policy if exists "Service role write quotations" on public.quotations;
create policy "Service role write quotations"
on public.quotations
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role write quotation_versions" on public.quotation_versions;
create policy "Service role write quotation_versions"
on public.quotation_versions
for all
to service_role
using (true)
with check (true);

drop trigger if exists set_quotations_updated_at on public.quotations;
create trigger set_quotations_updated_at
before update on public.quotations
for each row
execute function public.set_updated_at();

-- Seed: cotizacion demo para vectoria ligada al project demo activo
do $$
declare
  v_tenant_id   uuid;
  v_client_id   uuid;
  v_project_id  uuid;
  v_brief_id    uuid;
  v_quotation_id uuid;
  v_version_id  uuid;
begin
  select id into v_tenant_id
    from public.tenants where slug = 'vectoria';

  if v_tenant_id is null then
    return;
  end if;

  select c.id into v_client_id
    from public.clients c
    where c.tenant_id = v_tenant_id
      and c.name = 'Cliente demo controlado Vectoria'
    limit 1;

  if v_client_id is null then
    return;
  end if;

  select p.id into v_project_id
    from public.projects p
    where p.tenant_id = v_tenant_id
      and p.client_id = v_client_id
      and p.name = 'Proyecto demo controlado Vectoria'
    limit 1;

  if v_project_id is null then
    return;
  end if;

  select b.id into v_brief_id
    from public.briefs b
    where b.tenant_id = v_tenant_id
    order by b.created_at asc
    limit 1;

  -- Omitir si ya existe una cotizacion para este project
  if exists (
    select 1 from public.quotations
    where project_id = v_project_id
  ) then
    return;
  end if;

  insert into public.quotations
    (tenant_id, client_id, project_id, brief_id, status)
  values
    (v_tenant_id, v_client_id, v_project_id, v_brief_id, 'sent')
  returning id into v_quotation_id;

  insert into public.quotation_versions
    (tenant_id, quotation_id, version_number, title, body_markdown,
     commercial_summary_json, admin_status)
  values (
    v_tenant_id,
    v_quotation_id,
    1,
    'Propuesta Lanzamiento Conversacional V1 — Vectoria Demo',
    E'## Propuesta comercial\n\nSistema de mensajes conversacionales para captar y calificar leads desde WhatsApp e Instagram.\n\n**Incluye:**\n- Mensajes de activacion en formato texto + imagen\n- Secuencia de calificacion de 3 pasos\n- CTA claro hacia reunion o diagnostico\n\n**Vigencia:** 30 dias desde la aprobacion.',
    '{"totalEstimado": "USD 1,200", "plazo": "15 dias habiles", "alcance": "Lanzamiento conversacional basico", "incluye": ["mensajes de activacion", "calificacion de leads", "CTA hacia reunion"], "nota": "Precio demo controlado para piloto"}'::jsonb,
    'approved'
  )
  returning id into v_version_id;

  update public.quotations
  set active_version_id = v_version_id
  where id = v_quotation_id;
end;
$$;
