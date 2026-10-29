import { getDatabase } from "@/db";
import { interpretOperatorTranscript, operatorTranscriptAvailable } from "@/backend/http/operator-chat";
import { authorize, hasPermission, isSameOriginRequest, type WorkshopActor } from "@/backend/http/auth";

const maxTranscriptLength = 12_000;
const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});
const cleanupKey = Symbol.for("salvacel.operator-transcription-cleanup");
type CleanupGlobal = typeof globalThis & { [cleanupKey]?: NodeJS.Timeout };
type TranscriptionRow = {
  id: number;
  status: string;
  created_at: string;
  expires_at: string;
  transcript_text: string | null;
  extracted_fields: Record<string, string> | string | null;
};
const rateWindows = new Map<number, { startedAt: number; count: number }>();

function consumeTranscriptionRate(actorId: number) {
  const now = Date.now();
  const current = rateWindows.get(actorId);
  if (!current || now - current.startedAt >= 60_000) {
    rateWindows.set(actorId, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 10;
}

function canUseTranscriptions(actor: WorkshopActor) {
  return hasPermission(actor, "orders.write") || hasPermission(actor, "quotes.write");
}

async function actorFor(request: Request) {
  const { actor, response } = await authorize(request, "workshop.read");
  if (response || !actor) return { actor: null, response: response || json({ error: "Inicia sesión para continuar." }, 401) };
  if (!canUseTranscriptions(actor)) return { actor: null, response: json({ error: "Tu cuenta no puede preparar órdenes ni presupuestos." }, 403) };
  return { actor, response: null };
}

function fieldsValue(value: TranscriptionRow["extracted_fields"]): Record<string, string> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, string> : null;
    } catch { return null; }
  }
  return value;
}

function card(row: TranscriptionRow) {
  const fields = row.status === "pendiente" ? fieldsValue(row.extracted_fields) : null;
  const name = fields ? [fields.firstName, fields.lastName].filter(Boolean).join(" ") : "";
  const device = fields ? [fields.brand, fields.model].filter(Boolean).join(" ") : "";
  const need = fields?.problem || fields?.repairType || fields?.intent || "";
  return {
    id: Number(row.id),
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    fields,
    summary: [name || "Cliente no identificado", device || "Equipo no identificado", need || "Necesidad por revisar"].join(" · "),
  };
}

async function expireOperatorRows(actor: WorkshopActor) {
  const database = getDatabase();
  const now = new Date().toISOString();
  await database.transaction(async (client) => {
    const expired = await database.prepare(`UPDATE operator_transcriptions
      SET status='caducada',transcript_text=NULL,extracted_fields=NULL
      WHERE operator_user_id=? AND status='pendiente' AND expires_at<=?
      RETURNING id`).bind(actor.id, now).all(client);
    for (const row of expired.results) {
      await database.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id)
        VALUES ('api',?,'operator_transcription_expired','Operación autorizada por la API.',?,?)`)
        .bind(Number(row.id), now, actor.id).run(client);
    }
  });
}

async function interpretAndSave(actor: WorkshopActor, id: number, transcript: string) {
  const fields = await interpretOperatorTranscript(actor, transcript);
  const database = getDatabase();
  const now = new Date().toISOString();
  await database.transaction(async (client) => {
    const updated = await database.prepare(`UPDATE operator_transcriptions SET extracted_fields=?
      WHERE id=? AND operator_user_id=? AND status='pendiente' AND expires_at>?
      RETURNING id`).bind(JSON.stringify(fields), id, actor.id, now).all(client);
    if (!updated.results.length) throw new Error("La ficha venció o ya no está disponible.");
    await database.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id)
      VALUES ('api',?,'operator_transcription_interpreted','Operación autorizada por la API.',?,?)`)
      .bind(id, now, actor.id).run(client);
  });
  return fields;
}

function safeError(error: unknown) {
  if (error instanceof Error && error.message.includes("venció")) return error.message;
  return "No se pudo interpretar la transcripción. Se conservó temporalmente para reintentar o descartar.";
}

export async function GETTranscriptions(request: Request) {
  const { actor, response } = await actorFor(request);
  if (response || !actor) return response || json({ error: "Inicia sesión para continuar." }, 401);
  await expireOperatorRows(actor);
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    if (!/^\d{1,10}$/.test(id)) return json({ error: "Ficha inválida." }, 400);
    const row = await getDatabase().prepare(`SELECT id,status,created_at,expires_at,transcript_text,extracted_fields
      FROM operator_transcriptions WHERE id=? AND operator_user_id=? AND status='pendiente'`)
      .bind(Number(id), actor.id).first() as TranscriptionRow | null;
    if (!row?.transcript_text) return json({ error: "La transcripción no está disponible." }, 404);
    await getDatabase().prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id)
      VALUES ('api',?,'operator_transcription_viewed','Operación autorizada por la API.',?,?)`)
      .bind(Number(id), new Date().toISOString(), actor.id).run();
    return json({ ...card(row), transcript: row.transcript_text });
  }
  const rows = await getDatabase().prepare(`SELECT id,status,created_at,expires_at,transcript_text,extracted_fields
    FROM operator_transcriptions WHERE operator_user_id=? ORDER BY created_at DESC,id DESC LIMIT 30`)
    .bind(actor.id).all();
  return json({
    enabled: operatorTranscriptAvailable(),
    privacyNotice: process.env.SALVACEL_TRANSCRIPTION_PRIVACY_NOTICE?.trim() || "",
    items: rows.results.map((row) => card(row as TranscriptionRow)),
  });
}

export async function POSTTranscriptions(request: Request) {
  if (!isSameOriginRequest(request)) return json({ error: "Origen de solicitud no permitido." }, 403);
  const { actor, response } = await actorFor(request);
  if (response || !actor) return response || json({ error: "Inicia sesión para continuar." }, 401);
  if (!consumeTranscriptionRate(actor.id)) return json({ error: "Alcanzaste el límite temporal de transcripciones. Espera un minuto e inténtalo de nuevo." }, 429);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > maxTranscriptLength + 256) return json({ error: "La transcripción supera el límite permitido." }, 413);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Solicitud inválida." }, 400);
    body = parsed as Record<string, unknown>;
  } catch { return json({ error: "Solicitud inválida." }, 400); }

  const database = getDatabase();
  const now = new Date().toISOString();
  if (body.action === "start" || body.action === "discardCapture") {
    if (body.action === "start" && !operatorTranscriptAvailable()) {
      return json({ error: "La transcripción está deshabilitada hasta que se apruebe el aviso de privacidad y la configuración de OpenClaw." }, 503);
    }
    const action = body.action === "start" ? "operator_transcription_started" : "operator_transcription_capture_discarded";
    await database.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id)
      VALUES ('api',NULL,?,'Operación autorizada por la API.',?,?)`).bind(action, now, actor.id).run();
    return json({ ok: true });
  }

  if (!operatorTranscriptAvailable()) return json({ error: "La transcripción está deshabilitada hasta que se apruebe el aviso de privacidad y la configuración de OpenClaw." }, 503);

  if (body.action === "create") {
    if (typeof body.transcript !== "string" || !body.transcript.trim() || body.transcript.trim().length > maxTranscriptLength) {
      return json({ error: "La transcripción debe contener entre 1 y 12 000 caracteres." }, 400);
    }
    const transcript = body.transcript.trim();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const inserted = await database.transaction(async (client) => {
      const result = await database.prepare(`INSERT INTO operator_transcriptions
        (operator_user_id,transcript_text,extracted_fields,status,created_at,expires_at)
        VALUES (?,?,NULL,'pendiente',?,?) RETURNING id`)
        .bind(actor.id, transcript, now, expiresAt).all(client);
      const id = Number(result.results[0]?.id);
      if (!Number.isSafeInteger(id) || id < 1) throw new Error("No se pudo crear la ficha de transcripción.");
      await database.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id)
        VALUES ('api',?,'operator_transcription_finalized','Operación autorizada por la API.',?,?)`)
        .bind(id, now, actor.id).run(client);
      return id;
    });
    try {
      const fields = await interpretAndSave(actor, inserted, transcript);
      return json({ id: inserted, status: "pendiente", createdAt: now, expiresAt, fields }, 201);
    } catch (error) {
      return json({ id: inserted, status: "pendiente", interpretationPending: true, error: safeError(error) }, 503);
    }
  }

  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: "Ficha inválida." }, 400);
  const row = await database.prepare(`SELECT id,transcript_text FROM operator_transcriptions
    WHERE id=? AND operator_user_id=? AND status='pendiente' AND expires_at>?`)
    .bind(id, actor.id, now).first() as { id: number; transcript_text: string | null } | null;
  if (!row) return json({ error: "La ficha ya no está pendiente o venció." }, 404);
  if (body.action === "retry") {
    if (!row.transcript_text) return json({ error: "No hay transcripción disponible para reintentar." }, 409);
    try {
      const fields = await interpretAndSave(actor, id, row.transcript_text);
      return json({ id, status: "pendiente", fields });
    } catch (error) {
      return json({ id, status: "pendiente", interpretationPending: true, error: safeError(error) }, 503);
    }
  }
  if (body.action === "discard") {
    await database.transaction(async (client) => {
      const discarded = await database.prepare(`UPDATE operator_transcriptions SET status='descartada',
        transcript_text=NULL,extracted_fields=NULL,discarded_at=?
        WHERE id=? AND operator_user_id=? AND status='pendiente' AND expires_at>?
        RETURNING id`).bind(now, id, actor.id, now).all(client);
      if (!discarded.results.length) throw new Error("La ficha ya no está pendiente.");
      await database.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id)
        VALUES ('api',?,'operator_transcription_discarded','Operación autorizada por la API.',?,?)`)
        .bind(id, now, actor.id).run(client);
    });
    return json({ id, status: "descartada" });
  }
  return json({ error: "Acción de transcripción desconocida." }, 400);
}

export async function consumeTranscriptionAfterDocument(actorId: number, transcriptionId: number, documentType: "order" | "quote", documentId: number) {
  const database = getDatabase();
  const now = new Date().toISOString();
  const table = documentType === "order" ? "orders" : "quotes";
  return database.transaction(async (client) => {
    const document = await client.query<{ id: number }>(`SELECT id FROM ${table} WHERE id=$1`, [documentId]);
    if (!document.rows.length) throw new Error("No se confirmó la creación del documento.");
    const existing = await client.query<{ status: string; used_document_type: string | null; used_document_id: number | null }>(
      `SELECT status,used_document_type,used_document_id FROM operator_transcriptions WHERE id=$1 AND operator_user_id=$2 FOR UPDATE`,
      [transcriptionId, actorId],
    );
    const current = existing.rows[0];
    if (current?.status === "usada" && current.used_document_type === documentType && Number(current.used_document_id) === documentId) return true;
    const consumed = await client.query<{ id: number }>(`UPDATE operator_transcriptions SET status='usada',
      transcript_text=NULL,extracted_fields=NULL,used_at=$1,used_document_type=$4,used_document_id=$5
      WHERE id=$2 AND operator_user_id=$3 AND status='pendiente' AND expires_at>$1
      RETURNING id`, [now, transcriptionId, actorId, documentType, documentId]);
    if (!consumed.rows.length) throw new Error("La ficha no está pendiente, venció o pertenece a otro operador.");
    await client.query(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id)
      VALUES ('api',$1,'operator_transcription_used','Operación autorizada por la API.',$2,$3)`, [transcriptionId, now, actorId]);
    return true;
  });
}

export async function expireAllOperatorTranscriptions() {
  const database = getDatabase();
  const now = new Date().toISOString();
  await database.transaction(async (client) => {
    const expired = await database.prepare(`UPDATE operator_transcriptions SET status='caducada',
      transcript_text=NULL,extracted_fields=NULL
      WHERE status='pendiente' AND expires_at<=?
      RETURNING id,operator_user_id`).bind(now).all(client);
    for (const row of expired.results) {
      await database.prepare(`INSERT INTO audit_log
        (entity,entity_id,action,detail,created_at,actor_user_id)
        VALUES ('api',?,'operator_transcription_expired','Operación autorizada por la API.',?,?)`)
        .bind(Number(row.id), now, Number(row.operator_user_id)).run(client);
    }
  });
}

export function startOperatorTranscriptionCleanup() {
  const shared = globalThis as CleanupGlobal;
  if (shared[cleanupKey]) return;
  const run = () => {
    void expireAllOperatorTranscriptions().catch((error: unknown) => {
      console.error("operator-transcription-cleanup", error instanceof Error ? error.name : "UnknownError");
    });
  };
  const timer = setInterval(run, 5 * 60 * 1000);
  timer.unref();
  shared[cleanupKey] = timer;
  run();
}
