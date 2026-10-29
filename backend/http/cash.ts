import type { PoolClient } from "pg";
import { getDatabase } from "@/db";

type Database = ReturnType<typeof getDatabase>;
type Action = Record<string, unknown>;
type Currency = "MXN" | "USD";
type Method = "efectivo" | "transferencia" | "tarjeta" | "otro";
type Frequency = "semanal" | "quincenal" | "mensual" | "anual";

const methods = new Set<Method>(["efectivo", "transferencia", "tarjeta", "otro"]);
const currencies = new Set<Currency>(["MXN", "USD"]);
const frequencies = new Set<Frequency>(["semanal", "quincenal", "mensual", "anual"]);

export class CashError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "CashError";
  }
}

function text(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== "string") {
    if (required) throw new CashError(`Falta ${label}.`);
    return "";
  }
  const result = value.trim();
  if (required && !result) throw new CashError(`Falta ${label}.`);
  if (result.length > max) throw new CashError(`${label}: máximo ${max} caracteres.`);
  return result;
}

function id(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new CashError("Identificador inválido.");
  return parsed;
}

function amount(value: unknown, label: string, allowZero = false): number {
  const input = String(value ?? "");
  if (!/^\d+(\.\d{1,2})?$/.test(input)) throw new CashError(`${label}: indica un importe con hasta dos decimales.`);
  const cents = Math.round(Number(input) * 100);
  if (!Number.isSafeInteger(cents) || cents > 100_000_000 || (!allowZero && cents <= 0)) {
    throw new CashError(`${label}: importe fuera de rango.`);
  }
  return cents;
}

function operationKey(value: unknown): string {
  const key = text(value, "identificador de operación", 100, true);
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(key)) throw new CashError("Identificador de operación inválido.");
  return key;
}

function currency(value: unknown): Currency {
  if (!currencies.has(value as Currency)) throw new CashError("Moneda inválida.");
  return value as Currency;
}

function method(value: unknown): Method {
  if (!methods.has(value as Method)) throw new CashError("Método de pago inválido.");
  return value as Method;
}

function date(value: unknown, label: string): string {
  const result = text(value, label, 10, true);
  const parsed = new Date(`${result}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) {
    throw new CashError(`${label}: usa una fecha válida.`);
  }
  return result;
}

function nextDate(dueOn: string, frequency: Frequency): string {
  const [year, month, day] = dueOn.split("-").map(Number);
  if (frequency === "semanal" || frequency === "quincenal") {
    const value = new Date(Date.UTC(year, month - 1, day + (frequency === "semanal" ? 7 : 14)));
    return value.toISOString().slice(0, 10);
  }
  const months = frequency === "mensual" ? 1 : 12;
  const targetMonth = month - 1 + months;
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

async function existingByKey(client: PoolClient, table: string, key: string): Promise<number | null> {
  const result = await client.query<{ id: number }>(`SELECT id FROM ${table} WHERE request_key=$1`, [key]);
  return result.rowCount ? Number(result.rows[0].id) : null;
}

async function writeOutflow(client: PoolClient, action: Action, now: string, recurring?: { id: number; occurrenceId: number }): Promise<number> {
  const key = operationKey(action.requestKey);
  const prior = await existingByKey(client, "cash_outflows", key);
  if (prior) return prior;
  if (action.kind !== "gasto" && action.kind !== "retiro_propietario") throw new CashError("Tipo de salida inválido.");
  const kind = action.kind;
  const label = text(action.label, kind === "gasto" ? "descripción del gasto" : "motivo del retiro", 160, true);
  const cents = amount(action.amount, "Importe");
  const code = currency(action.currency);
  const paymentMethod = method(action.method);
  const notes = text(action.notes, "notas", 1000);
  const result = await client.query<{ id: number }>(
    `INSERT INTO cash_outflows (request_key,kind,label,amount_cents,currency,method,notes,recurring_expense_id,recurring_occurrence_id,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [key, kind, label, cents, code, paymentMethod, notes, recurring?.id ?? null, recurring?.occurrenceId ?? null, now],
  );
  const outflowId = Number(result.rows[0].id);
  await client.query(
    "INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('cash_outflow',$1,'created',$2,$3)",
    [outflowId, `${kind}: ${label} · ${cents} centavos ${code} · ${paymentMethod}`, now],
  );
  return outflowId;
}

async function recordOutflow(database: Database, action: Action, now: string): Promise<number> {
  return database.transaction((client) => writeOutflow(client, action, now));
}

async function voidOutflow(database: Database, action: Action, now: string): Promise<number> {
  const outflowId = id(action.id);
  const reason = text(action.reason, "motivo de anulación", 500, true);
  return database.transaction(async (client) => {
    const row = await client.query<{ id: number; voided_at: string | null; recurring_occurrence_id: number | null }>(
      "SELECT id,voided_at,recurring_occurrence_id FROM cash_outflows WHERE id=$1 FOR UPDATE", [outflowId],
    );
    if (!row.rowCount) throw new CashError("El movimiento no existe.", 404);
    if (row.rows[0].voided_at) return outflowId;
    if (row.rows[0].recurring_occurrence_id) {
      throw new CashError("El pago recurrente no se puede anular aquí; conserva la ocurrencia y registra una corrección auditada.", 409);
    }
    await client.query("UPDATE cash_outflows SET voided_at=$1,void_reason=$2 WHERE id=$3", [now, reason, outflowId]);
    await client.query(
      "INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('cash_outflow',$1,'void',$2,$3)",
      [outflowId, reason, now],
    );
    return outflowId;
  });
}

async function createRecurringExpense(database: Database, action: Action, now: string): Promise<number> {
  const name = text(action.name, "nombre del gasto recurrente", 160, true);
  const cents = amount(action.amount, "Importe");
  const code = currency(action.currency);
  const frequency = action.frequency as Frequency;
  if (!frequencies.has(frequency)) throw new CashError("Frecuencia inválida.");
  const dueOn = date(action.nextDueOn, "Próximo vencimiento");
  return database.transaction(async (client) => {
    const result = await client.query<{ id: number }>(
      `INSERT INTO recurring_expenses (name,amount_cents,currency,frequency,next_due_on,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING id`,
      [name, cents, code, frequency, dueOn, now],
    );
    const recurringId = Number(result.rows[0].id);
    await client.query(
      `INSERT INTO recurring_expense_occurrences (recurring_expense_id,due_on,amount_cents,currency)
       VALUES ($1,$2,$3,$4)`, [recurringId, dueOn, cents, code],
    );
    await client.query(
      "INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('recurring_expense',$1,'created',$2,$3)",
      [recurringId, `${name} · ${frequency} · vence ${dueOn}`, now],
    );
    return recurringId;
  });
}

async function updateRecurringExpense(database: Database, action: Action, now: string): Promise<number> {
  const recurringId = id(action.id);
  const expectedRevision = Number(action.revision);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new CashError("Revisión del gasto inválida.");
  const name = text(action.name, "nombre del gasto recurrente", 160, true);
  const cents = amount(action.amount, "Importe");
  const code = currency(action.currency);
  const frequency = action.frequency as Frequency;
  if (!frequencies.has(frequency)) throw new CashError("Frecuencia inválida.");
  const dueOn = date(action.nextDueOn, "Próximo vencimiento");
  if (action.active !== 0 && action.active !== 1) throw new CashError("Estado del gasto recurrente inválido.");

  return database.transaction(async (client) => {
    const current = await client.query<{ id: number; revision: number }>(
      "SELECT id,revision FROM recurring_expenses WHERE id=$1 FOR UPDATE", [recurringId],
    );
    if (!current.rowCount) throw new CashError("El gasto recurrente no existe.", 404);
    if (Number(current.rows[0].revision) !== expectedRevision) {
      throw new CashError("El gasto recurrente cambió en otra sesión. Actualiza la vista antes de guardar.", 409);
    }

    const pending = await client.query<{ id: number; due_on: string }>(
      `SELECT id,due_on::text AS due_on FROM recurring_expense_occurrences
       WHERE recurring_expense_id=$1 AND status='pendiente' ORDER BY due_on,id LIMIT 1 FOR UPDATE`, [recurringId],
    );
    if (pending.rowCount) {
      const collision = await client.query<{ id: number; status: string }>(
        `SELECT id,status FROM recurring_expense_occurrences
         WHERE recurring_expense_id=$1 AND due_on=$2::date AND id<>$3`, [recurringId, dueOn, pending.rows[0].id],
      );
      if (collision.rowCount) throw new CashError("Ya existe un vencimiento en esa fecha; conserva el historial y elige otra.", 409);
      await client.query(
        `UPDATE recurring_expense_occurrences SET due_on=$1::date,amount_cents=$2,currency=$3 WHERE id=$4`,
        [dueOn, cents, code, pending.rows[0].id],
      );
    } else if (action.active === 1) {
      const existing = await client.query<{ id: number }>(
        "SELECT id FROM recurring_expense_occurrences WHERE recurring_expense_id=$1 AND due_on=$2::date", [recurringId, dueOn],
      );
      if (existing.rowCount) throw new CashError("Esa fecha ya tiene una ocurrencia histórica; elige un vencimiento nuevo.", 409);
      await client.query(
        `INSERT INTO recurring_expense_occurrences (recurring_expense_id,due_on,amount_cents,currency)
         VALUES ($1,$2::date,$3,$4)`,
        [recurringId, dueOn, cents, code],
      );
    }

    const saved = await client.query(
      `UPDATE recurring_expenses SET name=$1,amount_cents=$2,currency=$3,frequency=$4,next_due_on=$5::date,
         active=$6,revision=revision+1,updated_at=$7 WHERE id=$8 AND revision=$9`,
      [name, cents, code, frequency, dueOn, action.active, now, recurringId, expectedRevision],
    );
    if (!saved.rowCount) throw new CashError("El gasto recurrente cambió en otra sesión. Actualiza la vista antes de guardar.", 409);
    await client.query(
      "INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('recurring_expense',$1,'updated',$2,$3)",
      [recurringId, `${name} · ${frequency} · vence ${dueOn} · ${action.active ? "activo" : "pausado"}; revisión ${expectedRevision + 1}`, now],
    );
    return recurringId;
  });
}

async function payRecurringOccurrence(database: Database, action: Action, now: string): Promise<number> {
  const occurrenceId = id(action.occurrenceId);
  return database.transaction(async (client) => {
    const prior = await existingByKey(client, "cash_outflows", operationKey(action.requestKey));
    if (prior) return prior;
    const selected = await client.query<{
      occurrence_id: number; recurring_expense_id: number; due_on: string; occurrence_amount_cents: number;
      occurrence_currency: Currency; status: string; name: string; frequency: Frequency; active: number;
    }>(
      `SELECT occurrence.id AS occurrence_id,occurrence.recurring_expense_id,occurrence.due_on::text AS due_on,
              occurrence.amount_cents AS occurrence_amount_cents,occurrence.currency AS occurrence_currency,
              occurrence.status,recurring.name,recurring.frequency,recurring.active
       FROM recurring_expense_occurrences occurrence
       JOIN recurring_expenses recurring ON recurring.id=occurrence.recurring_expense_id
       WHERE occurrence.id=$1 FOR UPDATE OF occurrence,recurring`, [occurrenceId],
    );
    if (!selected.rowCount) throw new CashError("El vencimiento recurrente no existe.", 404);
    const occurrence = selected.rows[0];
    if (occurrence.status !== "pendiente") throw new CashError("Este vencimiento ya fue pagado.", 409);
    if (!occurrence.active) throw new CashError("El gasto recurrente está inactivo.", 409);
    const paidCents = action.amount === undefined || action.amount === ""
      ? Number(occurrence.occurrence_amount_cents) : amount(action.amount, "Importe pagado");
    const paidCurrency = currency(action.currency ?? occurrence.occurrence_currency);
    if (paidCurrency !== occurrence.occurrence_currency) throw new CashError("La moneda del pago debe coincidir con el gasto recurrente.");
    const outflowId = await writeOutflow(client, {
      ...action,
      kind: "gasto",
      label: occurrence.name,
      amount: (paidCents / 100).toFixed(2),
      currency: paidCurrency,
    }, now, { id: Number(occurrence.recurring_expense_id), occurrenceId });
    await client.query(
      "UPDATE recurring_expense_occurrences SET status='pagada',paid_at=$1 WHERE id=$2", [now, occurrenceId],
    );
    const nextDueOn = nextDate(String(occurrence.due_on).slice(0, 10), occurrence.frequency);
    await client.query(
      `INSERT INTO recurring_expense_occurrences (recurring_expense_id,due_on,amount_cents,currency)
       VALUES ($1,$2,$3,$4) ON CONFLICT (recurring_expense_id,due_on) DO NOTHING`,
      [occurrence.recurring_expense_id, nextDueOn, occurrence.occurrence_amount_cents, occurrence.occurrence_currency],
    );
    await client.query(
      "UPDATE recurring_expenses SET next_due_on=$1,revision=revision+1,updated_at=$2 WHERE id=$3",
      [nextDueOn, now, occurrence.recurring_expense_id],
    );
    return outflowId;
  });
}

async function closeCashDay(database: Database, action: Action, now: string): Promise<number> {
  const key = operationKey(action.requestKey);
  const businessDate = date(action.businessDate, "Fecha de caja");
  const code = currency(action.currency);
  const paymentMethod = method(action.method);
  const openingCents = amount(action.opening ?? "0", "Fondo inicial", true);
  const countedCents = amount(action.counted, "Efectivo contado", true);
  const notes = text(action.notes, "notas del cierre", 1000);
  return database.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`cash-close:${businessDate}:${code}:${paymentMethod}`]);
    const prior = await existingByKey(client, "cash_closings", key);
    if (prior) return prior;
    const latest = await client.query<{ revision: number }>(
      "SELECT COALESCE(MAX(revision),0) AS revision FROM cash_closings WHERE business_date=$1::date AND currency=$2 AND method=$3",
      [businessDate, code, paymentMethod],
    );
    const revision = Number(latest.rows[0].revision) + 1;
    const settings = await client.query<{ timezone: string }>("SELECT timezone FROM settings WHERE id=1");
    const timezone = text(settings.rows[0]?.timezone || "America/Tijuana", "zona horaria", 80, true);
    const expected = await client.query<{ amount_cents: number }>(
      `WITH movements AS (
         SELECT p.amount_cents AS signed_cents,o.currency,p.method,p.created_at FROM payments p
           JOIN orders o ON o.id=p.order_id WHERE p.voided_at IS NULL AND p.kind<>'ajuste_historico'
         UNION ALL
         SELECT GREATEST(s.total_cents-s.order_payment_cents,0),s.currency,s.method,s.created_at
           FROM sales s WHERE s.voided_at IS NULL
         UNION ALL
         SELECT -r.amount_cents,r.currency,r.method,r.created_at
           FROM order_resolutions r WHERE r.kind='refund' AND r.method IS NOT NULL
         UNION ALL
         SELECT -sp.amount_cents,po.currency,sp.method,sp.created_at
           FROM supplier_payments sp JOIN purchase_orders po ON po.id=sp.purchase_order_id WHERE sp.voided_at IS NULL
         UNION ALL
         SELECT -co.amount_cents,co.currency,co.method,co.created_at
           FROM cash_outflows co WHERE co.voided_at IS NULL
       )
       SELECT COALESCE(SUM(signed_cents),0)::integer AS amount_cents FROM movements
       WHERE currency=$1 AND method=$2 AND ((created_at::timestamptz AT TIME ZONE $3)::date=$4::date)`,
      [code, paymentMethod, timezone, businessDate],
    );
    const expectedCents = Number(expected.rows[0].amount_cents) + openingCents;
    const differenceCents = countedCents - expectedCents;
    try {
      const saved = await client.query<{ id: number }>(
        `INSERT INTO cash_closings (request_key,business_date,currency,method,opening_cents,expected_cents,counted_cents,difference_cents,notes,revision,created_at)
         VALUES ($1,$2::date,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [key, businessDate, code, paymentMethod, openingCents, expectedCents, countedCents, differenceCents, notes, revision, now],
      );
      const closingId = Number(saved.rows[0].id);
      await client.query(
        "INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('cash_closing',$1,'closed',$2,$3)",
        [closingId, `${businessDate} · ${code} · ${paymentMethod} · diferencia ${differenceCents} centavos`, now],
      );
      return closingId;
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") {
        throw new CashError("Otro cierre registró esa misma fecha, moneda y método. Actualiza los datos.", 409);
      }
      throw error;
    }
  });
}

export function isCashAction(value: unknown): value is string {
  return typeof value === "string" && [
    "recordCashOutflow", "voidCashOutflow", "createRecurringExpense", "updateRecurringExpense", "payRecurringOccurrence", "closeCashDay",
  ].includes(value);
}

export async function runCashAction(database: Database, action: Action, now: string): Promise<number> {
  switch (action.action) {
    case "recordCashOutflow": return recordOutflow(database, action, now);
    case "voidCashOutflow": return voidOutflow(database, action, now);
    case "createRecurringExpense": return createRecurringExpense(database, action, now);
    case "updateRecurringExpense": return updateRecurringExpense(database, action, now);
    case "payRecurringOccurrence": return payRecurringOccurrence(database, action, now);
    case "closeCashDay": return closeCashDay(database, action, now);
    default: throw new CashError("Operación de caja inválida.");
  }
}
