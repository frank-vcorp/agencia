/**
 * IMPL-20260610-06
 * Respaldo: context/SPECs/SPEC_ARCH-20260610-05_preregistro_cliente_vendedor.md
 *
 * Helpers puros para el flujo de pre-registro:
 *   - normalizePhoneMX: garantiza formato +52[10 dígitos] o devuelve el input tal cual.
 *   - generateWhatsappUrl: arma link wa.me con el prefijo correcto y mensaje de briefing.
 *
 * Se extraen del route para poder testearse de forma aislada y mantenerse
 * como contrato reutilizable (mismo helper que consumirá el cliente desde el
 * chat de briefing si en el futuro se quiere regenerar el link).
 */

/**
 * Normaliza un teléfono mexicano a formato E.164 (+52 + 10 dígitos).
 * Si el input no tiene exactamente 10 dígitos, lo devuelve sin modificar
 * (la validación de 10 dígitos ocurre en el endpoint antes de llamar aquí).
 */
export function normalizePhoneMX(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+52${digits}`;
  }
  return phone;
}

/**
 * Genera URL wa.me con el proyecto del cliente y un mensaje de briefing.
 * El teléfono debe llegar normalizado (+52...) o como 52[10 dígitos]; el "+" se quita.
 */
export function generateWhatsappUrl(projectId: string, phone: string): string {
  const baseUrl = `https://vectoria-zeta.vercel.app/cliente/proyecto/${projectId}`;
  const message = `Hola%21%20Te%20comparto%20el%20link%20para%20tu%20brief%3A%20${encodeURIComponent(baseUrl)}`;
  return `https://wa.me/${phone.replace("+", "")}?text=${message}`;
}
