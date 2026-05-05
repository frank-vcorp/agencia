/**
 * IMPL-20260505-02
 * Respaldo: context/MODELO_DATOS_MULTITENANT_V1.md, context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
 */
import { describe, expect, it } from "vitest";

import { normalizeTenantSnapshot } from "./tenant-runtime";

describe("tenant-runtime", () => {
  it("normaliza configuracion embebida como arreglo desde PostgREST", () => {
    const snapshot = normalizeTenantSnapshot({
      slug: "vectoria",
      name: "Vectoria",
      status: "active",
      tenant_runtime_settings: [
        {
          dashboard_headline: "Headline real",
          dashboard_summary: "Resumen real",
          primary_contact_channel: "WhatsApp",
          active_modules: ["briefs", "crm"]
        }
      ]
    });

    expect(snapshot).toEqual({
      slug: "vectoria",
      name: "Vectoria",
      status: "active",
      config: {
        dashboardHeadline: "Headline real",
        dashboardSummary: "Resumen real",
        primaryContactChannel: "WhatsApp",
        activeModules: ["briefs", "crm"]
      }
    });
  });

  it("mantiene el tenant aunque aun no exista configuracion sembrada", () => {
    const snapshot = normalizeTenantSnapshot({
      slug: "vectoria",
      name: "Vectoria",
      status: "active",
      tenant_runtime_settings: null
    });

    expect(snapshot.config).toBeNull();
    expect(snapshot.name).toBe("Vectoria");
  });
});