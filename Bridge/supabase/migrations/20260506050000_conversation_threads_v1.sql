/*
 * IMPL-20260506-28
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-28_chat_contextual_por_entidad_v1.md
 *
 * Chat contextual por entidad V1.
 * Modelo mínimo: conversation_threads + conversation_messages.
 * Una conversación pertenece a una sola entidad primaria (entity_type + entity_id).
 * Los mensajes no pueden existir sin thread.
 * RLS: lectura pública para tenant activo; escritura restringida a service_role.
 */

-- ─── Threads ─────────────────────────────────────────────────────────────────

create table if not exists public.conversation_threads (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  entity_type text not null
    check (entity_type in ('lead', 'brief', 'quotation', 'asset')),
  entity_id   uuid not null,
  created_at  timestamptz not null default timezone('utc'::text, now()),
  updated_at  timestamptz not null default timezone('utc'::text, now()),
  unique (tenant_id, entity_type, entity_id)
);

create index if not exists conversation_threads_entity_idx
  on public.conversation_threads (tenant_id, entity_type, entity_id);

-- ─── Messages ────────────────────────────────────────────────────────────────

create table if not exists public.conversation_messages (
  id           uuid primary key default gen_random_uuid(),
  thread_id    uuid not null references public.conversation_threads(id) on delete cascade,
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  actor_role   text not null
    check (actor_role in ('operator', 'designer', 'client', 'agent')),
  actor_label  text not null,
  message_text text not null,
  created_at   timestamptz not null default timezone('utc'::text, now())
);

create index if not exists conversation_messages_thread_idx
  on public.conversation_messages (thread_id, created_at asc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.conversation_threads enable row level security;
alter table public.conversation_messages enable row level security;

-- Lectura pública para tenant activo

drop policy if exists "Public read conversation_threads" on public.conversation_threads;
create policy "Public read conversation_threads"
on public.conversation_threads
for select
to anon, authenticated
using (
  exists (
    select 1 from public.tenants t
    where t.id = conversation_threads.tenant_id
      and t.status = 'active'
  )
);

drop policy if exists "Public read conversation_messages" on public.conversation_messages;
create policy "Public read conversation_messages"
on public.conversation_messages
for select
to anon, authenticated
using (
  exists (
    select 1 from public.tenants t
    where t.id = conversation_messages.tenant_id
      and t.status = 'active'
  )
);

-- Escritura restringida a service_role (server-side)

drop policy if exists "Service role write conversation_threads" on public.conversation_threads;
create policy "Service role write conversation_threads"
on public.conversation_threads
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role write conversation_messages" on public.conversation_messages;
create policy "Service role write conversation_messages"
on public.conversation_messages
for all
to service_role
using (true)
with check (true);
