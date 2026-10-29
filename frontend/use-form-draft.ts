"use client";

import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "./ui";

export type FormDraftKind = "order" | "reception";
export type WorkshopDraft<T> = {
  id: string;
  kind: FormDraftKind;
  payload: T;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
type DraftApiRow = Omit<WorkshopDraft<unknown>, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };

export function useFormDraft<T>({ kind, payload, enabled, hasContent, restore }: {
  kind: FormDraftKind;
  payload: T;
  enabled: boolean;
  hasContent: boolean;
  restore: (payload: T) => void;
}) {
  const [id, setId] = useState(() => crypto.randomUUID());
  const completed = useRef(false);
  const saveController = useRef<AbortController | null>(null);
  const pendingSave = useRef<Promise<void> | null>(null);
  const [drafts, setDrafts] = useState<WorkshopDraft<T>[]>([]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const serializedPayload = JSON.stringify(payload);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void fetch("/api/drafts", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudieron consultar los borradores.");
        const result = await response.json() as { drafts?: DraftApiRow[] };
        setDrafts((result.drafts ?? []).filter((draft): draft is WorkshopDraft<T> => draft.kind === kind));
      })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron consultar los borradores."); })
      .finally(() => { if (!controller.signal.aborted) setReady(true); });
    return () => controller.abort();
  }, [enabled, kind]);

  useEffect(() => {
    if (!enabled || !ready || !hasContent || completed.current) return;
    const timer = window.setTimeout(() => {
      setStatus("saving");
      setError("");
      const controller = new AbortController();
      saveController.current = controller;
      const operation = fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, kind, payload: JSON.parse(serializedPayload) }),
        signal: controller.signal,
      }).then(async (response) => {
        const result = await response.json() as { error?: string; revision?: number; updatedAt?: string };
        if (!response.ok) throw new Error(result.error || "No se pudo guardar el borrador.");
        if (!controller.signal.aborted) {
          setStatus("saved");
          const savedAt = result.updatedAt || new Date().toISOString();
          setDrafts((current) => {
            const existing = current.find((draft) => draft.id === id);
            const savedDraft: WorkshopDraft<T> = {
              id, kind, payload: JSON.parse(serializedPayload) as T,
              revision: result.revision || existing?.revision || 1,
              createdAt: existing?.createdAt || savedAt, updatedAt: savedAt,
            };
            return [savedDraft, ...current.filter((draft) => draft.id !== id)].slice(0, 20);
          });
        }
      }).catch((cause) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "No se pudo guardar el borrador.");
      }).finally(() => {
        if (saveController.current === controller) saveController.current = null;
        if (pendingSave.current === operation) pendingSave.current = null;
      });
      pendingSave.current = operation;
    }, 700);
    return () => { window.clearTimeout(timer); saveController.current?.abort(); };
  }, [enabled, hasContent, id, kind, ready, serializedPayload]);

  const restoreDraft = useCallback((draft: WorkshopDraft<T>) => {
    completed.current = false;
    setId(draft.id);
    setStatus("saved");
    restore(draft.payload);
  }, [restore]);

  const discard = useCallback(async (draftId = id) => {
    completed.current = draftId === id;
    if (draftId === id) {
      saveController.current?.abort();
      await pendingSave.current;
    }
    const response = await fetch("/api/drafts", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draftId }),
    });
    if (!response.ok && response.status !== 404) {
      const result = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(result.error || "No se pudo descartar el borrador.");
    }
    setDrafts((current) => current.filter((draft) => draft.id !== draftId));
    if (draftId === id) setStatus("idle");
  }, [id]);

  return { drafts, status, error, restoreDraft, discard, ready };
}

export function DraftRecovery<T>({ drafts, onRestore, onDiscard }: {
  drafts: WorkshopDraft<T>[];
  onRestore: (draft: WorkshopDraft<T>) => void;
  onDiscard: (draft: WorkshopDraft<T>) => void;
}) {
  if (!drafts.length) return null;
  return createElement(DraftRecoveryList<T>, { drafts, onRestore, onDiscard });
}

function DraftRecoveryList<T>({ drafts, onRestore, onDiscard }: {
  drafts: WorkshopDraft<T>[];
  onRestore: (draft: WorkshopDraft<T>) => void;
  onDiscard: (draft: WorkshopDraft<T>) => void;
}) {
  const [discarding, setDiscarding] = useState<WorkshopDraft<T> | null>(null);
  const draftItems = drafts.map((draft) => createElement("li", { key: draft.id },
    createElement("span", null,
      createElement("strong", null, draft.kind === "order" ? "Orden rápida" : "Recepción"),
      createElement("small", null, `Guardado ${new Date(draft.updatedAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}`)),
    createElement("span", { className: "row-actions" },
      createElement("button", { type: "button", className: "sc-button secondary small", onClick: () => onRestore(draft) }, "Recuperar"),
      createElement("button", { type: "button", className: "link-button", onClick: () => setDiscarding(draft) }, "Descartar"))));
  const list = createElement("details", { className: "form-draft-recovery" },
    createElement("summary", null, `Recuperar borrador guardado (${drafts.length})`),
    createElement("ul", null, ...draftItems));
  const dialogContent = discarding ? createElement("div", null,
      createElement("div", { className: "form-body" },
        createElement("p", null, "Se eliminará solo el borrador guardado. Esto no crea ni modifica una orden registrada.")),
      createElement("div", { className: "dialog-actions" },
        createElement("button", { type: "button", className: "sc-button secondary", onClick: () => setDiscarding(null) }, "Conservar borrador"),
        createElement("button", { type: "button", className: "sc-button danger", onClick: () => { onDiscard(discarding); setDiscarding(null); } }, "Descartar borrador"))) : null;
  const dialog = discarding && dialogContent ? createElement(Modal, {
    title: "Descartar borrador",
    eyebrow: discarding.kind === "order" ? "ORDEN RÁPIDA" : "RECEPCIÓN",
    close: () => setDiscarding(null),
  }, dialogContent) : null;
  return createElement("div", null, list, dialog);
}
