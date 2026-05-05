/**
 * IMPL-20260505-21
 * Respaldo: context/IDENTIDAD_Y_MEMBERSHIPS_V1.md, context/SPECs/SPEC_ARCH-20260505-21_memberships_users_y_actor_efectivo_v1.md
 */
import { describe, expect, it } from "vitest";

import { normalizeTenantIdentityContext, resolveActorTrace } from "./identity";

describe("identity", () => {
  it("normaliza memberships activas por rol y scopes del agente tecnico", () => {
    const context = normalizeTenantIdentityContext({
      tenant: {
        id: "tenant-1",
        slug: "vectoria",
        name: "Vectoria"
      },
      memberships: [
        {
          id: "membership-operator",
          tenant_id: "tenant-1",
          user_id: "user-operator",
          role: "operator",
          status: "active",
          users: {
            id: "user-operator",
            display_name: "Vectoria Operaciones",
            email: "operador@vectoria.demo",
            user_type: "operator"
          }
        },
        {
          id: "membership-client",
          tenant_id: "tenant-1",
          user_id: "user-client",
          role: "client_admin",
          status: "active",
          users: {
            id: "user-client",
            display_name: "Cliente Vectoria Demo",
            email: "cliente@vectoria.demo",
            user_type: "client"
          }
        }
      ],
      serviceAgent: {
        id: "agent-1",
        tenant_id: "tenant-1",
        name: "Bridge VS Code Operator",
        agent_type: "vscode_operator_agent",
        auth_mode: "service_role",
        status: "active"
      },
      scopes: [
        {
          id: "scope-1",
          tenant_id: "tenant-1",
          resource_type: "briefing",
          operation: "persist_and_route",
          approval_required: true
        }
      ]
    });

    expect(context.operatorMembership?.displayName).toBe("Vectoria Operaciones");
    expect(context.clientMembership?.email).toBe("cliente@vectoria.demo");
    expect(context.serviceAgent?.scopes[0]).toEqual({
      id: "scope-1",
      tenantId: "tenant-1",
      resourceType: "briefing",
      operation: "persist_and_route",
      approvalRequired: true
    });
  });

  it("separa actor tecnico y actor efectivo cuando opera un agente", () => {
    const trace = resolveActorTrace({
      fallbackLabel: "Bridge briefing",
      technicalActor: {
        id: "agent-1",
        tenantId: "tenant-1",
        name: "Bridge VS Code Operator",
        agentType: "vscode_operator_agent",
        authMode: "service_role",
        status: "active",
        scopes: []
      },
      effectiveMembership: {
        id: "membership-operator",
        tenantId: "tenant-1",
        userId: "user-operator",
        role: "operator",
        status: "active",
        displayName: "Vectoria Operaciones",
        email: "operador@vectoria.demo",
        userType: "operator"
      }
    });

    expect(trace).toEqual({
      actorLabel: "Bridge VS Code Operator · Vectoria Operaciones",
      actorUserId: null,
      actorMembershipId: null,
      actorAgentId: "agent-1",
      effectiveUserId: "user-operator",
      effectiveMembershipId: "membership-operator"
    });
  });
});