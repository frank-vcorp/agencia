-- IMPL-20260506-52
-- Respaldo: context/SPECs/SPEC_ARCH-20260506-52_disenador_sesiones_reales_y_cierre_jornada.md
--
-- Tabla minima de sesiones de trabajo del disenador.
-- Permite: persistir inicio/fin, bloqueos y filtro de jornada diaria.
-- Cada sesion pertenece a un tenant y referencia un activo.

CREATE TABLE IF NOT EXISTS work_sessions (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_id       UUID         NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  started_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at       TIMESTAMPTZ,
  status         TEXT         NOT NULL CHECK (status IN ('active', 'blocked', 'completed')),
  blocked_reason TEXT,
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Consulta rapida de sesion activa/bloqueada por tenant
CREATE INDEX IF NOT EXISTS idx_work_sessions_tenant_status
  ON work_sessions (tenant_id, status);

-- Filtro de jornada diaria por fecha de inicio
CREATE INDEX IF NOT EXISTS idx_work_sessions_tenant_started
  ON work_sessions (tenant_id, started_at DESC);

-- Busqueda de sesiones por activo
CREATE INDEX IF NOT EXISTS idx_work_sessions_asset
  ON work_sessions (asset_id, started_at DESC);

-- RLS: solo service_role puede operar (sin auth de usuario final en V1)
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_work_sessions"
  ON work_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
