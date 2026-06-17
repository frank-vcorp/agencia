/**
 * IMPL-20260510-09
 * Plantilla React Email — Evento: asset.delivered
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-09_modulo_comunicacion_transaccional_mct_v1.md
 */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from "@react-email/components";

export type AssetDeliveredEmailProps = {
  clientName: string;
  assetName: string;
  portalUrl: string;
  isProjectComplete: boolean;
  agencyName: string;
};

export function AssetDeliveredEmail({
  clientName,
  assetName,
  portalUrl,
  isProjectComplete,
  agencyName
}: AssetDeliveredEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Tu entrega está lista — {assetName}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Encabezado */}
          <Section style={headerStyle}>
            <Heading style={brandStyle}>{agencyName}</Heading>
          </Section>

          {/* Contenido principal */}
          <Section style={contentStyle}>
            <Heading as="h2" style={titleStyle}>
              ¡Tu entrega está lista! 🎉
            </Heading>
            <Text style={textStyle}>
              Hola, {clientName}. Tu activo <strong>{assetName}</strong> ha sido aprobado y está
              disponible para descarga.
            </Text>

            {/* Caja de descarga */}
            <Section style={boxStyle}>
              <Text style={boxTitleStyle}>{assetName}</Text>
              <Text style={statusTextStyle}>✓ Aprobado y listo para uso</Text>
            </Section>

            <Button href={portalUrl} style={buttonStyle}>
              Descargar activo
            </Button>

            {isProjectComplete ? (
              <>
                <Hr style={hrStyle} />
                <Section style={completeBoxStyle}>
                  <Text style={completeTextStyle}>
                    🎊 <strong>¡Proyecto completado!</strong>
                  </Text>
                  <Text style={completeDescStyle}>
                    Todas tus entregas están listas. Gracias por confiar en {agencyName}.
                  </Text>
                </Section>
              </>
            ) : (
              <Text style={footerTextStyle}>
                Seguimos trabajando en el resto de tus activos. Te avisaremos cuando estén listos.
              </Text>
            )}

            <Text style={footerTextStyle}>
              Si necesitas ajustes o tienes dudas, responde este correo.
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
  backgroundColor: '#f0fdf4',
  border: '2px solid #10b981',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const
};

const boxTitleStyle = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  marginBottom: '8px'
};

const statusTextStyle = {
  color: '#059669',
  fontSize: '14px',
  fontWeight: '600',
  marginTop: '8px'
};

const buttonStyle = {
  backgroundColor: '#10b981',
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

const hrStyle = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '32px 0'
};

const completeBoxStyle = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const
};

const completeTextStyle = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '8px'
};

const completeDescStyle = {
  color: '#78350f',
  fontSize: '15px',
  lineHeight: '22px'
};

const footerTextStyle = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '24px'
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
