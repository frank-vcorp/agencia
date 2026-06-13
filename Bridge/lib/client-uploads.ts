/**
 * IMPL-20260612-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-03_cliente_portal_briefing_file_upload_estados_v1.md
 *
 * Tipos para el sistema de file upload del cliente en el briefing conversacional.
 * Soporta imágenes, PDFs y documentos de contexto subidos por el cliente durante
 * la conversación con Vika.
 */

export const CLIENT_UPLOAD_MAX_BYTES = 50 * 1024 * 1024; // 50MB
export const CLIENT_UPLOAD_MAX_FILES_PER_MESSAGE = 10;

export const CLIENT_UPLOAD_ALLOWED_MIME_PREFIXES = [
  "image/",
  "video/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
] as const;

export type ClientUploadedFileStatus = "uploading" | "ready" | "error";

/**
 * Representa un archivo adjunto en el chat del cliente.
 * El campo `url` puede ser un blob URL temporal (antes de subir) o la
 * URL permanente de Supabase Storage (después de subir).
 */
export type ClientUploadedFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  previewUrl?: string;
  uploadedAt: string;
  status: ClientUploadedFileStatus;
};

/**
 * Tipos de contenido para un mensaje del cliente.
 * IMPL-20260612-03
 */
export type ClientMessageContent =
  | { type: "text"; text: string }
  | { type: "file"; file: ClientUploadedFile; caption?: string }
  | { type: "mixed"; text: string; files: ClientUploadedFile[] };

/**
 * Valida que un MIME type sea aceptable para upload del cliente.
 * IMPL-20260612-03
 */
export function isClientUploadMimeAllowed(mimeType: string): boolean {
  return CLIENT_UPLOAD_ALLOWED_MIME_PREFIXES.some(
    (prefix) => mimeType === prefix || mimeType.startsWith(prefix)
  );
}

/**
 * Formatea un tamaño en bytes a una cadena legible.
 * IMPL-20260612-03
 */
export function formatClientUploadBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Construye la ruta de Storage para un archivo del cliente.
 * Formato: `client-uploads/{projectId}/{messageId}/{fileId}-{sanitizedName}`
 * IMPL-20260612-03
 */
export function buildClientUploadPath(params: {
  projectId: string;
  messageId: string;
  fileId: string;
  fileName: string;
}): string {
  const sanitized = params.fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return `client-uploads/${params.projectId}/${params.messageId}/${params.fileId}-${sanitized}`;
}
