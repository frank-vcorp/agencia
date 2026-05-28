/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";
import { getTenantIdBySlug, getClientById } from "@/lib/assets";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function POST(
  req: NextRequest,
  context: { params: Promise<Params> }
): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const { id } = await context.params;

  try {
    const client = await getClientById(tenantId, id);
    if (!client) {
      return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
    }

    const form = await req.formData();
    const fileValue = form.get("file");
    const nombreValue = form.get("nombre");

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ ok: false, error: "file_required" }, { status: 400 });
    }

    if (!fileValue.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "invalid_file_type" }, { status: 400 });
    }

    const nombre = typeof nombreValue === "string" && nombreValue.trim()
      ? nombreValue.trim()
      : "Logo";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const extension = fileValue.name.includes(".")
      ? fileValue.name.split(".").pop()?.toLowerCase() ?? "bin"
      : "bin";
    const safeBase = fileValue.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 80) || "logo";
    const filename = `${Date.now()}-${safeBase}.${extension}`;
    const storagePath = `${tenantId}/${id}/${filename}`;

    const buffer = Buffer.from(await fileValue.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("brand-kits")
      .upload(storagePath, buffer, {
        contentType: fileValue.type || "application/octet-stream",
        upsert: true
      });

    if (uploadError) {
      return NextResponse.json({ ok: false, error: `storage_upload_error:${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("brand-kits")
      .getPublicUrl(storagePath);

    return NextResponse.json(
      {
        ok: true,
        storage_path: storagePath,
        url: publicUrlData.publicUrl,
        nombre
      },
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
