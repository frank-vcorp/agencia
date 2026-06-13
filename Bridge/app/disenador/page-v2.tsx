/**
 * IMPL-20260612-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-02_disenador_estacion_creativa_refinada_firefly_versionado_v1.md
 *
 * V2 del workspace del diseñador con:
 * - Cola accionable (start/block/firefly/candidate)
 * - Referencias visuales con upload drag-drop
 * - Firefly deep link + callback
 * - Versionado visual 3 niveles con promoción inline
 */
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { DesignerChatPanel } from "@/components/designer-chat-panel";
import { DesignerWorkspaceViewV2 } from "@/components/designer-workspace-v2";
import type {
  DesignerTask,
  DesignerWorkspace
} from "@/lib/designer-workspace";

type AssetReference = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  isPrimary: boolean;
};

type DesignerPageV2Props = {
  workspace: DesignerWorkspace;
};

export default function DesignerPageV2({ workspace }: DesignerPageV2Props) {
  const router = useRouter();
  const focusedTask = workspace.focusedAsset;
  const [referencesByAsset, setReferencesByAsset] = useState<
    Record<string, AssetReference[]>
  >({});
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const focusedAssetId = focusedTask?.assetId;
  const references = focusedAssetId ? referencesByAsset[focusedAssetId] ?? [] : [];

  const focusedTaskContext = focusedTask
    ? {
        tool: focusedTask.suggestedTool,
        promptText: focusedTask.promptText ?? "",
        format: focusedTask.formatCode,
        name: focusedTask.assetTitle
      }
    : undefined;

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  /**
   * Sube archivos de referencia a Supabase Storage.
   * IMPL-20260612-02
   */
  const handleUploadReferences = useCallback(
    async (assetId: string, files: FileList) => {
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const urlResponse = await fetch("/api/designer/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assetId,
              fileName: file.name,
              mimeType: file.type,
              size: file.size
            })
          });

          if (!urlResponse.ok) {
            throw new Error(`upload-url failed: ${urlResponse.status}`);
          }

          const urlData = (await urlResponse.json()) as {
            signedUrl: string | null;
            publicUrl: string;
            fileId: string;
          };

          let finalUrl = urlData.publicUrl;
          if (urlData.signedUrl) {
            const blob = await fetch(URL.createObjectURL(file)).then((r) => r.blob());
            const uploadResponse = await fetch(urlData.signedUrl, {
              method: "PUT",
              headers: { "Content-Type": file.type },
              body: blob
            });
            if (!uploadResponse.ok) {
              throw new Error(`upload failed: ${uploadResponse.status}`);
            }
          }

          const newRef: AssetReference = {
            id: urlData.fileId,
            name: file.name,
            url: finalUrl,
            mimeType: file.type,
            isPrimary: (referencesByAsset[assetId]?.length ?? 0) === 0
          };

          setReferencesByAsset((prev) => ({
            ...prev,
            [assetId]: [...(prev[assetId] ?? []), newRef]
          }));
        }
        showToast("Referencias subidas correctamente");
      } catch (err) {
        console.error("[reference-upload] error", err);
        showToast("Error al subir referencias");
      } finally {
        setUploading(false);
      }
    },
    [referencesByAsset, showToast]
  );

  const handleDeleteReference = useCallback((id: string) => {
    if (!focusedAssetId) return;
    setReferencesByAsset((prev) => ({
      ...prev,
      [focusedAssetId]: (prev[focusedAssetId] ?? []).filter((r) => r.id !== id)
    }));
    showToast("Referencia eliminada");
  }, [focusedAssetId, showToast]);

  const handleSetPrimaryReference = useCallback((id: string) => {
    if (!focusedAssetId) return;
    setReferencesByAsset((prev) => ({
      ...prev,
      [focusedAssetId]: (prev[focusedAssetId] ?? []).map((r) => ({
        ...r,
        isPrimary: r.id === id
      }))
    }));
    showToast("Referencia principal actualizada");
  }, [focusedAssetId, showToast]);

  /**
   * Maneja acciones inline de la cola (start, block, open_firefly, mark_candidate).
   * IMPL-20260612-02
   */
  const handleTaskAction = useCallback(
    (action: string, task: DesignerTask) => {
      switch (action) {
        case "start":
          showToast(`Tarea "${task.assetTitle}" iniciada`);
          // En producción: POST /api/designer/tasks/{id}/start
          router.refresh();
          break;
        case "block":
          showToast(`Tarea "${task.assetTitle}" bloqueada`);
          // En producción: POST /api/designer/tasks/{id}/block
          router.refresh();
          break;
        case "open_firefly":
          // El deep link se maneja directamente con el botón
          break;
        case "mark_candidate":
          showToast(`"${task.assetTitle}" marcada como candidata`);
          // En producción: POST /api/designer/drafts/{id}/promote
          router.refresh();
          break;
        default:
          console.warn(`[designer] unknown action: ${action}`);
      }
    },
    [router, showToast]
  );

  const handlePromoteDraft = useCallback((id: string) => {
    showToast("Promovida a candidata");
    // En producción: POST /api/designer/drafts/{id}/promote
    router.refresh();
  }, [router, showToast]);

  const handleSendToOperator = useCallback((id: string) => {
    showToast("Enviada a operador");
    // En producción: POST /api/designer/drafts/{id}/send-to-operator
    router.refresh();
  }, [router, showToast]);

  const handleUploadDraftFile = useCallback((id: string, file: File) => {
    showToast(`Subiendo ${file.name}...`);
    // En producción: upload a Storage + POST /api/designer/drafts/{id}/file
  }, [showToast]);

  const handleMarkApproved = useCallback((assetId: string) => {
    showToast("Marcada como aprobada por diseño");
    // En producción: POST /api/designer/assets/{id}/approve
    router.refresh();
  }, [router, showToast]);

  return (
    <div className="relative">
      {toast && (
        <div
          className="fixed bottom-4 right-4 z-50 rounded-xl bg-stone-900 px-4 py-2 text-sm text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
      <DesignerWorkspaceViewV2
        workspace={workspace}
        productionAssistant={
          <DesignerChatPanel assetContext={focusedTaskContext} />
        }
        references={references}
        uploadingReferences={uploading}
        onTaskAction={handleTaskAction}
        onUploadReferences={handleUploadReferences}
        onDeleteReference={handleDeleteReference}
        onSetPrimaryReference={handleSetPrimaryReference}
        onPromoteDraft={handlePromoteDraft}
        onSendToOperator={handleSendToOperator}
        onUploadDraftFile={handleUploadDraftFile}
        onMarkApproved={handleMarkApproved}
      />
    </div>
  );
}
