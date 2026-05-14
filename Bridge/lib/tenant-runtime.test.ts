/**
 * IMPL-20260505-02 | IMPL-20260513-05
 * Respaldo: context/MODELO_DATOS_MULTITENANT_V1.md, context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
 * IMPL-20260513-05: context/SPECs/SPEC_ARCH-20260513-05_configuracion_sendgrid_segura_v1.md
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
          active_modules: ["briefs", "crm"],
          sendgrid_from_email: null,
          sendgrid_agency_name: null,
          sendgrid_reply_to_email: null
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
        activeModules: ["briefs", "crm"],
        sendgridFromEmail: null,
        sendgridAgencyName: null,
        sendgridReplyToEmail: null
      }
    });
  });

  it("normaliza campos sendgrid cuando tienen valor real", () => {
    const snapshot = normalizeTenantSnapshot({
      slug: "vectoria",
      name: "Vectoria",
      status: "active",
      tenant_runtime_settings: {
        dashboard_headline: "H",
        dashboard_summary: "S",
        primary_contact_channel: null,
        active_modules: [],
        sendgrid_from_email: "hola@vectoria.mx",
        sendgrid_agency_name: "Vectoria",
        sendgrid_reply_to_email: "respuestas@vectoria.mx"
      }
    });

    expect(snapshot.config?.sendgridFromEmail).toBe("hola@vectoria.mx");
    expect(snapshot.config?.sendgridAgencyName).toBe("Vectoria");
    expect(snapshot.config?.sendgridReplyToEmail).toBe("respuestas@vectoria.mx");
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