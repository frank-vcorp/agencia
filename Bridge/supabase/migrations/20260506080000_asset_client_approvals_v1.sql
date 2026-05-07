-- IMPL-20260506-51
-- Respaldo: context/SPECs/SPEC_ARCH-20260506-51_cierre_final_activo_comparacion_aprobacion_analytics.md
--
-- Tabla: asset_client_approvals
-- Registra la decision final del cliente sobre un activo creativo.
-- Una fila por activo (UNIQUE asset_id).
-- No requiere login del cliente en este corte; es un registro operativo interno.

CREATE TABLE IF NOT EXISTS asset_client_approvals (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL,
  asset_id      uuid        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  status        text        NOT NULL DEFAULT 'pending_client'
                            CHECK (status IN ('pending_client', 'approved_client', 'rejected_changes')),
  comment       text,
  decided_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_client_approvals_asset_uniq UNIQUE (asset_id)
);

ALTER TABLE asset_client_approvals ENABLE ROW LEVEL SECURITY;

-- El operador actua via service_role; los agentes usan la misma key.
CREATE POLICY "service_role_all_client_approvals"
  ON asset_client_approvals
  FOR ALL
  USING (true)
  WITH CHECK (true);
