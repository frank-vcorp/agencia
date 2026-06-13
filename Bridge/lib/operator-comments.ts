/**
 * IMPL-20260612-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-01_operador_dashboard_acciones_crud_comentarios_agente_v1.md
 *
 * Tipos para el sistema de comentarios contextuales anclados a entidades.
 * Cada comentario vive en la entidad a la que pertenece (brief, cotización,
 * activo, proyecto, lead) y puede ser interno (operador/diseñador) o visible
 * para el cliente.
 */

/**
 * Tipos de entidad a los que se puede anclar un comentario.
 * IMPL-20260612-01
 */
export type CommentEntityType =
  | "project"
  | "brief"
  | "quotation"
  | "asset"
  | "lead";

/**
 * Visibilidad del comentario.
 * - "internal": solo visible para operador/diseñador
 * - "client": visible también en el portal del cliente
 * IMPL-20260612-01
 */
export type CommentVisibility = "internal" | "client";

/**
 * Autor del comentario.
 * IMPL-20260612-01
 */
export type CommentAuthor =
  | { type: "operator"; userId: string; name: string }
  | { type: "designer"; userId: string; name: string }
  | { type: "agent"; agentId: string; name: string }
  | { type: "client"; userId: string; name: string };

export type OperatorComment = {
  id: string;
  entityType: CommentEntityType;
  entityId: string;
  visibility: CommentVisibility;
  author: CommentAuthor;
  body: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Input para crear un nuevo comentario.
 * IMPL-20260612-01
 */
export type CreateCommentInput = {
  entityType: CommentEntityType;
  entityId: string;
  body: string;
  visibility: CommentVisibility;
  mentions?: string[];
};

/**
 * Propuestas estructuradas que el agente remoto puede enviar.
 * IMPL-20260612-01
 */
export type AgentProposalType =
  | "create_asset"
  | "draft_brief"
  | "draft_quotation"
  | "sync_context"
  | "regenerate_snapshot";

export type AgentProposalStatus = "pending" | "applied" | "rejected" | "modified";

export type AgentProposal = {
  id: string;
  type: AgentProposalType;
  payload: Record<string, unknown>;
  status: AgentProposalStatus;
  receivedAt: string;
  agentId: string;
  projectId: string;
  summary: string;
  diff?: Record<string, { before: unknown; after: unknown }>;
};

/**
 * Acciones que el operador puede disparar al agente remoto.
 * IMPL-20260612-01
 */
export type AgentActionType =
  | "sync_context"
  | "regenerate_snapshot"
  | "create_asset"
  | "draft_brief"
  | "draft_quotation";

export type AgentAction = {
  id: string;
  type: AgentActionType;
  projectId: string;
  payload: Record<string, unknown>;
  status: "dispatched" | "in_progress" | "completed" | "error";
  dispatchedAt: string;
  completedAt: string | null;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
};

/**
 * Mapeo de tipo de propuesta a etiqueta legible.
 * IMPL-20260612-01
 */
export const AGENT_PROPOSAL_TYPE_LABELS: Record<AgentProposalType, string> = {
  create_asset: "Crear activo",
  draft_brief: "Borrador de brief",
  draft_quotation: "Borrador de cotización",
  sync_context: "Sincronizar contexto",
  regenerate_snapshot: "Regenerar snapshot"
};

export const AGENT_ACTION_TYPE_LABELS: Record<AgentActionType, string> = {
  sync_context: "Sincronizar contexto",
  regenerate_snapshot: "Regenerar snapshot",
  create_asset: "Crear activo desde catálogo",
  draft_brief: "Prellenar brief",
  draft_quotation: "Prellenar cotización"
};
