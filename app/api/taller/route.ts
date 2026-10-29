import { GET as getTaller, POST as postTaller } from "@/backend/http/taller";
import { authorize, auditActorAction, isSameOriginRequest, permissionForAction } from "@/backend/http/auth";
import { createHash } from "node:crypto";
import { getDatabase } from "@/db";
import { consumeTranscriptionAfterDocument } from "@/backend/http/operator-transcriptions";

export const dynamic = "force-dynamic";

const json = (body: unknown, status: number) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

export async function GET(request: Request) {
  const { actor, response } = await authorize(request, "workshop.read");
  if (response) {
    const status = response.status;
    const body = status === 401
      ? { locked: true, error: "Inicia sesión para continuar." }
      : { error: "Tu cuenta no tiene acceso al taller." };
    return json(body, status);
  }
  if (!actor) return json({ error: "Inicia sesión para continuar." }, 401);

  const url = new URL(request.url);
  const isRecovery = url.searchParams.get("recovery") === "1";
  const isAudit = url.searchParams.get("audit") === "1";
  const isExport = url.searchParams.has("export");
  const exportKind = url.searchParams.get("export");
  if (isExport && exportKind !== "json" && exportKind !== "csv") return json({ error: "Tipo de exportación inválido." }, 400);
  const privilegedRead = isRecovery || exportKind === "json"
    ? "backup.manage"
    : exportKind === "csv" ? "admin.manage"
    : isAudit ? "admin.manage" : null;
  if (privilegedRead) {
    const guarded = await authorize(request, privilegedRead);
    if (guarded.response) return guarded.response;
  }

  const result = await getTaller(request);
  if (!result.ok || isExport || isRecovery || isAudit) return result;
  const data = await result.json() as Record<string, unknown>;
  const can = (...permissions: string[]) => actor.permissions.includes("*") || permissions.some((permission) => actor.permissions.includes(permission));
  const canOrders = can("orders.read", "orders.write", "repairs.write");
  const canCustomers = can("customers.read", "customers.write");
  const canParts = can("parts.write", "procurement.read", "procurement.write", "suppliers.read");
  const canSuppliers = can("suppliers.read", "procurement.read", "procurement.write", "admin.manage");
  const canProcurement = can("procurement.read", "procurement.write");
  const canPayments = can("payments.write");
  const canCash = can("cash.write");
  const canInventory = can("pos.write", "admin.manage");
  const canPos = can("pos.write");
  const canWarranties = can("warranties.write", "admin.manage");

  const empty = (key: string) => { data[key] = []; };
  if (!canOrders) for (const key of ["orders", "orderRepairs", "orderResolutions", "warrantyClaims", "partRequests"]) empty(key);
  if (!canCustomers) for (const key of ["customers", "receptions"]) empty(key);
  if (!canOrders && !can("quotes.write")) empty("quotes");
  if (!canOrders || !canWarranties) empty("warrantyClaims");
  if (!canPayments) empty("orderResolutions");
  if (!canParts) for (const key of ["partRequests", "partQuotes", "priceRequests", "priceRequestSuppliers", "supplierResponses", "supplierInboxMessages"]) empty(key);
  if (!canSuppliers) empty("suppliers");
  if (!canProcurement) for (const key of ["purchaseOrders", "purchaseOrderItems", "supplierPayments", "purchaseReceipts", "purchaseReceiptItems"]) empty(key);
  if (!canPayments) empty("payments");
  if (!canCash) for (const key of ["cashOutflows", "recurringExpenses", "recurringExpenseOccurrences", "cashClosings"]) empty(key);
  if (!canInventory) empty("products");
  else if (!can("procurement.write", "admin.manage")) {
    data.products = (data.products as Array<Record<string, unknown>>).map((product) => ({ ...product, costCents: null }));
  }
  if (!canPos) for (const key of ["sales"]) empty(key);
  if (!can("orders.read", "orders.write", "repairs.write", "quotes.write")) empty("quotes");

  const settings = data.settings;
  if (settings && typeof settings === "object") {
    delete (settings as Record<string, unknown>).pinHash;
    delete (settings as Record<string, unknown>).pinSalt;
  }
  return json(data, result.status);
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return json({ error: "Origen de solicitud no permitido." }, 403);
  const { actor, response } = await authorize(request, "workshop.read");
  if (response || !actor) return response || json({ error: "Inicia sesión para continuar." }, 401);
  let body: Record<string, unknown>;
  try {
    const parsed = await request.clone().json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Solicitud inválida." }, 400);
    body = parsed as Record<string, unknown>;
  } catch { return json({ error: "Solicitud inválida." }, 400); }
  const action = String(body.action || "");
  const hasTranscription = body.transcriptionId !== undefined;
  const createsOrderOrQuote = action === "createOrder" || action === "createQuote";
  const transcriptionId = hasTranscription ? Number(body.transcriptionId) : null;
  if (hasTranscription && (!createsOrderOrQuote || !Number.isSafeInteger(transcriptionId) || Number(transcriptionId) < 1)) {
    return json({ error: "La ficha de transcripción solo puede asociarse al crear una orden o presupuesto." }, 400);
  }
  const permission = permissionForAction(body.action);
  const authorization = await authorize(request, permission);
  if (authorization.response) return authorization.response;
  const result = await postTaller(request);
  if (result.ok && transcriptionId !== null) {
    try {
      const payload = await result.clone().json() as { id?: unknown };
      const documentId = Number(payload.id);
      if (!Number.isSafeInteger(documentId) || documentId < 1) throw new Error("No se confirmó el identificador del documento.");
      await consumeTranscriptionAfterDocument(actor.id, transcriptionId, action === "createOrder" ? "order" : "quote", documentId);
    } catch (error) {
      console.error("operator-transcription-consume", error instanceof Error ? error.name : "UnknownError");
      const payload = await result.clone().json().catch(() => ({})) as Record<string, unknown>;
      return json({
        ...payload,
        transcriptionWarning: "El documento se creó, pero la ficha sigue pendiente porque no se pudo confirmar su uso. No vuelvas a guardar el documento; revisa o descarta la ficha desde el chat.",
      }, result.status);
    }
  }
  if (result.headers.has("set-cookie") && ["unlock", "configurePin"].includes(String(body.action))) {
    const token = result.headers.get("set-cookie")?.match(/salvacel_session=([^;]+)/)?.[1];
    if (token) await getDatabase().prepare("DELETE FROM sessions WHERE token_hash=?").bind(createHash("sha256").update(decodeURIComponent(token)).digest("hex")).run();
    const headers = new Headers(result.headers);
    headers.delete("set-cookie");
    return new Response(result.body, { status: result.status, statusText: result.statusText, headers });
  }
  if (result.ok && body.action !== "unlock" && body.action !== "revealUnlock") {
    const id = Number(body.id);
    try { await auditActorAction(actor, String(body.action || "unknown"), Number.isSafeInteger(id) && id > 0 ? id : null); }
    catch (error) { console.error("actor-audit", error instanceof Error ? error.name : "UnknownError"); }
  }
  return result;
}
