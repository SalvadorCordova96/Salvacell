import assert from "node:assert/strict";

const root = process.env.TEST_TALLER_URL || "http://127.0.0.1:4181";
const sessionCookie = process.env.SALVACEL_TEST_SESSION_COOKIE || "";
if (sessionCookie) { const nativeFetch = globalThis.fetch.bind(globalThis); globalThis.fetch = (input, init = {}) => nativeFetch(input, { ...init, headers: { Cookie: sessionCookie, ...(init.headers || {}) } }); }
let checks = 0;
const key = () => crypto.randomUUID();
const check = (value, message) => { assert.ok(value, message); checks += 1; };

async function post(payload, status = 200) {
  const response = await fetch(`${root}/api/taller`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(sessionCookie ? { Cookie: sessionCookie } : {}) },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  assert.equal(response.status, status, JSON.stringify(body));
  checks += 1;
  return body;
}

async function boot() {
  const response = await fetch(`${root}/api/taller`, { headers: sessionCookie ? { Cookie: sessionCookie } : {} });
  assert.equal(response.status, 200);
  return response.json();
}

const outflowKey = key();
const outflowInput = {
  action: "recordCashOutflow", requestKey: outflowKey, kind: "gasto",
  label: "Material de limpieza", amount: "123.45", currency: "MXN",
  method: "efectivo", notes: "Prueba aislada",
};
const outflow = await post(outflowInput);
const duplicateOutflow = await post(outflowInput);
let data = await boot();
check(outflow.id === duplicateOutflow.id && data.cashOutflows.filter((row) => row.requestKey === outflowKey).length === 1,
  "Salida de caja idempotente, sin duplicar el gasto.");
check(data.cashOutflows.find((row) => row.requestKey === outflowKey)?.amountCents === 12345,
  "Importe persistido como centavos exactos.");
await post({ ...outflowInput, requestKey: key(), kind: "tipo_invalido" }, 400);

const recurring = await post({
  action: "createRecurringExpense", name: "Internet del taller", amount: "899.00",
  currency: "MXN", frequency: "mensual", nextDueOn: "2026-10-31",
});
data = await boot();
const occurrence = data.recurringExpenseOccurrences.find((row) => row.recurringExpenseId === recurring.id);
check(!!occurrence && occurrence.status === "pendiente" && !data.cashOutflows.some((row) => row.recurringExpenseId === recurring.id),
  "Programar un gasto no descuenta caja antes de pagarlo.");
const recurringKey = key();
const paymentInput = { action: "payRecurringOccurrence", occurrenceId: occurrence.id, requestKey: recurringKey, method: "transferencia" };
const paid = await post(paymentInput);
const duplicatePayment = await post(paymentInput);
data = await boot();
check(paid.id === duplicatePayment.id && data.cashOutflows.filter((row) => row.recurringOccurrenceId === occurrence.id && !row.voidedAt).length === 1,
  "Pago recurrente idempotente, con una única salida.");
check(data.recurringExpenseOccurrences.find((row) => row.id === occurrence.id)?.status === "pagada" &&
  data.recurringExpenseOccurrences.some((row) => row.recurringExpenseId === recurring.id && row.dueOn.slice(0, 10) === "2026-11-30" && row.status === "pendiente"),
  "Pago cierra el vencimiento y programa el siguiente sin deriva de fin de mes.");
await post({ ...paymentInput, requestKey: key() }, 409);

const editableRecurring = await post({
  action: "createRecurringExpense", name: "Servicio de prueba", amount: "300.00",
  currency: "MXN", frequency: "mensual", nextDueOn: "2026-12-15",
});
data = await boot();
const editableRule = data.recurringExpenses.find((row) => row.id === editableRecurring.id);
const editableOccurrence = data.recurringExpenseOccurrences.find((row) => row.recurringExpenseId === editableRecurring.id);
const updateInput = {
  action: "updateRecurringExpense", id: editableRecurring.id, revision: editableRule.revision,
  name: "Servicio actualizado", amount: "450.25", currency: "MXN", frequency: "quincenal",
  nextDueOn: "2027-01-01", active: 0,
};
await post(updateInput);
data = await boot();
const updatedExpense = data.recurringExpenses.find((row) => row.id === editableRecurring.id);
const updatedOccurrence = data.recurringExpenseOccurrences.find((row) => row.id === editableOccurrence.id);
check(updatedExpense?.name === "Servicio actualizado" && updatedExpense.amountCents === 45025 && updatedExpense.frequency === "quincenal" &&
  updatedExpense.active === 0 && updatedOccurrence?.status === "pendiente" && updatedOccurrence.dueOn.slice(0, 10) === "2027-01-01" &&
  updatedOccurrence.amountCents === 45025,
  "Editar y pausar una regla actualiza el próximo vencimiento sin crear una salida ni borrar historial.");
await post({ ...updateInput, name: "Edición obsoleta", revision: editableRule.revision }, 409);
await post({ ...updateInput, revision: updatedExpense.revision, active: 1 });
data = await boot();
check(data.recurringExpenses.find((row) => row.id === editableRecurring.id)?.active === 1 &&
  data.recurringExpenseOccurrences.find((row) => row.id === editableOccurrence.id)?.status === "pendiente",
  "Reactivar una regla conserva el vencimiento pendiente y no duplica pagos ni ocurrencias.");

const businessDate = "2000-01-02";
const closeInput = {
  action: "closeCashDay", requestKey: key(), businessDate, currency: "MXN", method: "efectivo",
  opening: "100.00", counted: "100.00", notes: "Prueba aislada",
};
const firstClose = await post(closeInput);
await post({ ...closeInput, requestKey: key(), counted: "99.00" });
data = await boot();
const revisions = data.cashClosings.filter((row) => row.businessDate.slice(0, 10) === businessDate && row.currency === "MXN" && row.method === "efectivo").sort((a, b) => a.revision - b.revision);
check(revisions.length === 2 && revisions[0].expectedCents === 10000 && revisions[0].differenceCents === 0 &&
  revisions[1].revision === 2 && revisions[1].differenceCents === -100,
  "Cierre concilia fondo inicial, importe contado y conserva la nueva revisión.");
check((await post(closeInput)).id === firstClose.id, "Reintentar el cierre no duplica su revisión.");

const backup = await (await fetch(`${root}/api/taller?export=json`)).json();
check(backup.schemaVersion === "0031" && Array.isArray(backup.tables.product_suppliers) && backup.tables.cash_outflows.some((row) => row.request_key === outflowKey) &&
  backup.tables.recurring_expenses.some((row) => row.id === recurring.id) &&
  backup.tables.cash_closings.some((row) => String(row.business_date).slice(0, 10) === businessDate && row.revision === 2),
  "Respaldo incluye salidas, gastos recurrentes y revisiones de caja.");
const restored = await post({ action: "restoreBackup", confirmation: "RESTAURAR", backup });
data = await boot();
check(restored.ok && data.cashOutflows.some((row) => row.requestKey === outflowKey) &&
  data.recurringExpenses.some((row) => row.id === recurring.id) &&
  data.cashClosings.some((row) => row.businessDate.slice(0, 10) === businessDate && row.revision === 2),
  "Restauración preserva trazabilidad y cierres de caja.");

console.log(JSON.stringify({ ok: true, checks, isolatedDatabase: true }));
