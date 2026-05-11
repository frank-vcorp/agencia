/**
 * IMPL-20260510-09
 * Plantilla React Email — Evento: quotation.active
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

export type QuotationActiveEmailProps = {
  clientName: string;
  projectName: string;
  quotationSummary: string;
  total: number;
  currency: string;
  portalUrl: string;
  expiresAt: string;
  agencyName: string;
};

export function QuotationActiveEmail({
  clientName,
  projectName,
  quotationSummary,
  total,
  currency,
  portalUrl,
  expiresAt,
  agencyName
}: QuotationActiveEmailProps) {
  const formattedTotal = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN'
  }).format(total);

  const formattedDate = new Date(expiresAt).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <Html lang="es">
      <Head />
      <Preview>Tu propuesta de {agencyName} ya está disponible</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Encabezado */}
          <Section style={headerStyle}>
            <Heading style={brandStyle}>{agencyName}</Heading>
          </Section>

          {/* Contenido principal */}
          <Section style={contentStyle}>
            <Heading as="h2" style={titleStyle}>
              Tu propuesta está lista, {clientName}
            </Heading>
            <Text style={textStyle}>
              Hemos preparado una propuesta personalizada para tu proyecto <strong>{projectName}</strong>.
            </Text>

            {/* Resumen de la cotización */}
            <Section style={boxStyle}>
              <Text style={boxTitleStyle}>Resumen de la propuesta</Text>
              <Text style={boxTextStyle}>{quotationSummary}</Text>
              <Hr style={hrStyle} />
              <Text style={totalStyle}>Total: {formattedTotal}</Text>
              <Text style={smallTextStyle}>
                Válida hasta: {formattedDate}
              </Text>
            </Section>

            <Text style={textStyle}>
              Revisa todos los detalles y aprueba la cotización desde tu portal.
            </Text>

            <Button href={portalUrl} style={buttonStyle}>
              Ver propuesta completa
            </Button>

            <Text style={footerTextStyle}>
              Si tienes dudas, responde este correo y te contactaremos de inmediato.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerLegalStyle}>
              © {new Date().getFullYear()} {agencyName}. Este correo es una notificación automática.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const bodyStyle = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
};

const containerStyle = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px'
};

const headerStyle = {
  padding: '32px 40px',
  backgroundColor: '#1a1a1a'
};

const brandStyle = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const
};

const contentStyle = {
  padding: '40px'
};

const titleStyle = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '16px'
};

const textStyle = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px'
};

const boxStyle = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0'
};

const boxTitleStyle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '12px'
};

const boxTextStyle = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '22px',
  marginBottom: '16px'
};

const hrStyle = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '16px 0'
};

const totalStyle = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '8px'
};

const smallTextStyle = {
  color: '#6b7280',
  fontSize: '14px',
  marginTop: '8px'
};

const buttonStyle = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
  marginTop: '24px',
  marginBottom: '24px'
};

const footerTextStyle = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '32px'
};

const footerStyle = {
  padding: '24px 40px',
  backgroundColor: '#f9fafb'
};

const footerLegalStyle = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '0'
};
