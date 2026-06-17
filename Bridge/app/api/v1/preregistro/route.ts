/**
 * IMPL-20260610-04
 * IMPL-20260610-06 - helpers extraídos a lib/preregistro-helpers.ts
 * IMPL-20260613-01 - lógica de negocio extraída a lib/preregistro.ts
 *
 * Endpoint HTTP de pre-registro para vendedores.
 * La lógica vive en lib/preregistro.ts (compartida con la server action).
 */
import { createPreregistro } from "@/lib/preregistro";

type PreregistroError = { ok: false; error: string };

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { ok: false, error: "Cuerpo JSON inválido" } as PreregistroError,
      { status: 400 }
    );
  }

  try {
    const result = await createPreregistro({
      clientName: String(body.clientName ?? ""),
      clientPhone: String(body.clientPhone ?? ""),
      businessName: String(body.businessName ?? "")
    });
    return Response.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isValidation =
      /Campos requeridos|10 d[ií]gitos/.test(msg);
    return Response.json(
      { ok: false, error: msg } as PreregistroError,
      { status: isValidation ? 400 : 500 }
    );
  }
}
