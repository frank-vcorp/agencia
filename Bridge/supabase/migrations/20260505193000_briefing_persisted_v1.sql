/*
 * IMPL-20260505-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-19_agente_briefing_persistido_y_revision_humana.md, context/BRIEFING_ESTRUCTURADO_CLAUDE_V1.md, context/MODELO_DATOS_MULTITENANT_V1.md, context/CONTRATOS_AGENTES_Y_VSCODE_V1.md
 */

create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  status text not null default 'draft' check (
    status in (
      'draft',
      'stage_1_discovery',
      'stage_2_precision',
      'stage_3_commercial_fit',
      'pending_operator_review',
      'operator_review_in_progress',
      'approved_locked',
      'returned_for_rework',
      'superseded'
    )
  ),
  source_channel text not null default 'bridge_web',
  current_version_number integer not null default 1,
  active_version_id uuid,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.brief_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  brief_id uuid not null references public.briefs(id) on delete cascade,
  version_number integer not null,
  stage_key text not null default 'discovery' check (stage_key in ('discovery', 'precision', 'commercial_fit')),
  status text not null default 'stage_1_discovery' check (
    status in (
      'draft',
      'stage_1_discovery',
      'stage_2_precision',
      'stage_3_commercial_fit',
      'pending_operator_review',
      'operator_review_in_progress',
      'approved_locked',
      'returned_for_rework',
      'superseded'
    )
  ),
  structured_summary_json jsonb not null default '{}'::jsonb,
  final_summary_text text,
  derived_from_version_id uuid references public.brief_versions(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (brief_id, version_number)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'briefs_active_version_fk'
  ) then
    alter table public.briefs
      add constraint briefs_active_version_fk
      foreign key (active_version_id)
      references public.brief_versions(id)
      on delete set null;
  end if;
end
$$;

create table if not exists public.brief_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  brief_id uuid not null references public.briefs(id) on delete cascade,
  brief_version_id uuid not null references public.brief_versions(id) on delete cascade,
  stage_key text not null check (stage_key in ('discovery', 'precision', 'commercial_fit')),
  author_role text not null check (author_role in ('client', 'assistant', 'operator')),
  actor_label text not null,
  message_text text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.brief_review_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  brief_id uuid not null references public.briefs(id) on delete cascade,
  brief_version_id uuid not null references public.brief_versions(id) on delete cascade,
  event_type text not null check (
    event_type in ('submitted', 'review_started', 'approved', 'returned', 'reconducted', 'derived_version')
  ),
  note text,
  recommended_product_slot_key text,
  created_by_label text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists briefs_tenant_idx on public.briefs (tenant_id, updated_at desc);
create index if not exists brief_versions_brief_idx on public.brief_versions (brief_id, version_number desc);
create index if not exists brief_versions_tenant_idx on public.brief_versions (tenant_id, updated_at desc);
create index if not exists brief_messages_version_idx on public.brief_messages (brief_version_id, created_at asc);
create index if not exists brief_review_events_version_idx on public.brief_review_events (brief_version_id, created_at desc);

alter table public.briefs enable row level security;
alter table public.brief_versions enable row level security;
alter table public.brief_messages enable row level security;
alter table public.brief_review_events enable row level security;

drop policy if exists "Public read active tenant briefs" on public.briefs;
create policy "Public read active tenant briefs"
on public.briefs
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = briefs.tenant_id
      and tenants.status = 'active'
  )
);

drop policy if exists "Public read active tenant brief versions" on public.brief_versions;
create policy "Public read active tenant brief versions"
on public.brief_versions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = brief_versions.tenant_id
      and tenants.status = 'active'
  )
);

drop policy if exists "Public read active tenant brief messages" on public.brief_messages;
create policy "Public read active tenant brief messages"
on public.brief_messages
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = brief_messages.tenant_id
      and tenants.status = 'active'
  )
);

drop policy if exists "Public read active tenant brief review events" on public.brief_review_events;
create policy "Public read active tenant brief review events"
on public.brief_review_events
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = brief_review_events.tenant_id
      and tenants.status = 'active'
  )
);

drop trigger if exists set_briefs_updated_at on public.briefs;
create trigger set_briefs_updated_at
before update on public.briefs
for each row
execute function public.set_updated_at();

drop trigger if exists set_brief_versions_updated_at on public.brief_versions;
create trigger set_brief_versions_updated_at
before update on public.brief_versions
for each row
execute function public.set_updated_at();