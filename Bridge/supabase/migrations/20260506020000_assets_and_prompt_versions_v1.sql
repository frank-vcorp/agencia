/*
 * IMPL-20260505-24
 * Respaldo: context/ACTIVOS_OPERABLES_V1.md, context/CATALOGO_ACTIVOS_V1.md,
 *           context/SPECs/SPEC_ARCH-20260505-24_activos_vinculados_a_cotizacion_y_project_v1.md,
 *           context/MODELO_DATOS_MULTITENANT_V1.md
 */

create table if not exists public.assets (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  client_id             uuid not null references public.clients(id) on delete cascade,
  project_id            uuid not null references public.projects(id) on delete cascade,
  quotation_id          uuid references public.quotations(id) on delete set null,
  quotation_version_id  uuid references public.quotation_versions(id) on delete set null,
  brief_id              uuid references public.briefs(id) on delete set null,
  application_code      text not null,
  piece_type_code       text not null,
  placement_code        text not null,
  format_code           text not null,
  title                 text not null,
  status                text not null default 'draft'
    check (status in ('draft', 'in_progress', 'in_review', 'approved', 'delivered', 'archived')),
  created_at            timestamptz not null default timezone('utc'::text, now()),
  updated_at            timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.asset_prompt_versions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  asset_id              uuid not null references public.assets(id) on delete cascade,
  version_number        integer not null,
  prompt_text           text not null,
  references_json       jsonb,
  status                text not null default 'draft'
    check (status in ('draft', 'active', 'superseded', 'archived')),
  created_by_user_id    uuid references public.users(id) on delete set null,
  created_by_agent_id   uuid references public.service_agents(id) on delete set null,
  created_at            timestamptz not null default timezone('utc'::text, now()),
  unique (asset_id, version_number)
);

create index if not exists assets_tenant_project_idx
  on public.assets (tenant_id, project_id, created_at desc);

create index if not exists assets_quotation_idx
  on public.assets (quotation_id, created_at desc);

create index if not exists asset_prompt_versions_asset_idx
  on public.asset_prompt_versions (asset_id, version_number asc);

alter table public.assets enable row level security;
alter table public.asset_prompt_versions enable row level security;

drop policy if exists "Public read active tenant assets" on public.assets;
create policy "Public read active tenant assets"
on public.assets
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = assets.tenant_id
      and tenants.status = 'active'
  )
);

drop policy if exists "Public read active tenant asset_prompt_versions" on public.asset_prompt_versions;
create policy "Public read active tenant asset_prompt_versions"
on public.asset_prompt_versions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = asset_prompt_versions.tenant_id
      and tenants.status = 'active'
  )
);

drop policy if exists "Service role write assets" on public.assets;
create policy "Service role write assets"
on public.assets
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role write asset_prompt_versions" on public.asset_prompt_versions;
create policy "Service role write asset_prompt_versions"
on public.asset_prompt_versions
for all
to service_role
using (true)
with check (true);

drop trigger if exists set_assets_updated_at on public.assets;
create trigger set_assets_updated_at
before update on public.assets
for each row
execute function public.set_updated_at();

-- Seed: activo demo para vectoria ligado al project y cotizacion demo
do $$
declare
  v_tenant_id          uuid;
  v_client_id          uuid;
  v_project_id         uuid;
  v_quotation_id       uuid;
  v_quotation_ver_id   uuid;
  v_brief_id           uuid;
  v_asset_id           uuid;
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
      and p.name = 'Proyecto demo controlado Vectoria'
    limit 1;

  if v_project_id is null then
    return;
  end if;

  select q.id, q.active_version_id
    into v_quotation_id, v_quotation_ver_id
    from public.quotations q
    where q.project_id = v_project_id
    order by q.created_at desc
    limit 1;

  select b.id into v_brief_id
    from public.briefs b
    where b.tenant_id = v_tenant_id
    order by b.updated_at desc
    limit 1;

  -- Omitir si ya existe un activo para este project
  if exists (
    select 1 from public.assets
    where project_id = v_project_id
  ) then
    return;
  end if;

  insert into public.assets
    (tenant_id, client_id, project_id, quotation_id, quotation_version_id,
     brief_id, application_code, piece_type_code, placement_code, format_code,
     title, status)
  values (
    v_tenant_id,
    v_client_id,
    v_project_id,
    v_quotation_id,
    v_quotation_ver_id,
    v_brief_id,
    'instagram',
    'imagen',
    'feed',
    'cuadrado_1_1',
    'Imagen de lanzamiento — Feed Instagram Vectoria',
    'in_progress'
  )
  returning id into v_asset_id;

  insert into public.asset_prompt_versions
    (tenant_id, asset_id, version_number, prompt_text, references_json, status)
  values (
    v_tenant_id,
    v_asset_id,
    1,
    E'Crea una imagen cuadrada (1:1) para feed de Instagram orientada al lanzamiento de Vectoria.\n\nContexto: Agencia de marketing IA que combina especialistas humanos con modelos de lenguaje.\n\nEstilo visual: limpio, moderno, paleta oscura con acento naranja (#C85D27). Tipografia bold y legible.\n\nMensaje principal: "Tu agencia ya trabaja con IA. Resultados reales, sin perder el control."\n\nCTA: "Conoce Vectoria" con flecha o simbolo de accion.\n\nEvitar: stock generico, exceso de texto, look corporativo clasico.',
    '{"aplicativo": "instagram", "formato": "cuadrado_1_1", "placement": "feed", "referencia_marca": "Vectoria Demo V1", "paleta": ["#C85D27", "#1a1a1a", "#ffffff"]}'::jsonb,
    'active'
  );
end;
$$;
