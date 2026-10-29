import { randomUUID } from "node:crypto";
import { authorize, auditActorAction, isSameOriginRequest } from "@/backend/http/auth";
import { getDatabase } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxDraftBytes = 256 * 1024;
const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
type JsonObject = Record<string, unknown>;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStore });
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 12) throw new Error("El borrador tiene demasiados niveles.");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > 12_000) throw new Error("Un campo del borrador es demasiado largo.");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("El borrador contiene un número inválido.");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 200) throw new Error("El borrador contiene demasiados elementos.");
    return value.map((entry) => sanitize(entry, depth + 1));
  }
  if (!value || typeof value !== "object") throw new Error("El borrador contiene un dato no compatible.");
  const entries = Object.entries(value as JsonObject);
  if (entries.length > 150) throw new Error("El borrador contiene demasiados campos.");
  return Object.fromEntries(entries
    .filter(([key]) => !/^(unlockCode|password|token|secret|apiKey)$/i.test(key))
    .map(([key, entry]) => [key, sanitize(entry, depth + 1)]));
}

function parseDraftId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

export async function GET(request: Request) {
  const { actor, response } = await authorize(request, "orders.write");
  if (response || !actor) return response || json({ error: "Inicia sesión para continuar." }, 401);
  try {
    const expiresBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await getDatabase().prepare(`DELETE FROM form_drafts WHERE owner_user_id=? AND updated_at<?`).bind(actor.id, expiresBefore).run();
    const result = await getDatabase().prepare(`SELECT id,kind,payload,revision,created_at,updated_at
      FROM form_drafts WHERE owner_user_id=? ORDER BY updated_at DESC LIMIT 20`).bind(actor.id).all();
    return json({ drafts: result.results.map((row) => ({
      id: row.id, kind: row.kind, payload: row.payload, revision: row.revision,
      createdAt: row.created_at, updatedAt: row.updated_at,
    })) });
  } catch (error) {
    console.error("draft-list", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "No se pudieron recuperar los borradores." }, 503);
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return json({ error: "Origen de solicitud no permitido." }, 403);
  const { actor, response } = await authorize(request, "orders.write");
  if (response || !actor) return response || json({ error: "Inicia sesión para continuar." }, 401);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxDraftBytes) return json({ error: "El borrador supera el tamaño permitido." }, 413);
  let body: JsonObject;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxDraftBytes) return json({ error: "El borrador supera el tamaño permitido." }, 413);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Solicitud inválida." }, 400);
    body = parsed as JsonObject;
  } catch {
    return json({ error: "El cuerpo del borrador no es JSON válido." }, 400);
  }
  const id = body.id === undefined ? randomUUID() : parseDraftId(body.id);
  if (!id) return json({ error: "Identificador de borrador inválido." }, 400);
  const kind = body.kind;
  if (kind !== "order" && kind !== "reception") return json({ error: "Tipo de borrador inválido." }, 400);
  let payload: unknown;
  try {
    payload = sanitize(body.payload);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "El contenido del borrador no es válido." }, 400);
    if (Buffer.byteLength(JSON.stringify(payload), "utf8") > maxDraftBytes) return json({ error: "El borrador supera el tamaño permitido." }, 413);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "El borrador no es válido." }, 400);
  }
  const now = new Date().toISOString();
  try {
    const saved = await getDatabase().prepare(`INSERT INTO form_drafts (id,owner_user_id,kind,payload,revision,created_at,updated_at)
      VALUES (?,?,?,?::jsonb,1,?,?)
      ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,revision=form_drafts.revision+1,updated_at=EXCLUDED.updated_at
      WHERE form_drafts.owner_user_id=EXCLUDED.owner_user_id AND form_drafts.kind=EXCLUDED.kind
      RETURNING id,revision,updated_at`).bind(id, actor.id, kind, JSON.stringify(payload), now, now).first() as JsonObject | null;
    if (!saved) return json({ error: "No se pudo actualizar ese borrador." }, 409);
    return json({ id: saved.id, revision: saved.revision, updatedAt: saved.updated_at });
  } catch (error) {
    console.error("draft-save", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "No se pudo guardar el borrador." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return json({ error: "Origen de solicitud no permitido." }, 403);
  const { actor, response } = await authorize(request, "orders.write");
  if (response || !actor) return response || json({ error: "Inicia sesión para continuar." }, 401);
  let body: JsonObject;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Solicitud inválida." }, 400);
    body = parsed as JsonObject;
  } catch { return json({ error: "Solicitud inválida." }, 400); }
  const id = parseDraftId(body.id);
  if (!id) return json({ error: "Borrador inválido." }, 400);
  try {
    const deleted = await getDatabase().prepare(`DELETE FROM form_drafts WHERE id=? AND owner_user_id=? RETURNING id`).bind(id, actor.id).first() as JsonObject | null;
    if (!deleted) return json({ error: "No se encontró el borrador de esta cuenta." }, 404);
    await auditActorAction(actor, "form_draft_discarded", null).catch((error) => console.error("draft-audit", error instanceof Error ? error.name : "UnknownError"));
    return json({ ok: true });
  } catch (error) {
    console.error("draft-delete", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "No se pudo descartar el borrador." }, 503);
  }
}
