/**
 * IMPL-20260615-07
 * Script one-off para crear el brief del proyecto piloto e2e.
 * Equivalente a navegar a /cliente/proyecto/[projectId] sin levantar el server.
 * Carga .env.local manualmente porque dotenv no esta como dep directa.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const { createBriefForProject, getBriefByProjectId, getBriefWorkspace } = await import(
  "../lib/briefing"
);

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Uso: tsx scripts/create-brief-e2e.ts <projectId>");
    process.exit(1);
  }

  const existing = await getBriefByProjectId(projectId);
  if (existing) {
    console.log(JSON.stringify({ ok: true, action: "reused", briefId: existing.id }, null, 2));
    return;
  }

  const created = await createBriefForProject(projectId);
  const ws = await getBriefWorkspace(created.id);
  console.log(
    JSON.stringify(
      {
        ok: true,
        action: "created",
        briefId: created.id,
        status: created.status,
        currentVersionId: created.currentVersion?.id ?? null,
        workspaceStatus: ws?.status ?? null
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("[create-brief-e2e] failed:", err);
  process.exit(1);
});
