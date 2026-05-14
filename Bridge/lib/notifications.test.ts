/**
 * IMPL-20260513-04
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-04_sendgrid_proveedor_email_mct_v1.md
 *
 * Tests del canal 3 (WhatsApp Click-to-Send) — función pura, sin mocks de red.
 * El mock de @sendgrid/mail evita la llamada real al proveedor en entorno de test.
 */
import { vi, describe, expect, it } from "vitest";

// Hoisted: evita que sgMail.setApiKey/send fallen sin credenciales en CI
vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn().mockResolvedValue([{ statusCode: 202, headers: {}, body: "" }, {}])
  }
}));

import { buildWhatsAppLink } from "./notifications";

describe("buildWhatsAppLink", () => {
  it("genera URL wa.me con numero limpio y mensaje codificado", () => {
    const url = buildWhatsAppLink("+52 55 1234 5678", "Hola, soy Vectoria");
    expect(url).toBe(
      "https://wa.me/525512345678?text=Hola%2C%20soy%20Vectoria"
    );
  });

  it("elimina el simbolo + del telefono para formato wa.me", () => {
    const url = buildWhatsAppLink("+521234567890", "Hola");
    expect(url).toBe("https://wa.me/521234567890?text=Hola");
  });

  it("funciona con numero sin prefijo de pais", () => {
    const url = buildWhatsAppLink("5512345678", "Test");
    expect(url).toBe("https://wa.me/5512345678?text=Test");
  });

  it("codifica caracteres especiales y acentos en el mensaje", () => {
    const msg = "Tu cotización #001 está lista";
    const url = buildWhatsAppLink("521234567890", msg);
    expect(url).toContain("wa.me/521234567890");
    expect(url).toContain(encodeURIComponent(msg));
  });

  it("elimina guiones, espacios y parentesis del numero", () => {
    const url = buildWhatsAppLink("+52 (55) 1234-5678", "ok");
    expect(url).toContain("wa.me/525512345678");
  });
});
