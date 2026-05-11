/**
 * IMPL-20260510-09
 * Plantilla React Email — Evento: client.created
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-09_modulo_comunicacion_transaccional_mct_v1.md
 */
import { Html } from "@react-email/html";
import { Head } from "@react-email/head";
import { Preview } from "@react-email/preview";
import { Body } from "@react-email/body";
import { Container } from "@react-email/container";
import { Section } from "@react-email/section";
import { Heading } from "@react-email/heading";
import { Text } from "@react-email/text";
import { Button } from "@react-email/button";
import { Hr } from "@react-email/hr";

export type ClientCreatedEmailProps = {
  clientName: string;
  portalUrl: string;
  magicLink: string;
  projectName: string;
  agencyName: string;
};

export function ClientCreatedEmail({
  clientName,
  portalUrl,
  magicLink,
  projectName,
  agencyName
}: ClientCreatedEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Tu espacio en {agencyName} ya está listo — accede a tu portal</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Encabezado */}
          <Section style={headerStyle}>
            <Heading style={brandStyle}>{agencyName}</Heading>
          </Section>

          {/* Contenido principal */}
          <Section style={contentStyle}>
            <Heading as="h2" style={titleStyle}>
              ¡Hola, {clientName}!
            </Heading>
            <Text style={textStyle}>
              Tu espacio en <strong>{agencyName}</strong> ya está listo. Hemos creado tu portal
              exclusivo para el proyecto <strong>{projectName}</strong>.
            </Text>
            <Text style={textStyle}>
              Desde tu portal podrás revisar tu brief, aprobar cotizaciones y recibir tus
              entregas — todo en un solo lugar.
            </Text>

            {/* CTA principal */}
            <Section style={ctaContainerStyle}>
              <Button href={magicLink} style={primaryButtonStyle}>
                Acceder a mi portal →
              </Button>
            </Section>

            <Text style={smallTextStyle}>
              Este enlace de acceso es válido por 48 horas. Después podrás iniciar sesión
              directamente en:{" "}
              <a href={portalUrl} style={linkStyle}>
                {portalUrl}
              </a>
            </Text>
          </Section>

          <Hr style={hrStyle} />

          {/* Pie */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              {agencyName} · Este es un mensaje automático, no necesitas responder.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Estilos inline ───────────────────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#f9f7f4",
  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: "40px 0"
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  maxWidth: "560px",
  margin: "0 auto",
  overflow: "hidden",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#c85d27",
  padding: "24px 32px"
};

const brandStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: 700,
  margin: 0
};

const contentStyle: React.CSSProperties = {
  padding: "32px"
};

const titleStyle: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "22px",
  fontWeight: 600,
  marginBottom: "16px"
};

const textStyle: React.CSSProperties = {
  color: "#444444",
  fontSize: "15px",
  lineHeight: "1.6",
  marginBottom: "16px"
};

const ctaContainerStyle: React.CSSProperties = {
  margin: "24px 0"
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: "#c85d27",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block"
};

const smallTextStyle: React.CSSProperties = {
  color: "#888888",
  fontSize: "13px",
  lineHeight: "1.5",
  marginTop: "16px"
};

const linkStyle: React.CSSProperties = {
  color: "#c85d27",
  textDecoration: "underline"
};

const hrStyle: React.CSSProperties = {
  borderColor: "#eeeeee",
  margin: "0 32px"
};

const footerStyle: React.CSSProperties = {
  padding: "20px 32px"
};

const footerTextStyle: React.CSSProperties = {
  color: "#aaaaaa",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: 0
};
