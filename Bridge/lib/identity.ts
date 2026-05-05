/**
 * IMPL-20260505-21
 * Respaldo: context/IDENTIDAD_Y_MEMBERSHIPS_V1.md, context/SPECs/SPEC_ARCH-20260505-21_memberships_users_y_actor_efectivo_v1.md, context/MODELO_DATOS_MULTITENANT_V1.md, context/CONTRATOS_AGENTES_Y_VSCODE_V1.md
 */
import { isSupabaseConfigured, supabaseEnv } from "./supabase";

export type TenantMembershipIdentity = {
  id: string;
  tenantId: string;
  userId: string;
  role: "operator" | "designer" | "client_admin" | "client_viewer";
  status: "active" | "invited" | "disabled";
  displayName: string;
  email: string;
  userType: "operator" | "designer" | "client" | "internal_admin";
};

export type AgentScopeIdentity = {
  id: string;
  tenantId: string;
  resourceType: string;
  operation: string;
  approvalRequired: boolean;
};

export type ServiceAgentIdentity = {
  id: string;
  tenantId: string | null;
  name: string;
  agentType: "vscode_operator_agent" | "briefing_agent" | "integration_agent" | "automation_agent";
  authMode: string;
  status: "active" | "disabled";
  scopes: AgentScopeIdentity[];
};

export type TenantIdentityContext = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  operatorMembership: TenantMembershipIdentity | null;
  designerMembership: TenantMembershipIdentity | null;
  clientMembership: TenantMembershipIdentity | null;
  serviceAgent: ServiceAgentIdentity | null;
};

export type ResolvedActorTrace = {
  actorLabel: string;
  actorUserId: string | null;
  actorMembershipId: string | null;
  actorAgentId: string | null;
  effectiveUserId: string | null;
  effectiveMembershipId: string | null;
};

type TenantRow = {
  id: string;
  slug: string;
  name: string;
};

type TenantMembershipApiRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantMembershipIdentity["role"];
  status: TenantMembershipIdentity["status"];
  users:
    | {
        id: string;
        display_name: string;
        email: string;
        user_type: TenantMembershipIdentity["userType"];
      }
    | {
        id: string;
        display_name: string;
        email: string;
        user_type: TenantMembershipIdentity["userType"];
      }[]
    | null;
};

type ServiceAgentApiRow = {
  id: string;
  tenant_id: string | null;
  name: string;
  agent_type: ServiceAgentIdentity["agentType"];
  auth_mode: string;
  status: ServiceAgentIdentity["status"];
};

type AgentScopeApiRow = {
  id: string;
  tenant_id: string;
  resource_type: string;
  operation: string;
  approval_required: boolean;
};

function getServerApiKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
}

async function postgrest<T>(path: string): Promise<T> {
  const response = await fetch(`${supabaseEnv.url}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      apikey: getServerApiKey(),
      Authorization: `Bearer ${getServerApiKey()}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`supabase_identity_error:${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeMembershipRow(row: TenantMembershipApiRow): TenantMembershipIdentity {
  const user = Array.isArray(row.users) ? row.users[0] ?? null : row.users;

  if (!user) {
    throw new Error("membership_user_missing");
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    displayName: user.display_name,
    email: user.email,
    userType: user.user_type
  };
}

export function normalizeTenantIdentityContext(params: {
  tenant: TenantRow;
  memberships: TenantMembershipApiRow[];
  serviceAgent: ServiceAgentApiRow | null;
  scopes: AgentScopeApiRow[];
}): TenantIdentityContext {
  const memberships = params.memberships.map(normalizeMembershipRow);
  const byRole = (role: TenantMembershipIdentity["role"]) => memberships.find((membership) => membership.role === role && membership.status === "active") ?? null;

  return {
    tenantId: params.tenant.id,
    tenantSlug: params.tenant.slug,
    tenantName: params.tenant.name,
    operatorMembership: byRole("operator"),
    designerMembership: byRole("designer"),
    clientMembership: byRole("client_admin") ?? byRole("client_viewer"),
    serviceAgent: params.serviceAgent
      ? {
          id: params.serviceAgent.id,
          tenantId: params.serviceAgent.tenant_id,
          name: params.serviceAgent.name,
          agentType: params.serviceAgent.agent_type,
          authMode: params.serviceAgent.auth_mode,
          status: params.serviceAgent.status,
          scopes: params.scopes.map((scope) => ({
            id: scope.id,
            tenantId: scope.tenant_id,
            resourceType: scope.resource_type,
            operation: scope.operation,
            approvalRequired: scope.approval_required
          }))
        }
      : null
  };
}

export function resolveActorTrace(params: {
  fallbackLabel: string;
  effectiveMembership?: TenantMembershipIdentity | null;
  technicalActor?: ServiceAgentIdentity | null;
}): ResolvedActorTrace {
  const effectiveMembership = params.effectiveMembership ?? null;
  const technicalActor = params.technicalActor ?? null;

  if (technicalActor) {
    return {
      actorLabel: effectiveMembership ? `${technicalActor.name} · ${effectiveMembership.displayName}` : technicalActor.name,
      actorUserId: null,
      actorMembershipId: null,
      actorAgentId: technicalActor.id,
      effectiveUserId: effectiveMembership?.userId ?? null,
      effectiveMembershipId: effectiveMembership?.id ?? null
    };
  }

  if (effectiveMembership) {
    return {
      actorLabel: effectiveMembership.displayName,
      actorUserId: effectiveMembership.userId,
      actorMembershipId: effectiveMembership.id,
      actorAgentId: null,
      effectiveUserId: effectiveMembership.userId,
      effectiveMembershipId: effectiveMembership.id
    };
  }

  return {
    actorLabel: params.fallbackLabel,
    actorUserId: null,
    actorMembershipId: null,
    actorAgentId: null,
    effectiveUserId: null,
    effectiveMembershipId: null
  };
}

async function getTenantBySlug(tenantSlug: string): Promise<TenantRow | null> {
  const params = new URLSearchParams({
    select: "id,slug,name",
    slug: `eq.${tenantSlug}`,
    limit: "1"
  });
  const rows = await postgrest<TenantRow[]>(`tenants?${params.toString()}`);

  return rows[0] ?? null;
}

async function getTenantById(tenantId: string): Promise<TenantRow | null> {
  const params = new URLSearchParams({
    select: "id,slug,name",
    id: `eq.${tenantId}`,
    limit: "1"
  });
  const rows = await postgrest<TenantRow[]>(`tenants?${params.toString()}`);

  return rows[0] ?? null;
}

async function getMembershipRows(tenantId: string): Promise<TenantMembershipApiRow[]> {
  const params = new URLSearchParams({
    select: "id,tenant_id,user_id,role,status,users!tenant_memberships_user_id_fkey(id,display_name,email,user_type)",
    tenant_id: `eq.${tenantId}`,
    status: "eq.active",
    order: "created_at.asc"
  });

  return postgrest<TenantMembershipApiRow[]>(`tenant_memberships?${params.toString()}`);
}

async function getServiceAgentRow(tenantId: string): Promise<ServiceAgentApiRow | null> {
  const params = new URLSearchParams({
    select: "id,tenant_id,name,agent_type,auth_mode,status",
    tenant_id: `eq.${tenantId}`,
    status: "eq.active",
    order: "created_at.asc",
    limit: "1"
  });
  const rows = await postgrest<ServiceAgentApiRow[]>(`service_agents?${params.toString()}`);

  return rows[0] ?? null;
}

async function getAgentScopes(serviceAgentId: string): Promise<AgentScopeApiRow[]> {
  const params = new URLSearchParams({
    select: "id,tenant_id,resource_type,operation,approval_required",
    service_agent_id: `eq.${serviceAgentId}`,
    order: "created_at.asc"
  });

  return postgrest<AgentScopeApiRow[]>(`agent_scopes?${params.toString()}`);
}

async function buildTenantIdentityContext(tenant: TenantRow): Promise<TenantIdentityContext> {
  const memberships = await getMembershipRows(tenant.id);
  const serviceAgent = await getServiceAgentRow(tenant.id);
  const scopes = serviceAgent ? await getAgentScopes(serviceAgent.id) : [];

  return normalizeTenantIdentityContext({
    tenant,
    memberships,
    serviceAgent,
    scopes
  });
}

export async function getTenantIdentityContext(tenantSlug = supabaseEnv.defaultTenant): Promise<TenantIdentityContext | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    const tenant = await getTenantBySlug(tenantSlug);
    return tenant ? buildTenantIdentityContext(tenant) : null;
  } catch {
    return null;
  }
}

export async function getTenantIdentityContextByTenantId(tenantId: string): Promise<TenantIdentityContext | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    const tenant = await getTenantById(tenantId);
    return tenant ? buildTenantIdentityContext(tenant) : null;
  } catch {
    return null;
  }
}