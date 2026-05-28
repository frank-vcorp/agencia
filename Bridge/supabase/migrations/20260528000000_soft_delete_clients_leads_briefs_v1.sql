-- IMPL-20260528-01
-- Respaldo: context/SPECs/SPEC_ARCH-20260528-01_papelera_reciclaje_mcp_client_lead_brief_v1.md
-- Papelera de reciclaje: soft-delete para clients, leads y briefs
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.leads   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.briefs  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Indices de papelera (para listar trash eficientemente)
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON public.clients(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at   ON public.leads(deleted_at)   WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_briefs_deleted_at  ON public.briefs(deleted_at)  WHERE deleted_at IS NOT NULL;
