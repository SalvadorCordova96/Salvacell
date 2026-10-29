import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { getDatabase } from "@/db";

type Database = ReturnType<typeof getDatabase>;
type Action = Record<string, unknown>;
type PurchaseLine = {
  responseId: number;
  quantity: number;
  partRequestId: number;
  repairId: number;
  priceRequestSupplierId: number;
  itemName: string;
  brand: string;
  model: string;
  quality: string;
  unitCostCents: number;
  weight: number;
};

export class ProcurementError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "ProcurementError";
  }
}

function positiveId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ProcurementError("Identificador inválido.");
  return id;
}

function positiveInteger(value: unknown, label: string, max = 1000): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > max) {
    throw new ProcurementError(`${label}: indica una cantidad entera mayor que cero.`);
  }
  return parsed;
}

function money(value: unknown, label: string): number {
  if (value === undefined || value === null || value === "") return 0;
  const input = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(input)) {
    throw new ProcurementError(`${label}: usa un importe positivo con hasta dos decimales.`);
  }
  const cents = Math.round(Number(input) * 100);
  if (!Number.isSafeInteger(cents) || cents > 100_000_000) {
    throw new ProcurementError(`${label}: importe fuera de rango.`);
  }
  return cents;
}

function requestKey(value: unknown): string {
  const key = String(value ?? "").trim();
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(key)) throw new ProcurementError("Identificador de operación inválido.");
  return key;
}

function note(value: unknown, label: string, max = 1000, required = false): string {
  if (typeof value !== "string") {
    if (required) throw new ProcurementError(`Falta ${label}.`);
    return "";
  }
  const result = value.trim();
  if (required && !result) throw new ProcurementError(`Falta ${label}.`);
  if (result.length > max) throw new ProcurementError(`${label}: máximo ${max} caracteres.`);
  return result;
}

function asLines(value: unknown, max = 30): Action[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > max) {
    throw new ProcurementError(`Selecciona de 1 a ${max} conceptos.`);
  }
  if (value.some((line) => !line || typeof line !== "object" || Array.isArray(line))) {
    throw new ProcurementError("Hay un concepto de compra inválido.");
  }
  return value as Action[];
}

async function createPurchaseOrder(database: Database, action: Action, now: string): Promise<number> {
  const key = requestKey(action.requestKey);
  if (!Array.isArray(action.responseIds) || action.responseIds.length < 1 || action.responseIds.length > 30) {
    throw new ProcurementError("Selecciona de 1 a 30 ofertas.");
  }
  const responseIds = [...new Set(action.responseIds.map(positiveId))];
  if (responseIds.length !== action.responseIds.length) {
    throw new ProcurementError("No repitas la misma oferta en un pedido.");
  }
  const shippingCents = money(action.shipping, "Envío");
  const comments = note(action.notes, "notas del pedido");
  const quantities = new Map<number, number>();
  for (const line of asLines(action.items ?? responseIds.map((responseId) => ({ responseId })))) {
    const responseId = positiveId(line.responseId);
    quantities.set(responseId, positiveInteger(line.quantity ?? 1, "Cantidad"));
  }
  if (quantities.size !== responseIds.length || responseIds.some((id) => !quantities.has(id))) {
    throw new ProcurementError("Las cantidades deben corresponder exactamente a las ofertas seleccionadas.");
  }

  return database.transaction(async (client: PoolClient) => {
    const prior = await client.query<{ id: number }>(
      "SELECT id FROM purchase_orders WHERE request_key = $1",
      [key],
    );
    if (prior.rowCount) return Number(prior.rows[0].id);

    const selected = await client.query<{
      response_id: number;
      supplier_id: number;
      supplier_status: string;
      request_id: number;
      request_status: string;
      selected_response_id: number | null;
      currency: string;
      price_cents: number | null;
      response_quality: string;
      request_supplier_id: number;
      part_request_id: number | null;
      part_name: string;
      repair_id: number | null;
      repair_status: string | null;
      brand: string;
      model: string;
      needs_review: number;
      is_late: number;
      availability: string;
    }>(
      `SELECT sr.id AS response_id, prs.supplier_id, prs.status AS supplier_status,
              pr.id AS request_id, pr.status AS request_status, pr.selected_response_id,
              COALESCE(o.currency, q.currency) AS currency, sr.price_cents,
              sr.quality AS response_quality, prs.id AS request_supplier_id,
              pr.part_request_id, pr.part_name AS part_name, pr.repair_id,
              o.status AS repair_status, pr.brand, pr.model, sr.needs_review, sr.is_late,
              sr.availability
         FROM supplier_responses sr
         JOIN price_request_suppliers prs ON prs.id = sr.price_request_supplier_id
         JOIN price_requests pr ON pr.id = prs.price_request_id
         LEFT JOIN order_repairs r ON r.id = pr.repair_id
         LEFT JOIN orders o ON o.id = r.order_id
         LEFT JOIN quotes q ON q.id = pr.quote_id
        WHERE sr.id = ANY($1::integer[])
        ORDER BY sr.id
        FOR UPDATE OF sr, prs, pr`,
      [responseIds],
    );
    if (selected.rowCount !== responseIds.length) {
      throw new ProcurementError("Una de las ofertas seleccionadas ya no existe.", 409);
    }

    const partRequestIds = [...new Set(selected.rows.map((row) => Number(row.part_request_id)).filter(Number.isSafeInteger))].sort((a, b) => a - b);
    for (const partRequestId of partRequestIds) {
      const partRequest = await client.query<{ id: number; status: string }>(
        "SELECT id,status FROM part_requests WHERE id=$1 FOR UPDATE",
        [partRequestId],
      );
      if (!partRequest.rowCount || ["cancelada", "instalada"].includes(partRequest.rows[0].status)) {
        throw new ProcurementError("La refacción ya se canceló o instaló; no admite otra compra.", 409);
      }
    }
    const alreadyOrdered = await client.query(
      `SELECT 1 FROM purchase_order_items i JOIN purchase_orders po ON po.id=i.purchase_order_id
        WHERE i.supplier_response_id=ANY($1::integer[]) OR
              (i.part_request_id=ANY($2::integer[]) AND po.status<>'cancelada') LIMIT 1`,
      [responseIds, partRequestIds],
    );
    if (alreadyOrdered.rowCount) throw new ProcurementError("Una oferta o refacción ya está incluida en otro pedido activo.", 409);

    const supplierId = Number(selected.rows[0].supplier_id);
    const currency = selected.rows[0].currency;
    if (!currency || !["MXN", "USD"].includes(currency)) throw new ProcurementError("No se pudo determinar la moneda del pedido.");
    const lines: PurchaseLine[] = selected.rows.map((row) => {
      if (Number(row.supplier_id) !== supplierId || row.currency !== currency) {
        throw new ProcurementError("Un pedido solo puede agrupar ofertas del mismo proveedor y moneda.");
      }
      if (row.request_status !== "atendida" || Number(row.selected_response_id) !== Number(row.response_id)) {
        throw new ProcurementError("Primero elige manualmente cada oferta antes de crear el pedido.", 409);
      }
      if (row.supplier_status === "cancelado" || Number(row.needs_review) || Number(row.is_late)) {
        throw new ProcurementError("No se pueden comprar ofertas canceladas, tardías o pendientes de revisión.", 409);
      }
      if (row.price_cents === null || row.availability === "sin_disponibilidad" || row.availability === "agotada") {
        throw new ProcurementError("La oferta no tiene precio comprable o no está disponible.", 409);
      }
      if (!row.part_request_id || !row.repair_id) {
        throw new ProcurementError("Para comprar, la refacción debe estar ligada a una reparación de una orden.", 409);
      }
      if (["cancelada", "entregada"].includes(String(row.repair_status))) {
        throw new ProcurementError("La orden relacionada ya no admite compras.", 409);
      }
      const quantity = quantities.get(Number(row.response_id))!;
      return {
        responseId: Number(row.response_id),
        quantity,
        partRequestId: Number(row.part_request_id),
        repairId: Number(row.repair_id),
        priceRequestSupplierId: Number(row.request_supplier_id),
        itemName: String(row.part_name),
        brand: String(row.brand),
        model: String(row.model),
        quality: String(row.response_quality ?? ""),
        unitCostCents: Number(row.price_cents),
        weight: Number(row.price_cents) * quantity,
      };
    });

    const subtotalCents = lines.reduce((sum, line) => sum + line.weight, 0);
    const totalCents = subtotalCents + shippingCents;
    if (!Number.isSafeInteger(totalCents) || totalCents > 100_000_000) {
      throw new ProcurementError("El total del pedido excede el límite permitido.");
    }

    const shippingWeights = lines.map((line) => line.weight || line.quantity);
    const weightTotal = shippingWeights.reduce((sum, weight) => sum + weight, 0);
    const allocations = shippingWeights.map((weight) => Math.floor((shippingCents * weight) / weightTotal));
    let unallocated = shippingCents - allocations.reduce((sum, value) => sum + value, 0);
    for (let index = 0; unallocated > 0; index = (index + 1) % allocations.length, unallocated -= 1) {
      allocations[index] += 1;
    }

    const createdOrder = await client.query<{ id: number }>(
      `INSERT INTO purchase_orders
         (request_key,supplier_id,status,currency,subtotal_cents,shipping_cents,total_cents,notes,created_at,updated_at)
       VALUES ($1,$2,'borrador',$3,$4,$5,$6,$7,$8,$8) RETURNING id`,
      [key, supplierId, currency, subtotalCents, shippingCents, totalCents, comments, now],
    );
    const orderId = Number(createdOrder.rows[0].id);
    for (const [index, line] of lines.entries()) {
      await client.query(
        `INSERT INTO purchase_order_items
           (request_key,purchase_order_id,supplier_response_id,price_request_supplier_id,part_request_id,repair_id,
            destination,item_name,brand,model,quality,quantity,unit_cost_cents,allocated_shipping_cents,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,'repair',$7,$8,$9,$10,$11,$12,$13,$14)`,
        [randomUUID(), orderId, line.responseId, line.priceRequestSupplierId, line.partRequestId,
          line.repairId, line.itemName, line.brand, line.model, line.quality, line.quantity,
          line.unitCostCents, allocations[index], now],
      );
    }
    await client.query(
      "INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('purchase_order',$1,'created',$2,$3)",
      [orderId, `Pedido en borrador para proveedor ${supplierId}; ${lines.length} conceptos.`, now],
    );
    return orderId;
  });
}

async function markOrdered(database: Database, action: Action, now: string): Promise<number> {
  const id = positiveId(action.id);
  return database.transaction(async (client) => {
    const result = await client.query<{ id: number; status: string }>(
      "SELECT id,status FROM purchase_orders WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!result.rowCount) throw new ProcurementError("El pedido no existe.", 404);
    if (result.rows[0].status === "solicitada") return id;
    if (result.rows[0].status !== "borrador") throw new ProcurementError("Solo se puede marcar como solicitado un pedido en borrador.", 409);
    await client.query("UPDATE purchase_orders SET status='solicitada',ordered_at=$1,updated_at=$1,revision=revision+1 WHERE id=$2", [now, id]);
    await client.query(
      `UPDATE part_requests p SET status='solicitada',updated_at=$1,revision=revision+1
        FROM purchase_order_items i WHERE i.purchase_order_id=$2 AND i.part_request_id=p.id
          AND p.status NOT IN ('cancelada','instalada')`,
      [now, id],
    );
    await client.query("INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('purchase_order',$1,'ordered','Operador marcó pedido como solicitado al proveedor.',$2)", [id, now]);
    return id;
  });
}

async function recordPayment(database: Database, action: Action, now: string): Promise<number> {
  const key = requestKey(action.requestKey);
  const orderId = positiveId(action.purchaseOrderId);
  const amountCents = money(action.amount, "Pago a proveedor");
  if (amountCents <= 0) throw new ProcurementError("El pago a proveedor debe ser mayor que cero.");
  const method = note(action.method, "método de pago", 30, true);
  if (!["efectivo", "transferencia", "tarjeta", "otro"].includes(method)) throw new ProcurementError("Método de pago inválido.");
  const comments = note(action.notes, "nota del pago");
  return database.transaction(async (client) => {
    const prior = await client.query<{ id: number; purchase_order_id: number }>("SELECT id,purchase_order_id FROM supplier_payments WHERE request_key=$1", [key]);
    if (prior.rowCount) {
      if (Number(prior.rows[0].purchase_order_id) !== orderId) throw new ProcurementError("Ese identificador de operación ya se usó.", 409);
      return Number(prior.rows[0].id);
    }
    const order = await client.query<{ total_cents: number; status: string }>("SELECT total_cents,status FROM purchase_orders WHERE id=$1 FOR UPDATE", [orderId]);
    if (!order.rowCount) throw new ProcurementError("El pedido no existe.", 404);
    if (["borrador", "cancelada"].includes(order.rows[0].status)) throw new ProcurementError("Solo se registra pago para un pedido ya solicitado.", 409);
    const activePayments = await client.query<{ paid_cents: string | number }>("SELECT COALESCE(SUM(amount_cents),0) AS paid_cents FROM supplier_payments WHERE purchase_order_id=$1 AND voided_at IS NULL", [orderId]);
    const alreadyPaid = Number(activePayments.rows[0].paid_cents);
    if (amountCents > Number(order.rows[0].total_cents) - alreadyPaid) throw new ProcurementError("El pago excede el saldo pendiente con el proveedor.", 409);
    const saved = await client.query<{ id: number }>(
      `INSERT INTO supplier_payments (request_key,purchase_order_id,amount_cents,method,notes,created_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [key, orderId, amountCents, method, comments, now],
    );
    const paymentId = Number(saved.rows[0].id);
    await client.query("INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('supplier_payment',$1,'created',$2,$3)", [paymentId, `Pago ${amountCents} centavos por ${method} al pedido ${orderId}.`, now]);
    return paymentId;
  });
}

async function receiveOrder(database: Database, action: Action, now: string): Promise<number> {
  const key = requestKey(action.requestKey);
  const orderId = positiveId(action.purchaseOrderId);
  const items = asLines(action.items, 30).map((item) => ({
    id: positiveId(item.purchaseOrderItemId),
    quantity: positiveInteger(item.quantity, "Cantidad recibida"),
    actualUnitCostCents: money(item.actualUnitCost, "Costo real unitario"),
    hasActualUnitCost: item.actualUnitCost !== undefined && item.actualUnitCost !== null && item.actualUnitCost !== "",
  }));
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new ProcurementError("No repitas el mismo concepto en una recepción.");
  const receivedAt = note(action.receivedAt ?? now, "fecha de recepción", 40, true);
  const comments = note(action.notes, "nota de recepción");

  return database.transaction(async (client) => {
    const prior = await client.query<{ id: number; purchase_order_id: number }>("SELECT id,purchase_order_id FROM purchase_receipts WHERE request_key=$1", [key]);
    if (prior.rowCount) {
      if (Number(prior.rows[0].purchase_order_id) !== orderId) throw new ProcurementError("Ese identificador de operación ya se usó.", 409);
      return Number(prior.rows[0].id);
    }
    const order = await client.query<{ status: string }>("SELECT status FROM purchase_orders WHERE id=$1 FOR UPDATE", [orderId]);
    if (!order.rowCount) throw new ProcurementError("El pedido no existe.", 404);
    if (!["solicitada", "parcial"].includes(order.rows[0].status)) throw new ProcurementError("Solo se reciben pedidos solicitados que aún tienen piezas pendientes.", 409);

    const receiptResult = await client.query<{ id: number }>(
      "INSERT INTO purchase_receipts (request_key,purchase_order_id,received_at,notes,created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [key, orderId, receivedAt, comments, now],
    );
    const receiptId = Number(receiptResult.rows[0].id);

    for (const input of items) {
      const lineResult = await client.query<{
        id: number; purchase_order_id: number; quantity: number; received_quantity: number; unit_cost_cents: number;
        allocated_shipping_cents: number; received_shipping_cents: number; destination: string; product_id: number | null;
        part_request_id: number | null; repair_id: number | null; item_name: string; quality: string;
      }>(
        `SELECT id,purchase_order_id,quantity,received_quantity,unit_cost_cents,allocated_shipping_cents,
                received_shipping_cents,destination,product_id,part_request_id,repair_id,item_name,quality
           FROM purchase_order_items WHERE id=$1 AND purchase_order_id=$2 FOR UPDATE`,
        [input.id, orderId],
      );
      if (!lineResult.rowCount) throw new ProcurementError("Un concepto no corresponde a este pedido.", 409);
      const line = lineResult.rows[0];
      const remainingQuantity = Number(line.quantity) - Number(line.received_quantity);
      const remainingShipping = Number(line.allocated_shipping_cents) - Number(line.received_shipping_cents);
      if (input.quantity > remainingQuantity) throw new ProcurementError("La recepción excede la cantidad pendiente del pedido.", 409);
      if (line.destination === "repair") {
        const part = await client.query<{ status: string; order_status: string }>(
          "SELECT p.status,o.status AS order_status FROM part_requests p JOIN orders o ON o.id=p.order_id WHERE p.id=$1 FOR UPDATE OF p,o",
          [line.part_request_id],
        );
        if (!part.rowCount || part.rows[0].status === "cancelada" || part.rows[0].status === "instalada" || ["cancelada", "entregada"].includes(part.rows[0].order_status)) {
          throw new ProcurementError("La reparación se canceló o ya se cerró; primero cambia el destino de la pieza a inventario.", 409);
        }
      } else if (!line.product_id) {
        throw new ProcurementError("El destino de inventario no tiene un producto asociado.", 409);
      }

      const shippingCents = input.quantity === remainingQuantity
        ? remainingShipping
        : Math.floor((remainingShipping * input.quantity) / remainingQuantity);
      const actualUnitCostCents = input.hasActualUnitCost ? input.actualUnitCostCents : Number(line.unit_cost_cents);
      const receiptLine = await client.query<{ id: number }>(
        `INSERT INTO purchase_receipt_items (receipt_id,purchase_order_item_id,quantity,unit_cost_cents,shipping_cents)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [receiptId, input.id, input.quantity, actualUnitCostCents, shippingCents],
      );
      const receiptLineId = Number(receiptLine.rows[0].id);
      await client.query(
        `UPDATE purchase_order_items SET received_quantity=received_quantity+$1,
                received_shipping_cents=received_shipping_cents+$2 WHERE id=$3`,
        [input.quantity, shippingCents, input.id],
      );

      if (line.destination === "inventory") {
        const product = await client.query<{ stock: number; cost_cents: number | null; currency: string }>(
          "SELECT stock,cost_cents,currency FROM products WHERE id=$1 FOR UPDATE",
          [line.product_id],
        );
        if (!product.rowCount) throw new ProcurementError("El producto de inventario ya no existe.", 409);
        const purchase = await client.query<{ currency: string }>("SELECT currency FROM purchase_orders WHERE id=$1", [orderId]);
        if (product.rows[0].currency !== purchase.rows[0].currency) throw new ProcurementError("La moneda del producto no coincide con la compra.", 409);
        const stock = Number(product.rows[0].stock ?? 0);
        const landedTotal = actualUnitCostCents * input.quantity + shippingCents;
        const nextStock = stock + input.quantity;
        const weightedCost = Math.round(((Number(product.rows[0].cost_cents ?? 0) * stock) + landedTotal) / nextStock);
        await client.query("UPDATE products SET stock=$1,cost_cents=$2,updated_at=$3,revision=revision+1 WHERE id=$4", [nextStock, weightedCost, now, line.product_id]);
        await client.query(
          `INSERT INTO stock_movements (product_id,delta,reason,note,source_type,source_id,created_at)
           VALUES ($1,$2,'compra',$3,'purchase_receipt',$4,$5)`,
          [line.product_id, input.quantity, `Recepción ${receiptId}; compra ${orderId}.`, receiptLineId, receivedAt],
        );
      } else {
        const totals = await client.query<{ quantity: string | number; landed_cents: string | number }>(
          `SELECT COALESCE(SUM(quantity),0) AS quantity,
                  COALESCE(SUM(quantity*unit_cost_cents+shipping_cents),0) AS landed_cents
             FROM purchase_receipt_items WHERE purchase_order_item_id=$1`,
          [input.id],
        );
        const unitCost = Math.round(Number(totals.rows[0].landed_cents) / Number(totals.rows[0].quantity));
        await client.query(
          `UPDATE part_requests SET status='disponible',internal_cost_cents=$1,supplier=(SELECT s.name FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id WHERE po.id=$2),quality=$3,updated_at=$4,revision=revision+1 WHERE id=$5`,
          [unitCost, orderId, line.quality, now, line.part_request_id],
        );
      }
    }

    const status = await client.query<{ complete: boolean }>(
      "SELECT bool_and(received_quantity=quantity) AS complete FROM purchase_order_items WHERE purchase_order_id=$1",
      [orderId],
    );
    await client.query("UPDATE purchase_orders SET status=$1,updated_at=$2,revision=revision+1 WHERE id=$3", [status.rows[0].complete ? "recibida" : "parcial", now, orderId]);
    await client.query("INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('purchase_receipt',$1,'received',$2,$3)", [receiptId, `Recepción parcial o total de ${items.reduce((sum, item) => sum + item.quantity, 0)} unidades para el pedido ${orderId}.`, now]);
    return receiptId;
  });
}

async function cancelOrder(database: Database, action: Action, now: string): Promise<number> {
  const id = positiveId(action.id);
  const reason = note(action.reason, "motivo de cancelación", 500, true);
  return database.transaction(async (client) => {
    const order = await client.query<{ status: string }>("SELECT status FROM purchase_orders WHERE id=$1 FOR UPDATE", [id]);
    if (!order.rowCount) throw new ProcurementError("El pedido no existe.", 404);
    if (order.rows[0].status === "cancelada") return id;
    if (order.rows[0].status === "recibida") throw new ProcurementError("Un pedido recibido no se cancela; conserva su historial.", 409);
    await client.query("UPDATE purchase_orders SET status='cancelada',cancelled_at=$1,cancel_reason=$2,updated_at=$1,revision=revision+1 WHERE id=$3", [now, reason, id]);
    await client.query(
      `UPDATE part_requests p SET status=CASE WHEN EXISTS(
                SELECT 1 FROM purchase_order_items i WHERE i.purchase_order_id=$2 AND i.part_request_id=p.id AND i.received_quantity>0
              ) THEN 'disponible' ELSE 'por_verificar' END, updated_at=$1,revision=revision+1
        WHERE p.status='solicitada' AND p.id IN (
          SELECT i.part_request_id FROM purchase_order_items i WHERE i.purchase_order_id=$2 AND i.part_request_id IS NOT NULL
        )`,
      [now, id],
    );
    await client.query("INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('purchase_order',$1,'cancelled',$2,$3)", [id, reason, now]);
    return id;
  });
}

async function transferToInventory(database: Database, action: Action, now: string): Promise<number> {
  const itemId = positiveId(action.purchaseOrderItemId);
  const productId = positiveId(action.productId);
  return database.transaction(async (client) => {
    const result = await client.query<{
      id: number; purchase_order_id: number; destination: string; product_id: number | null;
      part_request_id: number | null; repair_id: number | null; received_quantity: number; quality: string;
    }>(
      `SELECT i.id,i.purchase_order_id,i.destination,i.product_id,i.part_request_id,i.repair_id,i.received_quantity,i.quality
         FROM purchase_order_items i WHERE i.id=$1 FOR UPDATE`, [itemId],
    );
    if (!result.rowCount) throw new ProcurementError("El concepto de compra no existe.", 404);
    const item = result.rows[0];
    if (item.destination === "inventory" && Number(item.product_id) === productId) return itemId;
    if (item.destination !== "repair" || !item.part_request_id || !item.repair_id) throw new ProcurementError("La pieza no es una compra ligada a una reparación.", 409);
    const part = await client.query<{ status: string; order_status: string }>(
      "SELECT p.status,o.status AS order_status FROM part_requests p JOIN orders o ON o.id=p.order_id WHERE p.id=$1 FOR UPDATE OF p,o",
      [item.part_request_id],
    );
    if (!part.rowCount || !["cancelada", "disponible"].includes(part.rows[0].status) && part.rows[0].order_status !== "cancelada") {
      throw new ProcurementError("Solo se transfiere a inventario una pieza ya recibida de una reparación cancelada.", 409);
    }
    const product = await client.query<{ stock: number; cost_cents: number | null; currency: string }>("SELECT stock,cost_cents,currency FROM products WHERE id=$1 FOR UPDATE", [productId]);
    if (!product.rowCount) throw new ProcurementError("El producto de inventario no existe.", 404);
    const source = await client.query<{ currency: string }>("SELECT currency FROM purchase_orders WHERE id=$1", [item.purchase_order_id]);
    if (product.rows[0].currency !== source.rows[0].currency) throw new ProcurementError("La moneda del producto no coincide con la compra.", 409);
    if (Number(item.received_quantity) > 0) {
      const cost = await client.query<{ landed_cents: string | number }>(
        "SELECT COALESCE(SUM(quantity*unit_cost_cents+shipping_cents),0) AS landed_cents FROM purchase_receipt_items WHERE purchase_order_item_id=$1",
        [itemId],
      );
      const stock = Number(product.rows[0].stock ?? 0);
      const quantity = Number(item.received_quantity);
      const nextStock = stock + quantity;
      const weightedCost = Math.round(((Number(product.rows[0].cost_cents ?? 0) * stock) + Number(cost.rows[0].landed_cents)) / nextStock);
      await client.query("UPDATE products SET stock=$1,cost_cents=$2,updated_at=$3,revision=revision+1 WHERE id=$4", [nextStock, weightedCost, now, productId]);
      await client.query(
        `INSERT INTO stock_movements (product_id,delta,reason,note,source_type,source_id,created_at)
         VALUES ($1,$2,'traspaso',$3,'purchase_transfer',$4,$5)`,
        [productId, quantity, `Pieza no retornable del pedido ${item.purchase_order_id}; refacción ${item.part_request_id}.`, itemId, now],
      );
    }
    await client.query("UPDATE purchase_order_items SET destination='inventory',product_id=$1 WHERE id=$2", [productId, itemId]);
    await client.query("UPDATE part_requests SET status='cancelada',updated_at=$1,revision=revision+1 WHERE id=$2 AND status<>'instalada'", [now, item.part_request_id]);
    await client.query("INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('purchase_order_item',$1,'transferred_to_inventory',$2,$3)", [itemId, `Traspaso trazable al producto ${productId}.`, now]);
    return itemId;
  });
}

async function installPart(database: Database, action: Action, now: string): Promise<number> {
  const partRequestId = positiveId(action.partRequestId);
  return database.transaction(async (client) => {
    const part = await client.query<{ status: string; order_status: string }>(
      "SELECT p.status,o.status AS order_status FROM part_requests p JOIN orders o ON o.id=p.order_id WHERE p.id=$1 FOR UPDATE OF p,o",
      [partRequestId],
    );
    if (!part.rowCount) throw new ProcurementError("La refacción no existe.", 404);
    if (part.rows[0].status === "instalada") return partRequestId;
    if (part.rows[0].status !== "disponible" || ["cancelada", "entregada"].includes(part.rows[0].order_status)) {
      throw new ProcurementError("Solo se instala una refacción recibida para una orden activa.", 409);
    }
    const lineResult = await client.query<{ id: number; destination: string; product_id: number | null; received_quantity: number }>(
      `SELECT id,destination,product_id,received_quantity FROM purchase_order_items
        WHERE part_request_id=$1 AND received_quantity>0 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [partRequestId],
    );
    if (!lineResult.rowCount) throw new ProcurementError("No hay una recepción de compra asociada a esta refacción.", 409);
    const line = lineResult.rows[0];
    if (line.destination === "inventory") {
      const productId = Number(line.product_id);
      const stock = await client.query<{ stock: number }>("SELECT stock FROM products WHERE id=$1 FOR UPDATE", [productId]);
      if (!stock.rowCount || Number(stock.rows[0].stock) < 1) throw new ProcurementError("No hay existencias suficientes para instalar esta pieza.", 409);
      await client.query("UPDATE products SET stock=stock-1,updated_at=$1,revision=revision+1 WHERE id=$2 AND stock>=1", [now, productId]);
      await client.query(
        `INSERT INTO stock_movements (product_id,delta,reason,note,source_type,source_id,created_at)
         VALUES ($1,-1,'instalacion',$2,'part_request_install',$3,$4)`,
        [productId, `Instalada en la refacción ${partRequestId}.`, partRequestId, now],
      );
    }
    await client.query("UPDATE part_requests SET status='instalada',updated_at=$1,revision=revision+1 WHERE id=$2", [now, partRequestId]);
    await client.query("INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('part_request',$1,'installed','Refacción recibida marcada como instalada.',$2)", [partRequestId, now]);
    return partRequestId;
  });
}

export function isProcurementAction(action: unknown): action is string {
  return typeof action === "string" && [
    "createPurchaseOrder", "markPurchaseOrdered", "recordSupplierPayment", "receivePurchaseOrder",
    "cancelPurchaseOrder", "transferPurchasePartToInventory", "installPurchasedPart",
  ].includes(action);
}

export async function runProcurementAction(database: Database, action: Action, now: string): Promise<number> {
  switch (action.action) {
    case "createPurchaseOrder": return createPurchaseOrder(database, action, now);
    case "markPurchaseOrdered": return markOrdered(database, action, now);
    case "recordSupplierPayment": return recordPayment(database, action, now);
    case "receivePurchaseOrder": return receiveOrder(database, action, now);
    case "cancelPurchaseOrder": return cancelOrder(database, action, now);
    case "transferPurchasePartToInventory": return transferToInventory(database, action, now);
    case "installPurchasedPart": return installPart(database, action, now);
    default: throw new ProcurementError("Operación de compra desconocida.");
  }
}
