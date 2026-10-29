import { randomUUID } from "node:crypto";
import type { WorkshopActor } from "@/backend/http/auth";

export type ChatView = "home" | "orders" | "customers" | "quotes" | "pos" | "parts" | "suppliers";
export type ChatAction =
  | { type: "navigate"; view: ChatView }
  | { type: "open_order"; orderId: number }
  | { type: "open_customer"; customerId: number }
  | { type: "draft_order"; draft: Record<string, string> }
  | { type: "draft_customer"; draft: Record<string, string> }
  | { type: "draft_product"; draft: Record<string, string> }
  | { type: "transcription_result"; fields: Record<string, string> };
export type ChatTurnResult = { reply: string; action?: ChatAction };
export type ChatTurnKind = "chat" | "transcription";

type PendingTurn = {
  kind: ChatTurnKind;
  actorId: number;
  permissions: string[];
  orderRefs: Map<string, number>;
  customerIds: Set<number>;
  resolve: (result: ChatTurnResult | null) => void;
  timer: NodeJS.Timeout;
};

const turnKey = Symbol.for("salvacel.operator-chat-turns");
type TurnGlobal = typeof globalThis & { [turnKey]?: Map<string, PendingTurn> };
const turns = ((globalThis as TurnGlobal)[turnKey] ??= new Map());

export function createChatTurn(actor: WorkshopActor, allowedRecords: { orders?: Array<{ folio: string; id: number }>; customerIds?: number[] } = {}, kind: ChatTurnKind = "chat"): { id: string; result: Promise<ChatTurnResult | null> } {
  const id = randomUUID();
  let resolve!: (result: ChatTurnResult | null) => void;
  const result = new Promise<ChatTurnResult | null>((done) => { resolve = done; });
  const timer = setTimeout(() => finishChatTurn(id, null), 52_000);
  timer.unref();
  turns.set(id, { kind, actorId: actor.id, permissions: actor.permissions, orderRefs: new Map((allowedRecords.orders || []).map((order) => [order.folio.toLocaleUpperCase(), order.id])), customerIds: new Set(allowedRecords.customerIds || []), resolve, timer });
  return { id, result };
}

export function resolveChatRecordReference(id: string, type: "order" | "customer", reference: string): number | undefined {
  const pending = turns.get(id);
  if (!pending) return undefined;
  if (type === "order") return pending.orderRefs.get(reference.toLocaleUpperCase());
  const match = /^CLI-(\d{6})$/i.exec(reference);
  if (!match) return undefined;
  const recordId = Number(match[1]);
  return Number.isSafeInteger(recordId) && pending.customerIds.has(recordId) ? recordId : undefined;
}

function can(permissions: string[], ...required: string[]) {
  return permissions.includes("*") || required.some((permission) => permissions.includes(permission));
}

export function finishChatTurn(id: string, result: ChatTurnResult | null): boolean {
  const pending = turns.get(id);
  if (!pending) return false;
  turns.delete(id);
  clearTimeout(pending.timer);
  pending.resolve(result);
  return true;
}

export function acceptChatTurnResult(id: string, result: ChatTurnResult): "accepted" | "forbidden" | "missing" {
  const pending = turns.get(id);
  if (!pending) return "missing";
  const action = result.action;
  if (pending.kind === "transcription" && (action?.type !== "transcription_result" || !can(pending.permissions, "orders.write", "quotes.write"))) return "forbidden";
  if (pending.kind === "chat" && action?.type === "transcription_result") return "forbidden";
  if (action?.type === "navigate") {
    const permitted = action.view === "home" ? can(pending.permissions, "workshop.read")
      : action.view === "orders" ? can(pending.permissions, "orders.read", "orders.write", "repairs.write")
        : action.view === "customers" ? can(pending.permissions, "customers.read", "customers.write")
          : action.view === "quotes" ? can(pending.permissions, "orders.read", "orders.write", "repairs.write", "quotes.write")
            : action.view === "pos" ? can(pending.permissions, "pos.write")
              : action.view === "parts" ? can(pending.permissions, "parts.write", "procurement.read", "procurement.write", "suppliers.read")
                : can(pending.permissions, "suppliers.read", "procurement.read", "procurement.write");
    if (!permitted) return "forbidden";
  }
  if (action?.type === "draft_order" && !can(pending.permissions, "orders.write")) return "forbidden";
  if (action?.type === "draft_customer" && !can(pending.permissions, "customers.write")) return "forbidden";
  if (action?.type === "draft_product" && !can(pending.permissions, "admin.manage")) return "forbidden";
  if (action?.type === "open_order" && (!can(pending.permissions, "orders.read", "orders.write", "repairs.write") || ![...pending.orderRefs.values()].includes(action.orderId))) return "forbidden";
  if (action?.type === "open_customer" && (!can(pending.permissions, "customers.read", "customers.write") || !pending.customerIds.has(action.customerId))) return "forbidden";
  finishChatTurn(id, result);
  return "accepted";
}
