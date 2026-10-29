/* eslint-disable */
// @ts-nocheck
import { getDatabase } from "@/db";
import { isProcurementAction, ProcurementError, runProcurementAction } from "./procurement";
import { CashError, isCashAction, runCashAction } from "./cash";
function t() { return getDatabase(); }
var n = `force-dynamic`, r = class extends Error {
    constructor(e, t = 400) { super(e), this.code = t; }
}, i = (e, t = 200, n = {}) => Response.json(e, { status: t, headers: { "Cache-Control": `no-store`, "X-Content-Type-Options": `nosniff`, ...n } }), a = { workshopName: `Salvacel`, defaultCurrency: `MXN`, reviewUsdCents: 500, exchangeRate: null, revision: 0, logoDataUrl: null, phone: `686 226 2377`, whatsapp: ``, address: ``, city: `Mexicali, Baja California`, timezone: `America/Tijuana`, ticketOrderNote: `Conserva este ticket para recoger tu equipo.`, ticketPaymentNote: `Gracias por tu pago.`, ticketSaleNote: `Gracias por tu compra.`, ticketPaperMm: 58, lowStockThreshold: 3, quoteStaleDays: 30, overdueDays: 15, quoteValidDays: 7, folioPrefixOrder: `SC`, folioPrefixQuote: `PR`, folioPrefixSale: `VTA`, lastBackupAt: null, backupWarningDays: 7, waTemplateReady: `Hola {cliente}, tu equipo {equipo} está listo para entregar. Tu saldo es {saldo}. — {taller}`, waTemplateQuote: `Hola {cliente}, te compartimos el presupuesto {folio} para {equipo}. Total: {saldo}. — {taller}`, waTemplateReminder: `Hola {cliente}, te recordamos que el saldo de tu equipo {equipo} es {saldo}. — {taller}`, pinHash: null, pinSalt: null, pinEnabled: 0, pinIdleMinutes: 10, warrantyTerms: `` }, o = new Map, s = `creation_key,created_at,updated_at,first_name,last_name,phone,brand,model,problem,repair_type,notes,currency,service_cents,parts_cents,review_cents,review_usd_cents,apply_review,exchange_rate`, c = e => Object.fromEntries(Object.entries(e).map(([e, t]) => [e.replace(/_([a-z])/g, (e, t) => t.toUpperCase()), t])), l = `(o.service_cents+o.parts_cents+o.review_cents)`, u = `SELECT o.*,${l} AS total_cents,COALESCE((SELECT SUM(amount_cents) FROM payments WHERE order_id=o.id AND voided_at IS NULL),0) AS paid_cents,COALESCE((SELECT SUM(amount_cents) FROM payments WHERE order_id=o.id AND kind='anticipo' AND voided_at IS NULL),0) AS deposit_cents,${l}-COALESCE((SELECT SUM(amount_cents) FROM payments WHERE order_id=o.id AND voided_at IS NULL),0) AS due_cents FROM orders o`;
async function d(e) { let t = await e.prepare(`SELECT * FROM settings WHERE id=1`).first(); return t ? c(t) : a; }
function f(e) { let t = ``; for (let n of e)
    t += String.fromCharCode(n); return btoa(t); }
function p(e) { let t = atob(e); return Uint8Array.from(t, e => e.charCodeAt(0)); }
async function m(e, t) { let n = await crypto.subtle.importKey(`raw`, new TextEncoder().encode(e), { name: `PBKDF2` }, !1, [`deriveBits`]), r = await crypto.subtle.deriveBits({ name: `PBKDF2`, salt: t, iterations: 1e5, hash: `SHA-256` }, n, 256); return f(new Uint8Array(r)); }
async function h(e) { let t = await crypto.subtle.digest(`SHA-256`, new TextEncoder().encode(e)); return f(new Uint8Array(t)); }
function g(e, t) { return e.headers.get(`cookie`)?.split(`;`).map(e => e.trim()).find(e => e.startsWith(t + `=`))?.slice(t.length + 1) || ``; }
async function _(e, t, n) { if (!n.pinEnabled)
    return !0; let r = g(e, `salvacel_session`); return r ? !!await t.prepare(`SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?`).bind(await h(r), new Date().toISOString()).first() : !1; }
function v(e, t, n = 200, i = !1) { if (typeof e != `string`) {
    if (i)
        throw new r(`Falta ${t}.`);
    return ``;
} let a = e.trim(); if (i && !a)
    throw new r(`Falta ${t}.`); if (a.length > n)
    throw new r(`${t}: máximo ${n} caracteres.`); return a; }
function y(e, t) { if (e === `` || e == null)
    return 0; let n = String(e); if (!/^\d+(\.\d{1,2})?$/.test(n))
    throw new r(`${t}: usa un importe positivo con hasta dos decimales.`); let i = Math.round(Number(n) * 100); if (!Number.isSafeInteger(i) || i > 1e8)
    throw new r(`${t}: importe fuera de rango.`); return i; }
function b(e) { if (!Number.isSafeInteger(e) || Number(e) <= 0)
    throw new r(`Identificador inválido.`); return Number(e); }
function x(e) { let t = v(e, `identificador de operación`, 100, !0); if (!/^[a-zA-Z0-9-]{8,100}$/.test(t))
    throw new r(`Operación inválida.`); return t; }
function S(e) { if (!Number.isSafeInteger(e) || Number(e) < 0)
    throw new r(`Versión inválida.`); return Number(e); }
function C(e) { if (![`nueva`, `proceso`, `esperando_refaccion`, `terminada`, `entregada`, `cancelada`].includes(String(e)))
    throw new r(`Estado inválido.`); return String(e); }
function w(e) { if (![`por_verificar`, `solicitada`, `disponible`, `no_disponible`].includes(String(e)))
    throw new r(`Estado de refacción inválido.`); return String(e); }
function T(e) { if (![`efectivo`, `transferencia`, `tarjeta`, `otro`].includes(String(e)))
    throw new r(`Método de pago inválido.`); return String(e); }
function E(e, t, n = 1e6) { let i = Number(e); if (!Number.isSafeInteger(i) || i < 0 || i > n)
    throw new r(`${t}: escribe un número entero válido.`); return i; }
function D(e) { if (![`MXN`, `USD`].includes(String(e)))
    throw new r(`Moneda inválida.`); return String(e); }
function O(e) { let t = v(e, `zona horaria`, 80, !0); try {
    let e = typeof Intl.supportedValuesOf == `function` ? Intl.supportedValuesOf(`timeZone`) : [];
    if (e.length && !e.includes(t))
        throw Error();
    new Intl.DateTimeFormat(`es-MX`, { timeZone: t });
}
catch {
    throw new r(`La zona horaria no es válida.`);
} return t; }
function k(e, t) { let n = v(e, t, 4, !0); if (!/^[A-Z]{2,4}$/.test(n))
    throw new r(`${t}: usa de 2 a 4 letras mayúsculas.`); return n; }
function A(e) { if (e === null)
    return null; if (typeof e != `string` || e.length > 47e4)
    throw new r(`El logotipo debe ser una imagen PNG, JPG o WebP de hasta 350 KB.`); let t = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(e); if (!t || t[2].length % 4 != 0)
    throw new r(`El logotipo debe ser una imagen PNG, JPG o WebP válida.`); let n; try {
    n = atob(t[2]);
}
catch {
    throw new r(`No se pudo leer el logotipo. Selecciona otra imagen.`);
} if (n.length > 35e4)
    throw new r(`El logotipo no puede superar 350 KB.`); let i = e => n.charCodeAt(e), a = t[1] === `image/png` && n.length > 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((e, t) => i(t) === e), o = t[1] === `image/jpeg` && n.length > 3 && i(0) === 255 && i(1) === 216 && i(2) === 255, s = t[1] === `image/webp` && n.length > 12 && n.slice(0, 4) === `RIFF` && n.slice(8, 12) === `WEBP`; if (!a && !o && !s)
    throw new r(`El contenido del archivo no coincide con el formato de imagen.`); return e; }
function j(e, t, n) { let i = v(e.firstName, `nombre`, 100, !0), a = v(e.lastName, `apellido`, 100, !0), o = v(e.phone, `teléfono`, 40), s = n?.legacy_order_number && o === n.phone; if (o && !s && (!/^[+\d\s().-]+$/.test(o) || o.replace(/\D/g, ``).length < 7 || o.replace(/\D/g, ``).length > 15))
    throw new r(`Escribe un teléfono válido de 7 a 15 dígitos o déjalo vacío.`); let c = v(e.brand, `marca`, 80, !0), l = v(e.model, `modelo`, 100, !0), u = v(e.problem, `problema`, 3e3), d = v(e.repairType, `tipo de reparación`, 150, !0), f = v(e.notes, `notas`, 5e3), p = String(e.currency); if (![`MXN`, `USD`].includes(p))
    throw new r(`Moneda inválida.`); let m = y(e.service, `servicio`), h = y(e.parts, `refacciones`), g = e.applyReview === !0, _ = t.reviewUsdCents, b = t.exchangeRate, x = 0; if (n && Number(n.apply_review) === 1 && g && n.currency === p)
    _ = Number(n.review_usd_cents), b = n.exchange_rate === null ? null : Number(n.exchange_rate), x = Number(n.review_cents);
else if (g)
    if (p === `USD`)
        x = _;
    else {
        if (!b)
            throw new r(`Configura el tipo de cambio para cobrar la revisión en pesos, o usa una orden en USD.`);
        x = Math.round(_ * b);
    } let S = m + h + x; if (S <= 0)
    throw new r(`El total debe ser mayor que cero.`); return { values: [i, a, o, c, l, u, d, f, p, m, h, x, _, +!!g, b], total: S, currency: p }; }
function M(e, t) { let n = (n, r) => v(Object.hasOwn(e, n) ? e[n] : t?.[n.replace(/[A-Z]/g, e => `_` + e.toLowerCase())], n, r), i = n(`promisedDate`, 10); if (i && !/^\d{4}-\d{2}-\d{2}$/.test(i))
    throw new r(`La fecha prometida no es válida.`); let a = E(Object.hasOwn(e, `warrantyDays`) ? e.warrantyDays : Number(t?.warranty_days || 0), `días de garantía`, 3650); return [n(`imei`, 40), n(`unlockCode`, 80), n(`accessoriesLeft`, 500), n(`physicalCondition`, 1e3), i || null, n(`technician`, 120), a, Object.hasOwn(e, `deliveredAt`) ? v(e.deliveredAt, `fecha de entrega`, 40) : t?.delivered_at || null, n(`cancelReason`, 500)]; }
function customerInput(e) { if (!e || typeof e !== `object` || Array.isArray(e)) throw new r(`Los datos del cliente no son válidos.`); let t = v(e.firstName, `nombre`, 100, !0), n = v(e.lastName, `apellido`, 100, !0), i = v(e.phone, `teléfono`, 40), a = v(e.phoneAdditional, `teléfono adicional`, 40), o = v(e.notes, `notas del cliente`, 2000), validPhone = value => !value || (/^[+\d\s().-]+$/.test(value) && value.replace(/\D/g, ``).length >= 7 && value.replace(/\D/g, ``).length <= 15); if (!validPhone(i)) throw new r(`Escribe un teléfono válido de 7 a 15 dígitos o déjalo vacío.`); if (!validPhone(a)) throw new r(`Escribe un teléfono adicional válido de 7 a 15 dígitos o déjalo vacío.`); if (i && a && i.replace(/\D/g, ``) === a.replace(/\D/g, ``)) throw new r(`El teléfono adicional debe ser distinto al teléfono principal.`); return [t,n,i,a,o]; }
function repairInput(e, t) { if (!e || typeof e !== `object` || Array.isArray(e)) throw new r(`Una reparación no es válida.`); let n=v(e.repairType,`tipo de reparación`,150,!0),i=v(e.problem,`problema`,3000),o=v(e.diagnosis,`diagnóstico`,3000),s=v(e.solution,`solución`,3000),c=v(e.notes,`notas de reparación`,3000),l=E(e.serviceCents??0,`mano de obra`,1e8),u=E(e.partsCents??0,`importe de refacción`,1e8),d=E(e.reviewCents??0,`revisión`,1e8),f=e.partCostCents===null||e.partCostCents===void 0||e.partCostCents===``?null:E(e.partCostCents,`costo interno de refacción`,1e8),p=v(e.partName,`refacción`,150),m=v(e.supplierName,`proveedor`,120),h=e.supplierId===null||e.supplierId===void 0||e.supplierId===``?null:b(e.supplierId),quoteSupplierIds=[...new Set((Array.isArray(e.quoteSupplierIds)?e.quoteSupplierIds:[]).map(b))],requestQuote=!!e.requestQuote; if (h && !t.has(h)) throw new r(`El proveedor seleccionado no existe.`); if(requestQuote&&(!p||!quoteSupplierIds.length))throw new r(`Indica la refacción y elige al menos un proveedor para solicitar precio.`);if(quoteSupplierIds.some(id=>!t.has(id)))throw new r(`Un proveedor seleccionado ya no existe.`);return {repairType:n,problem:i,diagnosis:o,solution:s,notes:c,serviceCents:l,partsCents:u,reviewCents:d,partName:p,partCostCents:f,supplierId:h,supplierName:m,requestQuote,quoteSupplierIds,total:l+u+d}; }
function Q(e) { let t = c(e); delete t.unlockCode; return t; }
async function N(e) { let t = await e.batch([e.prepare(u + ` ORDER BY o.id DESC`), e.prepare(`SELECT q.*,(q.service_cents+q.parts_cents+q.review_cents) AS total_cents,o.id AS converted_order_id FROM quotes q LEFT JOIN orders o ON o.quote_id=q.id ORDER BY q.id DESC`), e.prepare(`SELECT p.*,o.currency,o.first_name,o.last_name,o.brand,o.model FROM payments p JOIN orders o ON o.id=p.order_id ORDER BY p.id DESC`), e.prepare(`SELECT * FROM products ORDER BY active DESC,name COLLATE NOCASE`), e.prepare(`SELECT * FROM sales ORDER BY id DESC LIMIT 100`), e.prepare(`SELECT si.* FROM sale_items si JOIN sales s ON s.id=si.sale_id ORDER BY si.id`), e.prepare(`SELECT * FROM settings WHERE id=1`), e.prepare(`SELECT * FROM part_requests ORDER BY CASE WHEN status='por_verificar' THEN 0 ELSE 1 END,id DESC`), e.prepare(`SELECT * FROM suppliers ORDER BY active DESC,name COLLATE NOCASE`), e.prepare(`SELECT q.*,s.name AS supplier_name FROM part_quotes q JOIN suppliers s ON s.id=q.supplier_id ORDER BY q.id DESC LIMIT 300`), e.prepare(`SELECT * FROM price_requests ORDER BY CASE WHEN status='pendiente' THEN 0 ELSE 1 END,id DESC LIMIT 300`), e.prepare(`SELECT * FROM brands ORDER BY active DESC,sort,id`), e.prepare(`SELECT * FROM services ORDER BY active DESC,sort,id`), e.prepare(`SELECT * FROM payment_methods ORDER BY active DESC,sort,id`), e.prepare(`SELECT * FROM customers ORDER BY last_name COLLATE NOCASE,first_name COLLATE NOCASE,id`), e.prepare(`SELECT * FROM receptions ORDER BY id DESC LIMIT 1000`), e.prepare(`SELECT * FROM order_repairs ORDER BY order_id,position,id`), e.prepare(`SELECT * FROM order_resolutions ORDER BY id DESC`), e.prepare(`SELECT * FROM warranty_claims ORDER BY created_at DESC,id DESC`)]), n = t[5].results.map(e => c(e)), productSupplierRows=(await e.prepare(`SELECT product_id,supplier_id FROM product_suppliers ORDER BY product_id,supplier_id`).all()).results, supplierIdsByProduct=new Map; for(let row of productSupplierRows){let ids=supplierIdsByProduct.get(Number(row.product_id))||[];ids.push(Number(row.supplier_id));supplierIdsByProduct.set(Number(row.product_id),ids);} return { orders: t[0].results.map(e => Q(e)), quotes: t[1].results.map(e => ({ ...c(e), paidCents: 0, dueCents: Number(e.total_cents), depositCents: 0 })), payments: t[2].results.map(e => c(e)), products: t[3].results.map(e => ({...c(e),supplierIds:supplierIdsByProduct.get(Number(e.id))||[]})), sales: t[4].results.map(e => ({ ...c(e), items: n.filter(t => t.saleId === e.id) })), settings: t[6].results[0] ? c(t[6].results[0]) : a, partRequests: t[7].results.map(e => c(e)), suppliers: t[8].results.map(e => c(e)), partQuotes: t[9].results.map(e => c(e)), priceRequests: t[10].results.map(e => c(e)), brands: t[11].results.map(e => c(e)), services: t[12].results.map(e => c(e)), paymentMethods: t[13].results.map(e => c(e)), customers: t[14].results.map(e => c(e)), receptions: t[15].results.map(e => c(e)), orderRepairs: t[16].results.map(e => c(e)), orderResolutions:t[17].results.map(e=>c(e)), warrantyClaims:t[18].results.map(e=>c(e)) }; }
var P = [`customers`, `customer_devices`, `receptions`, `orders`, `repair_photo_upload_tokens`, `repair_photos`, `order_repairs`, `quotes`, `payments`, `order_resolutions`, `warranty_claims`, `part_requests`, `suppliers`, `part_quotes`, `price_requests`, `price_request_suppliers`, `supplier_inbound_messages`, `supplier_responses`, `products`, `product_suppliers`, `sales`, `sale_items`, `settings`, `brands`, `services`, `payment_methods`, `stock_movements`, `audit_log`, `purchase_orders`, `purchase_order_items`, `supplier_payments`, `purchase_receipts`, `purchase_receipt_items`, `recurring_expenses`, `recurring_expense_occurrences`, `cash_outflows`, `cash_closings`];
async function createBackup(e) { let t = await e.batch(P.map(t => e.prepare(`SELECT * FROM ${t}`))); return { schemaVersion: `0031`, exportedAt: new Date().toISOString(), tables: Object.fromEntries(P.map((e, n) => [e, t[n].results])) }; }
var I = { orders: { id: `ID`, creation_key: `Clave`, created_at: `Creada`, updated_at: `Actualizada`, first_name: `Nombre`, last_name: `Apellido`, phone: `Teléfono`, brand: `Marca`, model: `Modelo`, problem: `Problema`, repair_type: `Reparación`, notes: `Notas`, currency: `Moneda`, service_cents: `Servicio (pesos)`, parts_cents: `Refacciones (pesos)`, review_cents: `Revisión (pesos)`, status: `Estado` }, payments: { id: `ID`, order_id: `Orden`, amount_cents: `Importe (pesos)`, kind: `Concepto`, method: `Método`, notes: `Nota`, created_at: `Fecha` }, products: { id: `ID`, sku: `SKU`, name: `Producto`, category: `Categoría`, glass_compatibility: `Posible compatibilidad de vidrio templado`, price_cents: `Precio (pesos)`, currency: `Moneda`, stock: `Existencia`, active: `Activo` }, sales: { id: `ID`, created_at: `Fecha`, method: `Método`, currency: `Moneda`, total_cents: `Total (pesos)`, amount_received_cents: `Recibido (pesos)`, change_cents: `Cambio (pesos)`, order_id: `Orden`, order_payment_cents: `Pago de orden (pesos)` } };
function L(e, t) { if (e == null)
    return ``; let n = t.endsWith(`_cents`) && typeof e == `number` ? Number(e) / 100 : e; return String(n).replace(/"/g, `""`); }
function R(e, t) {
    let n = Object.keys(e[0] || I[t] || {});
    return `﻿` + [n.map(e => I[t]?.[e] || e), ...e.map(e => n.map(t => `"${L(e[t], t)}"`))].map(e => e.join(`,`)).join(`\r
`);
}
var z = [`settings`, `customers`, `customer_devices`, `receptions`, `suppliers`, `products`, `product_suppliers`, `quotes`, `orders`, `repair_photo_upload_tokens`, `repair_photos`, `order_repairs`, `part_requests`, `part_quotes`, `price_requests`, `price_request_suppliers`, `supplier_inbound_messages`, `supplier_responses`, `sales`, `sale_items`, `payments`, `order_resolutions`, `warranty_claims`, `brands`, `services`, `payment_methods`, `stock_movements`, `audit_log`, `purchase_orders`, `purchase_order_items`, `supplier_payments`, `purchase_receipts`, `purchase_receipt_items`, `recurring_expenses`, `recurring_expense_occurrences`, `cash_outflows`, `cash_closings`];
function B(database, backup) {
    if (![`0008`, `0009`, `0013`, `0014`, `0015`, `0016`, `0017`, `0018`, `0019`, `0020`, `0021`, `0022`, `0023`, `0024`, `0025`, `0026`, `0027`, `0031`].includes(String(backup.schemaVersion)))
        throw new r(`La versión del respaldo no es compatible.`);
    let tables = backup.tables;
    if (!tables || typeof tables != `object`)
        throw new r(`El respaldo no contiene tablas válidas.`);
    let optional = new Set([`stock_movements`, `audit_log`, `order_resolutions`, `warranty_claims`, `customers`, `customer_devices`, `receptions`, `order_repairs`, `price_request_suppliers`, `supplier_inbound_messages`, `supplier_responses`, `repair_photo_upload_tokens`, `repair_photos`, `purchase_orders`, `purchase_order_items`, `supplier_payments`, `purchase_receipts`, `purchase_receipt_items`, `recurring_expenses`, `recurring_expense_occurrences`, `cash_outflows`, `cash_closings`, `product_suppliers`]), statements = [database.prepare(`SELECT set_config('salvacel.restoring','on',true)`), database.prepare(`UPDATE price_requests SET selected_response_id=NULL,selected_supplier_id=NULL,selected_at=NULL`)], deferredCancelledStatuses = [], deferredQuoteSelections = [];
    for (let table of [...z].reverse())
        statements.push(database.prepare(`DELETE FROM ${table}`));
    for (let table of z) {
        if (table === `order_resolutions` && deferredCancelledStatuses.length) {
            statements.push(...deferredCancelledStatuses);
            deferredCancelledStatuses = [];
        }
        let rows = tables[table];
        if (!Array.isArray(rows)) {
            if (optional.has(table))
                continue;
            throw new r(`Falta la tabla ${table} en el respaldo.`);
        }
        if (!rows.length)
            continue;
        let columns = Object.keys(rows[0]);
        if (!columns.length || columns.some(column => !/^[a-z_][a-z0-9_]*$/.test(column)))
            throw new r(`Columnas inválidas en ${table}.`);
        let placeholders = columns.map(() => `?`).join(`,`);
        for (let row of rows) {
            if (!row || typeof row != `object`)
                throw new r(`Registro inválido en ${table}.`);
            let values = row;
            if (table === `orders` && row.status === `cancelada`) {
                values = { ...row, status: `nueva` };
                deferredCancelledStatuses.push(database.prepare(`UPDATE orders SET status=? WHERE id=?`).bind(`cancelada`, row.id));
            }
            if (table === `repair_photo_upload_tokens`) {
                values = { ...values, revoked_at: new Date().toISOString(), upload_session_hash: null, upload_session_expires_at: null };
            }
            if (table === `price_requests` && row.selected_response_id != null) {
                values = { ...values, selected_response_id: null };
                deferredQuoteSelections.push(database.prepare(`UPDATE price_requests SET selected_response_id=? WHERE id=?`).bind(row.selected_response_id, row.id));
            }
            statements.push(database.prepare(`INSERT INTO ${table} (${columns.join(`,`)}) VALUES (${placeholders})`).bind(...columns.map(column => table === `supplier_inbound_messages` && [`candidate_association_ids`,`proposal`].includes(column) && values[column] != null ? JSON.stringify(values[column]) : values[column] ?? null)));
        }
        if (table === `supplier_responses` && deferredQuoteSelections.length) {
            statements.push(...deferredQuoteSelections);
            deferredQuoteSelections = [];
        }
    }
    statements.push(database.prepare(`INSERT INTO customer_devices (creation_key,customer_id,created_at,updated_at) SELECT 'restored-order-device-'||id,customer_id,created_at,updated_at FROM orders WHERE device_id IS NULL ON CONFLICT(creation_key) DO NOTHING`));
    statements.push(database.prepare(`UPDATE orders SET device_id=(SELECT id FROM customer_devices WHERE creation_key='restored-order-device-'||orders.id) WHERE device_id IS NULL`));
    return statements;
}
async function V(e) { try {
    let n = new URL(e.url), r = n.searchParams.get(`export`), a = t();
    if (!await _(e, a, await d(a)))
        return i({ locked: !0, pinEnabled: 1 }, 401);
    if (n.searchParams.get(`recovery`) === `1`) {
        let e = n.searchParams.get(`id`);
        if (e) {
            let t = await a.prepare(`SELECT payload FROM restore_snapshots WHERE id=?`).bind(b(Number(e))).first();
            if (!t)
                return i({ error: `No se encontró la copia de recuperación.` }, 404);
            return new Response(String(t.payload), { headers: { "Content-Type": `application/json; charset=utf-8`, "Content-Disposition": `attachment; filename="salvacel-recuperacion-${e}.json"`, "Cache-Control": `no-store` } });
        }
        let t = await a.prepare(`SELECT id,created_at FROM restore_snapshots ORDER BY id DESC LIMIT 5`).all();
        return i({ snapshots: t.results.map(e => c(e)) });
    }
    if (n.searchParams.get(`audit`) === `1`) {
        let e = await a.batch([a.prepare(`SELECT sm.*,p.name AS product_name,p.sku FROM stock_movements sm LEFT JOIN products p ON p.id=sm.product_id ORDER BY sm.id DESC LIMIT 500`), a.prepare(`SELECT * FROM audit_log ORDER BY id DESC LIMIT 500`)]);
        return i({ stockMovements: e[0].results.map(e => c(e)), auditLog: e[1].results.map(e => c(e)) });
    }
    if (r === `json`) {
        let e = await createBackup(a);
        return new Response(JSON.stringify(e), { headers: { "Content-Type": `application/json; charset=utf-8`, "Content-Disposition": `attachment; filename="salvacel-respaldo-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": `no-store` } });
    }
    if (r === `csv`) {
        let e = n.searchParams.get(`table`) || ``;
        if (!P.includes(e))
            return i({ error: `Tabla de exportación inválida.` }, 400);
        let t = (await a.prepare(`SELECT * FROM ${e}`).all()).results;
        return new Response(R(t, e), { headers: { "Content-Type": `text/csv; charset=utf-8`, "Content-Disposition": `attachment; filename="salvacel-${e}.csv"`, "Cache-Control": `no-store` } });
    }
    let data = await N(a);
    data.priceRequestSuppliers = (await a.prepare(`SELECT prs.*,s.name AS supplier_name FROM price_request_suppliers prs JOIN suppliers s ON s.id=prs.supplier_id ORDER BY prs.id DESC`).all()).results.map(c);
    data.supplierResponses = (await a.prepare(`SELECT sr.*,prs.price_request_id,prs.supplier_id,s.name AS supplier_name,pr.selected_response_id,pr.status AS request_status,pr.part_request_id,pr.repair_id,pr.quote_id,pr.brand,pr.model,COALESCE(o.currency,q.currency) AS currency,o.status AS repair_status FROM supplier_responses sr JOIN price_request_suppliers prs ON prs.id=sr.price_request_supplier_id JOIN suppliers s ON s.id=prs.supplier_id JOIN price_requests pr ON pr.id=prs.price_request_id LEFT JOIN order_repairs r ON r.id=pr.repair_id LEFT JOIN orders o ON o.id=r.order_id LEFT JOIN quotes q ON q.id=pr.quote_id ORDER BY sr.received_at DESC,sr.id DESC LIMIT 1000`).all()).results.map(c);
    data.supplierInboxMessages = (await a.prepare(`SELECT im.*,s.name AS supplier_name,linked.supplier_id AS linked_supplier_id,linked_s.name AS linked_supplier_name,pr.id AS linked_price_request_id,pr.brand AS linked_brand,pr.model AS linked_model,pr.part_name AS linked_part_name FROM supplier_inbound_messages im LEFT JOIN suppliers s ON s.id=im.supplier_id LEFT JOIN price_request_suppliers linked ON linked.id=im.linked_price_request_supplier_id LEFT JOIN suppliers linked_s ON linked_s.id=linked.supplier_id LEFT JOIN price_requests pr ON pr.id=linked.price_request_id ORDER BY im.received_at DESC,im.id DESC LIMIT 500`).all()).results.map(c);
    data.purchaseOrders = (await a.prepare(`SELECT po.*,s.name AS supplier_name,COALESCE((SELECT SUM(sp.amount_cents) FROM supplier_payments sp WHERE sp.purchase_order_id=po.id AND sp.voided_at IS NULL),0) AS paid_cents FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id ORDER BY po.id DESC LIMIT 500`).all()).results.map(c);
    data.purchaseOrderItems = (await a.prepare(`SELECT * FROM purchase_order_items ORDER BY purchase_order_id,id`).all()).results.map(c);
    data.supplierPayments = (await a.prepare(`SELECT * FROM supplier_payments ORDER BY id DESC LIMIT 1000`).all()).results.map(c);
    data.purchaseReceipts = (await a.prepare(`SELECT * FROM purchase_receipts ORDER BY received_at DESC,id DESC LIMIT 1000`).all()).results.map(c);
    data.purchaseReceiptItems = (await a.prepare(`SELECT * FROM purchase_receipt_items ORDER BY id DESC LIMIT 2000`).all()).results.map(c);
    data.cashOutflows = (await a.prepare(`SELECT * FROM cash_outflows ORDER BY created_at DESC,id DESC LIMIT 2000`).all()).results.map(c);
    data.recurringExpenses = (await a.prepare(`SELECT * FROM recurring_expenses ORDER BY active DESC,next_due_on,id`).all()).results.map(c);
    data.recurringExpenseOccurrences = (await a.prepare(`SELECT occurrence.*,expense.name AS expense_name FROM recurring_expense_occurrences occurrence JOIN recurring_expenses expense ON expense.id=occurrence.recurring_expense_id ORDER BY occurrence.due_on DESC,occurrence.id DESC LIMIT 2000`).all()).results.map(c);
    data.cashClosings = (await a.prepare(`SELECT * FROM cash_closings ORDER BY business_date DESC,currency,method LIMIT 500`).all()).results.map(c);
    return i(data);
}
catch (e) {
    return console.error(`taller-load`, e), i({ error: `No se pudieron cargar los datos. Intenta de nuevo.` }, 503);
} }
async function H(e) {
    try {
        if (e.headers.get(`sec-fetch-site`) === `cross-site`)
            throw new r(`Solicitud no permitida.`, 403);
        let n = e.headers.get(`origin`);
        let host = e.headers.get(`x-forwarded-host`) || e.headers.get(`host`), forwardedProto = e.headers.get(`x-forwarded-proto`), protocol = forwardedProto === `https` ? `https:` : forwardedProto === `http` ? `http:` : new URL(e.url).protocol, expectedOrigin = host ? new URL(`${protocol}//${host}`).origin : new URL(e.url).origin;
        if (n && n !== expectedOrigin)
            throw new r(`Solicitud no permitida.`, 403);
        if (Number(e.headers.get(`content-length`) || 0) > 54e4)
            throw new r(`La solicitud es demasiado grande.`, 413);
        let a;
        try {
            a = await e.json();
        }
        catch {
            throw new r(`Datos inválidos.`);
        }
        if (!a || typeof a != `object`)
            throw new r(`Datos inválidos.`);
        let c = t(), l = new Date().toISOString(), g = await d(c);
        if (a.action !== `unlock` && a.action !== `configurePin` && !await _(e, c, g))
            throw new r(`La sesión está bloqueada.`, 401);
        let N, P, F = ``;
        switch (a.action) {
            case `revealUnlock`: {
                let e = b(a.id), t = g.pinEnabled ? v(a.pin, `PIN actual`, 6, !0) : ``;
                if (g.pinEnabled && (!g.pinSalt || !g.pinHash || await m(t, p(g.pinSalt)) !== g.pinHash))
                    throw new r(`El PIN actual no coincide.`, 401);
                let n = await c.prepare(`SELECT unlock_code FROM orders WHERE id=?`).bind(e).first();
                if (!n)
                    throw new r(`La orden no existe.`, 404);
                N = n.unlock_code || ``;
                break;
            }
            case `unlock`: {
                if (!g.pinEnabled) {
                    N = 1;
                    break;
                }
                let t = v(a.pin, `PIN`, 6, !0), n = e.headers.get(`cf-connecting-ip`) || `local`, i = o.get(n), s = Date.now();
                if (!/^\d{4,6}$/.test(t))
                    throw new r(`El PIN debe tener entre 4 y 6 dígitos.`);
                if (i && i.until > s)
                    throw new r(`Demasiados intentos. Espera un minuto.`, 429);
                if (!g.pinSalt || !g.pinHash || await m(t, p(g.pinSalt)) !== g.pinHash) {
                    let e = { count: (i?.count || 0) + 1, until: (i?.count || 0) + 1 >= 5 ? s + 6e4 : 0 };
                    throw o.set(n, e), new r(`PIN incorrecto.`, 401);
                }
                o.delete(n);
                let u = f(crypto.getRandomValues(new Uint8Array(32))), d = new Date(s + g.pinIdleMinutes * 6e4).toISOString();
                await c.prepare(`INSERT OR REPLACE INTO sessions (token_hash,created_at,expires_at) VALUES (?,?,?)`).bind(await h(u), l, d).run(), F = `salvacel_session=${u}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${Math.max(60, g.pinIdleMinutes * 60)}`, N = 1;
                break;
            }
            case `configurePin`: {
                await c.prepare(`INSERT OR IGNORE INTO settings (id,revision) VALUES (1,0)`).run();
                let e = v(a.mode, `operación de PIN`, 20, !0), t = a.currentPin === void 0 ? `` : v(a.currentPin, `PIN actual`, 6), n = a.newPin === void 0 ? `` : v(a.newPin, `PIN nuevo`, 6);
                if (![`enable`, `disable`, `change`].includes(e))
                    throw new r(`Operación de PIN inválida.`);
                if (g.pinEnabled && (!g.pinSalt || !g.pinHash || !t || await m(t, p(g.pinSalt)) !== g.pinHash))
                    throw new r(`El PIN actual no coincide.`, 401);
                if (e !== `disable` && !/^\d{4,6}$/.test(n))
                    throw new r(`El PIN nuevo debe tener entre 4 y 6 dígitos.`);
                let i = crypto.getRandomValues(new Uint8Array(16)), o = e === `disable` ? null : await m(n, i), s = e === `disable` ? null : f(i);
                await c.prepare(`UPDATE settings SET pin_hash=?,pin_salt=?,pin_enabled=?,revision=revision+1 WHERE id=1 AND revision=?`).bind(o, s, e === `disable` ? 0 : 1, S(a.revision)).run(), await c.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES (?,?,?,?,?)`).bind(`settings`, 1, `pin_` + e, `PIN actualizado`, l).run(), N = 1;
                if (e === `enable` && !g.pinEnabled) {
                    let t = f(crypto.getRandomValues(new Uint8Array(32))), n = new Date(Date.now() + g.pinIdleMinutes * 6e4).toISOString();
                    await c.prepare(`INSERT OR REPLACE INTO sessions (token_hash,created_at,expires_at) VALUES (?,?,?)`).bind(await h(t), l, n).run(), F = `salvacel_session=${t}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${Math.max(60, g.pinIdleMinutes * 60)}`;
                }
                break;
            }
            case `importHistoricalOrders`: {
                if (!Array.isArray(a.records) || a.records.length < 1 || a.records.length > 100)
                    throw new r(`Envía entre 1 y 100 órdenes históricas.`);
                let e = await c.prepare(`SELECT COUNT(*) AS count FROM orders`).first();
                if (Number(e?.count || 0) !== 0)
                    throw new r(`La importación histórica solo puede ejecutarse sobre una base sin órdenes.`, 409);
                let t = new Set, n = [], i = [];
                for (let e = 0; e < a.records.length; e++) {
                    let o = a.records[e];
                    if (!o || typeof o != `object` || Array.isArray(o))
                        throw new r(`La fila histórica ${e + 1} no es válida.`);
                    let s = o;
                    if (E(s.expectedFolio, `folio esperado`, 1e5) !== e + 1)
                        throw new r(`Los folios históricos deben ser consecutivos; se esperaba ${e + 1}.`);
                    let u = v(s.sourceKey, `identificador histórico`, 80, !0);
                    if (t.has(u))
                        throw new r(`Identificador histórico duplicado: ${u}.`);
                    t.add(u);
                    let d = v(s.legacyOrderNumber, `folio anterior`, 20), f = v(s.orderDate, `fecha anterior`, 10, !0);
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || Number.isNaN(Date.parse(f + `T12:00:00-07:00`)) || new Date(f + `T12:00:00-07:00`).toISOString().slice(0, 10) !== f)
                        throw new r(`Fecha inválida en ${u}.`);
                    let p = v(s.firstName, `nombre`, 100, !0), m = v(s.lastName, `apellido`, 100, !0), h = v(s.phone, `teléfono histórico`, 40), g = v(s.brand, `marca`, 80, !0), _ = v(s.model, `modelo`, 100, !0), b = v(s.problem, `problema`, 3e3), x = v(s.repairType, `tipo de reparación`, 150, !0), S = v(s.notes, `notas`, 5e3), w = v(s.legacyStatus, `estado anterior`, 40, !0), T = C(s.status), D = y(s.total, `total histórico`), O = y(s.paid, `cobrado histórico`);
                    if (D <= 0)
                        throw new r(`El total de ${u} debe ser mayor que cero.`);
                    if (O > D)
                        throw new r(`Lo cobrado supera el total en ${u}.`);
                    let k = f + `T12:00:00-07:00`, A = `history-` + u;
                    i.push(n.length), n.push(c.prepare(`INSERT INTO orders (creation_key,created_at,updated_at,first_name,last_name,phone,brand,model,problem,repair_type,notes,currency,service_cents,parts_cents,review_cents,review_usd_cents,apply_review,status,legacy_order_number,legacy_order_date,legacy_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,500,0,?,?,?,?) RETURNING id`).bind(A, k, l, p, m, h, g, _, b, x, S, `MXN`, D, T, d || null, f, w)), O > 0 && n.push(c.prepare(`INSERT INTO payments (request_key,order_id,amount_cents,kind,method,notes,created_at) SELECT ?,id,?,'pago','otro','Cobro histórico agregado; fecha y método exactos no documentados',? FROM orders WHERE creation_key=?`).bind(A + `-payment`, O, k, A));
                    let j = s.part;
                    if (j && typeof j == `object` && !Array.isArray(j)) {
                        let e = j, t = v(e.name, `refacción histórica`, 150, !0), r = v(e.supplier, `proveedor histórico`, 120), i = v(e.quality, `calidad histórica`, 100), a = v(e.note, `nota de refacción histórica`, 1e3), o = null;
                        e.internalCost !== `` && e.internalCost !== null && e.internalCost !== void 0 && (o = y(e.internalCost, `costo interno histórico`)), n.push(c.prepare(`INSERT INTO part_requests (order_id,name,status,internal_cost_cents,supplier,quality,note,created_at,updated_at) SELECT id,?,'disponible',?,?,?,?,?,? FROM orders WHERE creation_key=?`).bind(t, o, r, i, a, k, l, A));
                    }
                }
                let o = await c.batch(n);
                P = i.filter(e => o[e].meta.changes).length;
                let s = await c.prepare(`SELECT MAX(id) AS id FROM orders`).first();
                if (P !== a.records.length || Number(s?.id) !== a.records.length)
                    throw new r(`La importación no conservó los folios esperados.`, 409);
                break;
            }
            case `importLegacyOrders`: {
                if (!Array.isArray(a.records) || a.records.length < 1 || a.records.length > 100)
                    throw new r(`Envía entre 1 y 100 órdenes antiguas.`);
                let e = new Set, t = [], n = [];
                for (let i of a.records) {
                    if (!i || typeof i != `object` || Array.isArray(i))
                        throw new r(`Una orden antigua no es válida.`);
                    let a = i, o = v(a.orderNumber, `folio anterior`, 12, !0), s = v(a.orderDate, `fecha anterior`, 10, !0), u = v(a.clientName, `cliente`, 220, !0);
                    if (!/^\d{4,8}$/.test(o) || e.has(o))
                        throw new r(`Folio anterior duplicado o inválido: ${o}.`);
                    if (e.add(o), !/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + `T12:00:00-07:00`)) || new Date(s + `T12:00:00-07:00`).toISOString().slice(0, 10) !== s)
                        throw new r(`Fecha inválida del folio ${o}.`);
                    let d = u.split(/\s+/), f = d.shift(), p = d.join(` `);
                    if (!p || f.length > 100 || p.length > 100)
                        throw new r(`Revisa el nombre del folio ${o}.`);
                    let m = v(a.phone, `teléfono original`, 40, !0), h = v(a.brand, `marca`, 80, !0), g = v(a.model, `modelo`, 100, !0), _ = v(a.device, `tipo de equipo`, 100), b = v(a.fault, `problema`, 3e3), x = v(a.operation, `reparación`, 150), S = v(a.comments, `comentarios`, 3e3), C = v(a.status, `estado anterior`, 30, !0);
                    if (C !== `pending`)
                        throw new r(`Estado anterior desconocido en ${o}.`);
                    let w = y(a.price, `precio`), T = y(a.advance, `anticipo`), E = y(a.balance, `saldo`);
                    if (w - T !== E)
                        throw new r(`El saldo no cuadra en el folio ${o}.`);
                    let D = [_ ? `Tipo de equipo anterior: ${_}` : ``, [`xxx`, `xx`].includes(S.toLowerCase()) ? `` : S].filter(Boolean).join(`
`), O = s + `T12:00:00-07:00`, k = `legacy-edge-` + o;
                    n.push(t.length), t.push(c.prepare(`INSERT INTO orders (creation_key,created_at,updated_at,first_name,last_name,phone,brand,model,problem,repair_type,notes,currency,service_cents,parts_cents,review_cents,review_usd_cents,apply_review,status,legacy_order_number,legacy_order_date,legacy_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,500,0,'nueva',?,?,?) ON CONFLICT DO NOTHING`).bind(k, O, l, f, p, m, h, g, b, x, D, `MXN`, w, o, s, C)), T && t.push(c.prepare(`INSERT INTO payments (request_key,order_id,amount_cents,kind,method,notes,created_at) SELECT ?,id,?,'anticipo','otro','Anticipo importado; método y hora no registrados',? FROM orders WHERE legacy_order_number=? ON CONFLICT(request_key) DO NOTHING`).bind(k + `-deposit`, T, O, o));
                }
                let i = await c.batch(t);
                P = n.filter(e => i[e].meta.changes).length;
                await c.prepare(`INSERT INTO customer_devices (creation_key,customer_id,created_at,updated_at) SELECT 'legacy-order-device-'||id,customer_id,created_at,updated_at FROM orders WHERE legacy_order_number IS NOT NULL AND device_id IS NULL ON CONFLICT(creation_key) DO NOTHING`).run();
                await c.prepare(`UPDATE orders SET device_id=(SELECT id FROM customer_devices WHERE creation_key='legacy-order-device-'||orders.id) WHERE legacy_order_number IS NOT NULL AND device_id IS NULL`).run();
                break;
            }
            case `createCustomer`: {
                let fields=customerInput(a.customer || a), result=await c.prepare(`INSERT INTO customers (first_name,last_name,phone,phone_additional,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?) RETURNING id`).bind(...fields,l,l).first();
                N=result.id; break;
            }
            case `updateCustomer`: {
                let id=b(a.id), revision=S(a.revision), fields=customerInput(a.customer || a), result=await c.prepare(`UPDATE customers SET first_name=?,last_name=?,phone=?,phone_additional=?,notes=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?`).bind(...fields,l,id,revision).run();
                if(!result.meta.changes) throw new r(`El perfil cambió o ya no existe. Actualiza y vuelve a intentarlo.`,409); N=id; break;
            }
            case `createReception`: {
                let receptionKey=x(a.requestKey), existing=await c.prepare(`SELECT id,customer_id FROM receptions WHERE creation_key=?`).bind(receptionKey).first();
                if(existing){let rows=await c.prepare(`SELECT id FROM orders WHERE reception_id=? ORDER BY id`).bind(existing.id).all();N=existing.id;P={customerId:Number(existing.customer_id),receptionId:Number(existing.id),orderIds:rows.results.map(row=>Number(row.id))};break;}
                let devices=a.devices;
                if(!Array.isArray(devices)||devices.length<1||devices.length>8)throw new r(`Agrega de 1 a 8 dispositivos a la recepción.`);
                let supplierRows=await c.prepare(`SELECT id FROM suppliers WHERE active=1 AND supplies_parts=1`).all(), supplierIds=new Set(supplierRows.results.map(row=>Number(row.id))), prepared=[];
                for(let index=0;index<devices.length;index++){
                    let device=devices[index];if(!device||typeof device!==`object`||Array.isArray(device))throw new r(`El dispositivo ${index+1} no es válido.`);
                    let deviceType=String(device.deviceType||`movil`);if(![`movil`,`tablet`,`laptop`,`otro`].includes(deviceType))throw new r(`El tipo de dispositivo ${index+1} no es válido.`);
                    let brand=v(device.brand,`marca del dispositivo ${index+1}`,80,!0),model=v(device.model,`modelo del dispositivo ${index+1}`,100,!0),currency=D(device.currency||g.defaultCurrency||`MXN`),repairs=device.repairs;
                    if(!Array.isArray(repairs)||repairs.length<1||repairs.length>20)throw new r(`El dispositivo ${index+1} requiere de 1 a 20 trabajos.`);
                    let parsed=repairs.map(repair=>repairInput(repair,supplierIds)),total=parsed.reduce((sum,repair)=>sum+repair.total,0);if(!Number.isSafeInteger(total)||total<=0||total>1e8)throw new r(`El total del dispositivo ${index+1} debe ser mayor que cero y estar dentro del límite.`);
                    let metadata=M(device),deposit=y(device.deposit,`anticipo del dispositivo ${index+1}`);if(deposit>total)throw new r(`El anticipo del dispositivo ${index+1} supera su total.`);
                    prepared.push({deviceType,brand,model,currency,repairs:parsed,total,metadata,deposit,method:T(device.method||`efectivo`),requestedDeviceId:device.deviceId===null||device.deviceId===void 0||device.deviceId===``?null:b(device.deviceId),problem:parsed.map(line=>line.problem).filter(Boolean).join(`; `).slice(0,3000),repairType:parsed.map(line=>line.repairType).join(` + `).slice(0,150),notes:v(device.notes,`notas del dispositivo`,5000)});
                }
                if((a.customerId===void 0||a.customerId===null||a.customerId===``)&&prepared.some(device=>device.requestedDeviceId))throw new r(`Para reutilizar un equipo anterior, primero selecciona su perfil de cliente.`,409);
                let customerId,createdCustomer=false,profile;
                if(a.customerId!==undefined&&a.customerId!==null&&a.customerId!==``){customerId=b(a.customerId);profile=await c.prepare(`SELECT * FROM customers WHERE id=?`).bind(customerId).first();if(!profile)throw new r(`El perfil de cliente no existe.`,404);}
                else{let fields=customerInput(a.customer),inserted=await c.prepare(`INSERT INTO customers (first_name,last_name,phone,phone_additional,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?) RETURNING id`).bind(...fields,l,l).first();customerId=Number(inserted.id);createdCustomer=true;profile={first_name:fields[0],last_name:fields[1],phone:fields[2]};}
                for(const device of prepared)if(device.requestedDeviceId&&!await c.prepare(`SELECT id FROM customer_devices WHERE id=? AND customer_id=?`).bind(device.requestedDeviceId,customerId).first())throw new r(`El equipo elegido no pertenece al cliente seleccionado. Vuelve a elegirlo.`,409);
                let receptionNotes=v(a.notes,`notas de recepción`,2000),receipt=await c.prepare(`INSERT INTO receptions (creation_key,customer_id,notes,created_at,updated_at) VALUES (?,?,?,?,?) RETURNING id`).bind(receptionKey,customerId,receptionNotes,l,l).first(),receptionId=Number(receipt.id),statements=[],orderSlots=[];
                for(let index=0;index<prepared.length;index++){
                    let device=prepared[index],orderKey=`${receptionKey}-d${index+1}`,deviceKey=`${orderKey}-device`,meta=device.metadata,first=device.repairs[0],services=device.repairs.reduce((sum,line)=>sum+line.serviceCents,0),parts=device.repairs.reduce((sum,line)=>sum+line.partsCents,0),reviews=device.repairs.reduce((sum,line)=>sum+line.reviewCents,0),columns=`creation_key,created_at,updated_at,first_name,last_name,phone,brand,model,problem,repair_type,notes,currency,service_cents,parts_cents,review_cents,review_usd_cents,apply_review,exchange_rate,status,customer_id,reception_id,device_type,imei,unlock_code,accessories_left,physical_condition,promised_date,technician,warranty_days,delivered_at,cancel_reason,device_id`,values=[orderKey,l,l,profile.first_name,profile.last_name,profile.phone,device.brand,device.model,device.problem||first.problem,device.repairType,device.notes,device.currency,services,parts,reviews,Number(g.reviewUsdCents||500),0,g.exchangeRate,`nueva`,customerId,receptionId,device.deviceType,...meta,device.requestedDeviceId];
                    if(!device.requestedDeviceId)statements.push(c.prepare(`INSERT INTO customer_devices (creation_key,customer_id,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(creation_key) DO NOTHING`).bind(deviceKey,customerId,l,l));
                    orderSlots.push(statements.length);statements.push(c.prepare(`INSERT INTO orders (${columns}) VALUES (${values.slice(0,-1).map(()=>`?`).join(`,`)},COALESCE(?,(SELECT id FROM customer_devices WHERE creation_key=?))) RETURNING id`).bind(...values,deviceKey));
                    for(let position=0;position<device.repairs.length;position++){
                        let line=device.repairs[position];statements.push(c.prepare(`INSERT INTO order_repairs (order_id,position,repair_type,problem,diagnosis,solution,notes,service_cents,parts_cents,review_cents,part_name,part_cost_cents,supplier_id,supplier_name,created_at,updated_at) SELECT id,?::integer,?::text,?::text,?::text,?::text,?::text,?::integer,?::integer,?::integer,?::text,?::integer,?::integer,?::text,?::text,?::text FROM orders WHERE creation_key=?::text`).bind(position,line.repairType,line.problem,line.diagnosis,line.solution,line.notes,line.serviceCents,line.partsCents,line.reviewCents,line.partName,line.partCostCents,line.supplierId,line.supplierName,l,l,orderKey));
                        if(line.partName)statements.push(c.prepare(`INSERT INTO part_requests (order_id,repair_id,name,status,internal_cost_cents,supplier,created_at,updated_at) SELECT o.id,r.id,?,'por_verificar',?,?,?,? FROM orders o JOIN order_repairs r ON r.order_id=o.id AND r.position=? WHERE o.creation_key=?`).bind(line.partName,line.partCostCents,line.supplierName,l,l,position,orderKey));
                        if(line.requestQuote){statements.push(c.prepare(`INSERT INTO price_requests (part_request_id,repair_id,brand,model,part_name,status,notes,created_at,updated_at) SELECT (SELECT id FROM part_requests WHERE repair_id=r.id ORDER BY id DESC LIMIT 1),r.id,o.brand,o.model,?,'pendiente','',?,? FROM orders o JOIN order_repairs r ON r.order_id=o.id AND r.position=? WHERE o.creation_key=?`).bind(line.partName,l,l,position,orderKey));statements.push(c.prepare(`INSERT INTO price_request_suppliers (price_request_id,supplier_id,status,created_at) SELECT (SELECT id FROM price_requests WHERE repair_id=r.id ORDER BY id DESC LIMIT 1),s.id,'pendiente',? FROM suppliers s JOIN order_repairs r ON r.position=? JOIN orders o ON o.id=r.order_id WHERE o.creation_key=? AND s.id IN (${line.quoteSupplierIds.map(()=>`?`).join(`,`)})`).bind(l,position,orderKey,...line.quoteSupplierIds));}
                    }
                    if(device.deposit)statements.push(c.prepare(`INSERT INTO payments (request_key,order_id,amount_cents,kind,method,notes,created_at) SELECT ?,id,?,'anticipo',?,'Anticipo al recibir el equipo',? FROM orders WHERE creation_key=?`).bind(orderKey+`-deposit`,device.deposit,device.method,l,orderKey));
                }
                try{let results=await c.batch(statements);P={customerId,receptionId,orderIds:orderSlots.map(slot=>Number(results[slot].results[0].id))};}
                catch(error){await c.prepare(`DELETE FROM receptions WHERE id=?`).bind(receptionId).run();await c.prepare(`DELETE FROM customer_devices WHERE creation_key LIKE ?`).bind(`${receptionKey}-d%-device`).run();if(createdCustomer)await c.prepare(`DELETE FROM customers WHERE id=? AND NOT EXISTS(SELECT 1 FROM orders WHERE customer_id=?) AND NOT EXISTS(SELECT 1 FROM receptions WHERE customer_id=?)`).bind(customerId,customerId,customerId).run();throw error;}
                N=receptionId;break;
            }
            case `createOrder`:
            case `createQuote`: {
                let e = a.action === `createOrder`, t = e ? `orders` : `quotes`, n = x(a.requestKey), i = await c.prepare(`SELECT id FROM ${t} WHERE creation_key=?`).bind(n).first();
                if (i) {
                    N = i.id;
                    break;
                }
                let o = j(a, g), u = e ? M(a) : [], d = e ? y(a.deposit, `anticipo`) : 0, customerId = e && a.customerId !== void 0 && a.customerId !== null && a.customerId !== `` ? b(a.customerId) : null, selectedDeviceId=e&&a.deviceId!==void 0&&a.deviceId!==null&&a.deviceId!==``?b(a.deviceId):null;
                if (customerId && !await c.prepare(`SELECT id FROM customers WHERE id=?`).bind(customerId).first()) throw new r(`El perfil seleccionado ya no existe. Actualiza los datos.`, 409);
                if(selectedDeviceId&&(!customerId||!await c.prepare(`SELECT id FROM customer_devices WHERE id=? AND customer_id=?`).bind(selectedDeviceId,customerId).first()))throw new r(`El equipo elegido no pertenece al cliente seleccionado. Vuelve a elegirlo.`,409);
                if (d > o.total)
                    throw new r(`El anticipo no puede superar el total.`);
                let f = e ? v(a.requiredPart, `refacción requerida`, 150) : ``, p = e ? C(a.status || `nueva`) : null, deviceKey=n+`-device`, m = [n, l, l, ...o.values, ...e ? [p] : [], ...u, ...e ? [customerId,selectedDeviceId] : []], h = e ? `INSERT INTO orders (${s},status,imei,unlock_code,accessories_left,physical_condition,promised_date,technician,warranty_days,delivered_at,cancel_reason,customer_id,device_id) VALUES (${m.slice(0,-1).map(() => `?`).join(`,`)},COALESCE(?,(SELECT id FROM customer_devices WHERE creation_key=?))) ON CONFLICT(creation_key) DO NOTHING RETURNING id` : `INSERT INTO quotes (${s}) VALUES (${m.map(() => `?`).join(`,`)}) ON CONFLICT(creation_key) DO NOTHING RETURNING id`, statements = [];
                if(e&&!selectedDeviceId)statements.push(c.prepare(`INSERT INTO customer_devices (creation_key,customer_id,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(creation_key) DO NOTHING`).bind(deviceKey,customerId,l,l));
                statements.push(c.prepare(h).bind(...m,...e?[deviceKey]:[]));
                let quoteRequested = e && a.requestQuote === true, quoteSupplierIds = quoteRequested ? [...new Set((Array.isArray(a.quoteSupplierIds) ? a.quoteSupplierIds : []).map(b))] : [];
                if (quoteRequested && (!f || !quoteSupplierIds.length)) throw new r(`Indica la refacción y elige al menos un proveedor para solicitar precio.`);
                if (quoteSupplierIds.length > 30) throw new r(`Selecciona hasta 30 proveedores.`);
                if (quoteSupplierIds.length) {
                    let activeSupplierIds = (await c.prepare(`SELECT id FROM suppliers WHERE active=1 AND supplies_parts=1 AND id IN (${quoteSupplierIds.map(() => `?`).join(`,`)})`).bind(...quoteSupplierIds).all()).results.map(row => Number(row.id));
                    if (activeSupplierIds.length !== quoteSupplierIds.length) throw new r(`Uno o más proveedores ya no están activos o clasificados para refacciones. Actualiza la pantalla.`, 409);
                }
                if (d > 0) statements.push(c.prepare(`INSERT INTO payments (request_key,order_id,amount_cents,kind,method,notes,created_at) SELECT ?,id,?,'anticipo',?,'Anticipo al recibir el equipo',? FROM orders WHERE creation_key=? ON CONFLICT(request_key) DO NOTHING`).bind(n + `-deposit`, d, T(a.method || `efectivo`), l, n));
                if (f) statements.push(c.prepare(`INSERT INTO part_requests (order_id,name,status,created_at,updated_at) SELECT o.id,?,'por_verificar',?,? FROM orders o WHERE o.creation_key=? AND NOT EXISTS(SELECT 1 FROM part_requests WHERE order_id=o.id AND repair_id IS NULL)`).bind(f, l, l, n));
                if (quoteRequested) {
                    statements.push(c.prepare(`INSERT INTO price_requests (part_request_id,repair_id,quote_id,brand,model,part_name,status,notes,created_at,updated_at) SELECT pr.id,NULL,NULL,o.brand,o.model,?,'pendiente','',?,? FROM orders o JOIN part_requests pr ON pr.order_id=o.id AND pr.repair_id IS NULL WHERE o.creation_key=?`).bind(f, l, l, n));
                    statements.push(c.prepare(`INSERT INTO price_request_suppliers (price_request_id,supplier_id,status,created_at) SELECT prq.id,s.id,'pendiente',? FROM price_requests prq JOIN part_requests pr ON pr.id=prq.part_request_id JOIN orders o ON o.id=pr.order_id CROSS JOIN suppliers s WHERE o.creation_key=? AND prq.created_at=? AND prq.part_name=? AND s.active=1 AND s.supplies_parts=1 AND s.id IN (${quoteSupplierIds.map(() => `?`).join(`,`)})`).bind(l, n, l, f, ...quoteSupplierIds));
                }
                try{N = (await c.batch(statements))[e&&!selectedDeviceId?1:0].results[0]?.id ?? (await c.prepare(`SELECT id FROM ${t} WHERE creation_key=?`).bind(n).first())?.id;}catch(error){if(e&&!selectedDeviceId)await c.prepare(`DELETE FROM customer_devices WHERE creation_key=?`).bind(deviceKey).run();throw error;}
                if (!e && N) {
                    let q = a.validUntil ? v(a.validUntil, `vigencia del presupuesto`, 10, !0) : new Date(Date.now() + Number(g.quoteValidDays || 7) * 864e5).toISOString().slice(0, 10);
                    await c.prepare(`UPDATE quotes SET valid_until=? WHERE id=?`).bind(q, N).run();
                }
                break;
            }
            case `updateOrder`:
            case `updateQuote`: {
                let e = a.action === `updateOrder`, t = e ? `orders` : `quotes`, n = b(a.id), i = S(a.revision), o = await c.prepare(`SELECT * FROM ${t} WHERE id=?`).bind(n).first();
                if (!o)
                    throw new r(`El registro ya no existe.`, 404);
                let s = j(a, g, o), u = e ? M(a, o) : [], d = e ? Number((await c.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS paid FROM payments WHERE order_id=?`).bind(n).first())?.paid || 0) : 0;
                if (d > 0 && o.currency !== s.currency)
                    throw new r(`No se puede cambiar la moneda de una orden con pagos.`);
                if (s.total < d)
                    throw new r(`El nuevo total no puede ser menor que lo cobrado.`);
                if (e && o.currency !== s.currency) {
                    let e = await c.prepare(`SELECT internal_cost_cents FROM part_requests WHERE order_id=?`).bind(n).first();
                    if (e?.internal_cost_cents !== null && e?.internal_cost_cents !== void 0)
                        throw new r(`No se puede cambiar la moneda de una orden con costo interno de refacción.`);
                }
                let f = `first_name=?,last_name=?,phone=?,brand=?,model=?,problem=?,repair_type=?,notes=?,currency=?,service_cents=?,parts_cents=?,review_cents=?,review_usd_cents=?,apply_review=?,exchange_rate=?` + (e ? `,imei=?,unlock_code=?,accessories_left=?,physical_condition=?,promised_date=?,technician=?,warranty_days=?,delivered_at=?,cancel_reason=?` : ``), p = e ? ` AND ? >= COALESCE((SELECT SUM(amount_cents) FROM payments WHERE order_id=orders.id),0) AND (currency=? OR NOT EXISTS(SELECT 1 FROM payments WHERE order_id=orders.id))` : ` AND NOT EXISTS(SELECT 1 FROM orders WHERE quote_id=quotes.id)`, m = e ? C(a.status ?? o.status) : null;
                if (!(await c.prepare(`UPDATE ${t} SET ${f},updated_at=?,revision=revision+1${e ? `,status=?` : ``} WHERE id=? AND revision=?${p}`).bind(...s.values, ...u, l, ...e ? [m] : [], n, i, ...e ? [s.total, s.currency] : []).run()).meta.changes)
                    throw new r(`El registro cambió o el presupuesto ya se convirtió. Actualiza la lista y vuelve a intentarlo.`, 409);
                N = n;
                break;
            }
            case `resolveOrder`: {
                let orderId=b(a.orderId),requestKey=x(a.requestKey),reason=v(a.reason,`motivo de cancelación`,500,!0),refundCents=E(a.refundCents??0,`devolución`,1e8),refundMethod=refundCents?T(a.refundMethod):null,refundKey=requestKey+`-refund`;
                let existing=await c.prepare(`SELECT * FROM order_resolutions WHERE request_key=?`).bind(requestKey).first();
                if(existing){
                    let refund=await c.prepare(`SELECT * FROM order_resolutions WHERE request_key=?`).bind(refundKey).first();
                    if(Number(existing.order_id)!==orderId||existing.kind!==`cancel`||existing.reason!==reason|| (refundCents===0?!!refund:!refund||refund.kind!==`refund`||Number(refund.order_id)!==orderId||Number(refund.amount_cents)!==refundCents||refund.method!==refundMethod||refund.reason!==reason))throw new r(`La clave de operación ya se utilizó con otros datos.`,409);
                    N=orderId;P={resolutionId:Number(existing.id),refundId:refund?Number(refund.id):null};break;
                }
                let order=await c.prepare(`SELECT id,status,currency,revision FROM orders WHERE id=?`).bind(orderId).first();
                if(!order)throw new r(`La orden no existe.`,404);
                if(order.status===`cancelada`)throw new r(`La orden ya está cancelada. Actualiza antes de continuar.`,409);
                if(a.revision!==void 0&&Number(order.revision)!==S(a.revision))throw new r(`La orden cambió. Actualiza antes de continuar.`,409);
                let collected=Number((await c.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS collected FROM payments WHERE order_id=? AND voided_at IS NULL AND kind<>'ajuste_historico'`).bind(orderId).first())?.collected||0),alreadyRefunded=Number((await c.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS refunded FROM order_resolutions WHERE order_id=? AND kind='refund'`).bind(orderId).first())?.refunded||0),available=collected-alreadyRefunded;
                if(refundCents>available)throw new r(`La devolución supera el neto cobrado disponible (${Math.max(0,available)} centavos).`,409);
                let statements=[
                    c.prepare(`INSERT INTO order_resolutions (request_key,order_id,payment_id,kind,amount_cents,currency,method,reason,created_at) SELECT ?,id,NULL,'cancel',0,currency,NULL,?,? FROM orders WHERE id=? AND status<>'cancelada' ON CONFLICT(request_key) DO NOTHING`).bind(requestKey,reason,l,orderId),
                    c.prepare(`UPDATE orders SET status='cancelada',cancel_reason=?,updated_at=?,revision=revision+1 WHERE id=? AND status<>'cancelada'`).bind(reason,l,orderId),
                    c.prepare(`UPDATE part_requests SET status='cancelada',updated_at=?,revision=revision+1 WHERE order_id=? AND status<>'instalada'`).bind(l,orderId),
                    c.prepare(`UPDATE price_requests SET status='cancelada',closed_at=?,updated_at=? WHERE status='pendiente' AND (repair_id IN (SELECT id FROM order_repairs WHERE order_id=?) OR part_request_id IN (SELECT id FROM part_requests WHERE order_id=?))`).bind(l,l,orderId,orderId)
                ];
                if(refundCents)statements.push(c.prepare(`INSERT INTO order_resolutions (request_key,order_id,payment_id,kind,amount_cents,currency,method,reason,created_at) SELECT ?,id,NULL,'refund',?,currency,?,?,? FROM orders WHERE id=? AND status='cancelada' AND EXISTS(SELECT 1 FROM order_resolutions WHERE request_key=? AND order_id=orders.id AND kind='cancel') ON CONFLICT(request_key) DO NOTHING`).bind(refundKey,refundCents,refundMethod,reason,l,orderId,requestKey));
                statements.push(c.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at) SELECT 'order',id,'cancel',?,? FROM orders WHERE id=? AND status='cancelada' AND EXISTS(SELECT 1 FROM order_resolutions WHERE request_key=? AND order_id=orders.id AND kind='cancel')`).bind(refundCents?`Cancelación; devolución ${refundCents} centavos por ${refundMethod}`:`Cancelación sin devolución`,l,orderId,requestKey));
                let results=await c.batch(statements);
                if(!Number(results[0]?.meta?.changes||0))throw new r(`La orden cambió o ya fue cancelada. Actualiza antes de continuar.`,409);
                N=orderId;P={resolutionId:Number((await c.prepare(`SELECT id FROM order_resolutions WHERE request_key=?`).bind(requestKey).first())?.id),refundId:refundCents?Number((await c.prepare(`SELECT id FROM order_resolutions WHERE request_key=?`).bind(refundKey).first())?.id):null};
                break;
            }
            case `createWarrantyClaim`: {
                let orderId=b(a.orderId),requestKey=x(a.requestKey),reason=v(a.reason,`motivo del reclamo`,2000,!0),status=v(a.status,`estado del seguimiento`,30,!0),outcome=v(a.outcome,`resultado del seguimiento`,2000);
                if(![`recibida`,`en_revision`,`esperando_pieza`,`resuelta`,`cerrada`].includes(status))throw new r(`Estado del seguimiento de garantía inválido.`);
                if((status===`resuelta`||status===`cerrada`)&&!outcome.trim())throw new r(`Registra el resultado o la solución antes de cerrar el seguimiento.`);
                let old=await c.prepare(`SELECT * FROM warranty_claims WHERE request_key=?`).bind(requestKey).first();
                if(old){if(Number(old.order_id)!==orderId||old.reason!==reason||old.status!==status||old.outcome!==outcome)throw new r(`La clave de operación ya se utilizó con otros datos.`,409);N=Number(old.id);break;}
                if(!await c.prepare(`SELECT id FROM orders WHERE id=?`).bind(orderId).first())throw new r(`La orden no existe.`,404);
                let inserted=await c.prepare(`INSERT INTO warranty_claims (request_key,order_id,reason,status,outcome,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING RETURNING id`).bind(requestKey,orderId,reason,status,outcome,l,l).first();
                if(!inserted){let raced=await c.prepare(`SELECT * FROM warranty_claims WHERE request_key=?`).bind(requestKey).first();if(!raced||Number(raced.order_id)!==orderId||raced.reason!==reason||raced.status!==status||raced.outcome!==outcome)throw new r(`La clave de operación ya se utilizó con otros datos.`,409);N=Number(raced.id);break;}
                N=Number(inserted.id);
                await c.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('warranty_claim',?,'create',?,?)`).bind(N,`Orden ${orderId}; estado ${status}`,l).run();
                break;
            }
            case `updateWarrantyClaim`: {
                let claimId=b(a.id),revision=S(a.revision),reason=v(a.reason,`motivo del reclamo`,2000,!0),status=v(a.status,`estado del seguimiento`,30,!0),outcome=v(a.outcome,`resultado del seguimiento`,2000),old=await c.prepare(`SELECT * FROM warranty_claims WHERE id=?`).bind(claimId).first();
                if(!old)throw new r(`El seguimiento de garantía no existe.`,404);
                if(![`recibida`,`en_revision`,`esperando_pieza`,`resuelta`,`cerrada`].includes(status))throw new r(`Estado del seguimiento de garantía inválido.`);
                if((status===`resuelta`||status===`cerrada`)&&!outcome.trim())throw new r(`Registra el resultado o la solución antes de cerrar el seguimiento.`);
                if(Number(old.revision)!==revision)throw new r(`El seguimiento cambió. Actualiza antes de continuar.`,409);
                let result=await c.batch([
                    c.prepare(`UPDATE warranty_claims SET reason=?,status=?,outcome=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?`).bind(reason,status,outcome,l,claimId,revision),
                    c.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at) SELECT 'warranty_claim',id,'update',?,? FROM warranty_claims WHERE id=? AND revision=? AND updated_at=?`).bind(`Estado ${old.status} → ${status}; ${old.reason===reason?`motivo sin cambios`:`motivo actualizado`}; ${old.outcome===outcome?`resultado sin cambios`:`resultado actualizado`}`,l,claimId,revision+1,l)
                ]);
                if(!result[0]?.meta?.changes)throw new r(`El seguimiento cambió. Actualiza antes de continuar.`,409);
                N=claimId;
                break;
            }
            case `status`: {
                let e = b(a.id), t = C(a.status), n = await c.prepare(`SELECT status,due_cents,revision,cancel_reason FROM (` + u + `) WHERE id=?`).bind(e).first();
                if (!n)
                    throw new r(`La orden no existe.`, 404);
                let i = String(n.status);
                if (!(i === t || !(i === `entregada` || i === `cancelada`)) && !a.reopen)
                    throw new r(`Una orden entregada o cancelada requiere confirmación para reabrirse.`, 409);
                if (t === `entregada` && i !== `terminada`)
                    throw new r(`Solo una orden lista para entregar puede marcarse como entregada.`);
                if (t === `entregada` && Number(n.due_cents) > 0 && a.allowDebt !== !0)
                    throw new r(`La orden tiene adeudo. Confirma la entrega con allowDebt.`, 409);
                let o = t === `cancelada` ? v(a.cancelReason, `motivo de cancelación`, 500, !0) : String(n.cancel_reason || ``);
                let updateStmt = c.prepare(`UPDATE orders SET status=?,cancel_reason=?,delivered_at=CASE WHEN ?='entregada' THEN ? ELSE delivered_at END,updated_at=?,revision=revision+1 WHERE id=? AND revision=?`).bind(t, o, t, t === `entregada` ? l : null, l, e, S(a.revision)), auditStmt = t === `cancelada` ? c.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES (?,?,?,?,?)`).bind(`order`, e, `cancel`, o, l) : null, cancelPartsStmt = t === `cancelada` ? c.prepare(`UPDATE part_requests SET status='cancelada',updated_at=?,revision=revision+1 WHERE order_id=? AND status<>'instalada'`).bind(l,e) : null, cancelPriceRequestsStmt = t === `cancelada` ? c.prepare(`UPDATE price_requests SET status='cancelada',closed_at=?,updated_at=? WHERE status='pendiente' AND (repair_id IN (SELECT id FROM order_repairs WHERE order_id=?) OR part_request_id IN (SELECT id FROM part_requests WHERE order_id=?))`).bind(l,l,e,e) : null, statements = [updateStmt, ...(cancelPartsStmt ? [cancelPartsStmt] : []), ...(cancelPriceRequestsStmt ? [cancelPriceRequestsStmt] : []), ...(auditStmt ? [auditStmt] : [])], results = await c.batch(statements);
                if (!results[0]?.meta?.changes)
                    throw new r(`La orden cambió. Actualiza la lista antes de continuar.`, 409);
                N = e;
                break;
            }
            case `addPart`: {
                let e = b(a.id), t = v(a.name, `refacción requerida`, 150, !0), n = S(a.revision), repairId=a.repairId===null||a.repairId===void 0||a.repairId===``?null:b(a.repairId);
                if (!(await c.prepare(`INSERT INTO part_requests (order_id,repair_id,name,status,created_at,updated_at) SELECT id,?,?, 'por_verificar',?,? FROM orders WHERE id=? AND revision=? AND (?::integer IS NULL OR EXISTS (SELECT 1 FROM order_repairs WHERE id=? AND order_id=orders.id)) AND (?::integer IS NOT NULL OR NOT EXISTS (SELECT 1 FROM part_requests WHERE order_id=orders.id AND repair_id IS NULL))`).bind(repairId,t,l,l,e,n,repairId,repairId,repairId).run()).meta.changes)
                    throw new r(`La orden cambió, la reparación no corresponde a la orden o ya existe una solicitud general. Actualiza antes de continuar.`, 409);
                N = e;
                break;
            }
            case `updatePart`: {
                let e = b(a.id), t = S(a.revision), n = v(a.name, `refacción requerida`, 150, !0), i = w(a.status), o = i === `solicitada` || i === `disponible` ? y(a.internalCost, `costo interno`) : null;
                if ((i === `solicitada` || i === `disponible`) && (a.internalCost === `` || a.internalCost === void 0 || a.internalCost === null))
                    throw new r(`Captura el costo interno antes de resolver la refacción.`);
                let s = v(a.supplier, `proveedor`, 120), u = v(a.quality, `calidad`, 100), d = v(a.note, `nota de refacción`, 1e3);
                if (!(await c.prepare(`UPDATE part_requests SET name=?,status=?,internal_cost_cents=?,supplier=?,quality=?,note=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?`).bind(n, i, o, s, u, d, l, e, t).run()).meta.changes)
                    throw new r(`La refacción cambió. Actualiza antes de continuar.`, 409);
                N = e;
                break;
            }
            case `convertQuote`: {
                let e = b(a.id), t = S(a.revision), n = x(a.requestKey), i = await c.prepare(`SELECT id FROM orders WHERE quote_id=?`).bind(e).first();
                if (i) {
                    N = i.id;
                    break;
                }
                let o = s.split(`,`).filter(e => ![`creation_key`, `created_at`, `updated_at`].includes(e)).join(`,`),deviceKey=n+`-device`;
                try{let results=await c.batch([c.prepare(`INSERT INTO customer_devices (creation_key,customer_id,created_at,updated_at) VALUES (?,NULL,?,?) ON CONFLICT(creation_key) DO NOTHING`).bind(deviceKey,l,l),c.prepare(`INSERT INTO orders (${s},status,quote_id,device_id) SELECT ?,?,?,${o},'nueva',id,(SELECT id FROM customer_devices WHERE creation_key=?) FROM quotes WHERE id=? AND revision=? ON CONFLICT(quote_id) DO NOTHING RETURNING id`).bind(n,l,l,deviceKey,e,t)]);let insertedId=results[1].results[0]?.id;N=insertedId??(await c.prepare(`SELECT id FROM orders WHERE quote_id=?`).bind(e).first())?.id;if(!insertedId)await c.prepare(`DELETE FROM customer_devices WHERE creation_key=?`).bind(deviceKey).run();}catch(error){await c.prepare(`DELETE FROM customer_devices WHERE creation_key=?`).bind(deviceKey).run();throw error;}
                if (!N){await c.prepare(`DELETE FROM customer_devices WHERE creation_key=?`).bind(deviceKey).run();throw new r(`El presupuesto cambió. Actualiza la lista antes de convertirlo.`, 409);}
                break;
            }
            case `payment`: {
                let e = b(a.id), t = x(a.requestKey), n = y(a.amount, `pago`);
                if (!n)
                    throw new r(`El pago debe ser mayor que cero.`);
                let method = T(a.method), notes = v(a.notes, `nota del pago`, 1e3);
                await c.transaction(async client => {
                    let existing = await c.prepare(`SELECT order_id FROM payments WHERE request_key=?`).bind(t).all(client);
                    if (existing.results[0]) {
                        if (Number(existing.results[0].order_id) !== e)
                            throw new r(`Operación inválida.`, 409);
                        return;
                    }
                    let lockedOrder = await c.prepare(`SELECT id,service_cents,parts_cents,review_cents FROM orders WHERE id=? FOR UPDATE`).bind(e).all(client);
                    let order = lockedOrder.results[0];
                    if (!order)
                        throw new r(`El pago supera el adeudo actual o la orden no existe. Actualiza la lista.`, 409);
                    existing = await c.prepare(`SELECT order_id FROM payments WHERE request_key=?`).bind(t).all(client);
                    if (existing.results[0]) {
                        if (Number(existing.results[0].order_id) !== e)
                            throw new r(`Operación inválida.`, 409);
                        return;
                    }
                    let paid = await c.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS paid_cents FROM payments WHERE order_id=? AND voided_at IS NULL`).bind(e).all(client);
                    let due = Number(order.service_cents) + Number(order.parts_cents) + Number(order.review_cents) - Number(paid.results[0]?.paid_cents || 0);
                    if (n > due)
                        throw new r(`El pago supera el adeudo actual o la orden no existe. Actualiza la lista.`, 409);
                    let inserted = await c.prepare(`INSERT INTO payments (request_key,order_id,amount_cents,kind,method,notes,created_at) VALUES (?,?,?,'pago',?,?,?) ON CONFLICT(request_key) DO NOTHING RETURNING id`).bind(t, e, n, method, notes, l).all(client);
                    if (!inserted.results[0]) {
                        existing = await c.prepare(`SELECT order_id FROM payments WHERE request_key=?`).bind(t).all(client);
                        if (Number(existing.results[0]?.order_id) !== e)
                            throw new r(`Operación inválida.`, 409);
                    }
                });
                N = e;
                break;
            }
            case `createProduct`:
            case `updateProduct`: {
                let e = v(a.name, `nombre del accesorio`, 120, !0), t = v(a.sku, `código o SKU`, 80), n = v(a.category, `categoría`, 80), g = v(a.glassCompatibility, `compatibilidad`, 1000), i = a.price === `` || a.price === null || a.price === void 0 ? null : y(a.price, `precio`), o = a.cost === `` || a.cost === null || a.cost === void 0 ? null : y(a.cost, `costo`), s = a.stock === `` || a.stock === null || a.stock === void 0 ? null : E(a.stock, `existencia`), minimumStock = a.minimumStock === `` || a.minimumStock === null || a.minimumStock === void 0 ? null : E(a.minimumStock, `stock mínimo`), u = D(a.currency), d = a.active === !1 || a.active === 0 ? 0 : 1, supplierIds=[...new Set((Array.isArray(a.supplierIds)?a.supplierIds:[]).map(b))];
                if (i !== null && i <= 0)
                    throw new r(`El precio debe ser mayor que cero; déjalo vacío si todavía no está definido.`);
                if(supplierIds.length>30)throw new r(`Selecciona como máximo 30 proveedores de accesorios.`);
                if(supplierIds.length){let params=supplierIds.map(()=>`?`).join(`,`),productId=a.action===`updateProduct`?b(a.id):0, matched=(await c.prepare(`SELECT s.id FROM suppliers s WHERE s.id IN (${params}) AND ((s.active=1 AND s.supplies_accessories=1) OR (? > 0 AND EXISTS (SELECT 1 FROM product_suppliers ps WHERE ps.product_id=? AND ps.supplier_id=s.id)))`).bind(...supplierIds,productId,productId).all()).results.map(row=>Number(row.id));if(matched.length!==supplierIds.length)throw new r(`Uno o más proveedores seleccionados no están activos o no están clasificados para accesorios. Actualiza la pantalla.`,409);}
                if (t && await c.prepare(`SELECT id FROM products WHERE lower(sku)=lower(?) AND id<>?`).bind(t, a.action === `updateProduct` ? b(a.id) : 0).first())
                    throw new r(`Ya existe un accesorio con ese código.`, 409);
                N=await c.transaction(async client=>{let productId;if(a.action===`createProduct`){productId=(await c.prepare(`INSERT INTO products (sku,name,category,glass_compatibility,price_cents,cost_cents,currency,stock,minimum_stock,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`).bind(t,e,n,g,i,o,u,s,minimumStock,d,l,l).all(client)).results[0]?.id;}else{productId=b(a.id);if(!(await c.prepare(`UPDATE products SET sku=?,name=?,category=?,glass_compatibility=?,price_cents=?,cost_cents=?,currency=?,stock=?,minimum_stock=?,active=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?`).bind(t,e,n,g,i,o,u,s,minimumStock,d,l,productId,S(a.revision)).run(client)).meta.changes)throw new r(`El accesorio cambió. Actualiza el catálogo.`,409);}await c.prepare(`DELETE FROM product_suppliers WHERE product_id=?`).bind(productId).run(client);for(let supplierId of supplierIds)await c.prepare(`INSERT INTO product_suppliers (product_id,supplier_id,created_at) VALUES (?,?,?)`).bind(productId,supplierId,l).run(client);return productId;});
                break;
            }
            case `createSale`: {
                let e = x(a.requestKey), t = await c.prepare(`SELECT id FROM sales WHERE creation_key=?`).bind(e).first();
                if (t) {
                    N = t.id;
                    break;
                }
                if (!Array.isArray(a.items) || a.items.length > 100)
                    throw new r(`La venta contiene demasiados artículos.`);
                let n = y(a.orderPayment, `pago de orden`), i = n ? b(a.orderId) : null, o = y(a.discount, `descuento`), customerProfileId=a.customerId===null||a.customerId===void 0||a.customerId===``?null:b(a.customerId);
                if(customerProfileId&&!await c.prepare(`SELECT id FROM customers WHERE id=?`).bind(customerProfileId).first())throw new r(`El perfil de cliente no existe.`,404);
                if (!a.items.length && !n)
                    throw new r(`Agrega un accesorio o un pago de orden.`);
                let s = new Map;
                for (let e of a.items) {
                    if (!e || typeof e != `object`)
                        throw new r(`La venta contiene un artículo inválido.`);
                    let t = e, n = b(t.productId), i = E(t.quantity, `cantidad`, 1e3);
                    if (!i)
                        throw new r(`La cantidad debe ser mayor que cero.`);
                    s.set(n, (s.get(n) || 0) + i);
                }
                let d = [...s.keys()], f = d.map(() => `?`).join(`,`), p = d.length ? await c.prepare(`SELECT * FROM products WHERE id IN (${f})`).bind(...d).all() : { results: [] };
                if (p.results.length !== d.length)
                    throw new r(`Uno de los accesorios ya no existe.`, 409);
                if (i && await c.prepare(`SELECT id FROM payments WHERE request_key=?`).bind(e + `-order`).first())
                    throw new r(`Este identificador ya se utilizó en un pago. Intenta otra operación.`, 409);
                let m = ``, h = 0;
                for (let e of p.results) {
                    let t = s.get(Number(e.id));
                    if (!Number(e.active))
                        throw new r(`${e.name} está inactivo.`, 409);
                    if (e.stock === null || e.price_cents === null)
                        throw new r(`${e.name} todavía no está listo para venta: registra precio y existencia contada.`, 409);
                    if (Number(e.stock) < t)
                        throw new r(`No hay suficientes unidades de ${e.name}.`, 409);
                    if (m && m !== e.currency)
                        throw new r(`Los artículos de una venta deben usar la misma moneda.`);
                    m = String(e.currency), h += Number(e.price_cents) * t;
                }
                if (o > h)
                    throw new r(`El descuento no puede superar el subtotal de accesorios.`);
                if (i) {
                    let e = await c.prepare(`${u} WHERE o.id=?`).bind(i).first();
                    if (!e)
                        throw new r(`La orden ya no existe.`, 409);
                    if (m && m !== e.currency)
                        throw new r(`La orden y los accesorios deben usar la misma moneda.`);
                    if (n > Number(e.due_cents))
                        throw new r(`El abono supera el adeudo actual.`, 409);
                    m = String(e.currency), h += n;
                }
                h -= o;
                let g = T(a.method), _ = a.amountReceived === `` || a.amountReceived === void 0 ? h : y(a.amountReceived, `importe recibido`);
                if (_ < h)
                    throw new r(`El importe recibido no cubre el total.`);
                let S = _ - h, C = v(a.notes, `nota de la venta`, 1e3), w = d.length ? `(SELECT COUNT(*) FROM products WHERE id IN (${f}) AND active=1)=? AND NOT EXISTS (SELECT 1 FROM products WHERE ${d.map(() => `(id=? AND (stock<? OR price_cents<>? OR currency<>?))`).join(` OR `)})` : `1=1`, D = i ? `AND EXISTS (SELECT 1 FROM orders o WHERE o.id=? AND o.currency=? AND ?<=o.service_cents+o.parts_cents+o.review_cents-COALESCE((SELECT SUM(amount_cents) FROM payments WHERE order_id=o.id),0))` : ``, O = [c.prepare(`INSERT INTO sales (creation_key,created_at,method,currency,total_cents,amount_received_cents,change_cents,notes,order_id,order_payment_cents,discount_cents,customer_id) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE ${w} ${D} AND (?::integer IS NULL OR EXISTS (SELECT 1 FROM customers WHERE id=?::integer)) AND NOT EXISTS (SELECT 1 FROM sales WHERE creation_key=?)`).bind(e, l, g, m, h, _, S, C, i, n, o, customerProfileId, ...d.length ? [...d, d.length, ...d.flatMap(e => { let t = p.results.find(t => Number(t.id) === e); return [e, s.get(e), t.price_cents, m]; })] : [], ...i ? [i, m, n] : [], customerProfileId, customerProfileId, e)];
                // Serializa ventas mixtas entre instancias para que dos cajas no consuman el mismo saldo o stock.
                O.unshift(c.prepare(`SELECT pg_advisory_xact_lock(1935765091)`));
                if (d.length) {
                    let t = d.map(() => `WHEN ? THEN ?`).join(` `);
                    O.push(c.prepare(`UPDATE products SET stock=stock-CASE id ${t} ELSE 0 END,updated_at=?,revision=revision+1 WHERE id IN (${f}) AND stock>=CASE id ${t} ELSE 0 END AND EXISTS (SELECT 1 FROM sales WHERE creation_key=?) AND NOT EXISTS (SELECT 1 FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.creation_key=?)`).bind(...d.flatMap(e => [e, s.get(e)]), l, ...d, ...d.flatMap(e => [e, s.get(e)]), e, e));
                }
                for (let [t, n] of s)
                    O.push(c.prepare(`INSERT INTO sale_items (sale_id,product_id,product_name,sku,quantity,unit_price_cents,subtotal_cents) SELECT s.id,p.id,p.name,p.sku,?,p.price_cents,p.price_cents*? FROM sales s JOIN products p ON p.id=? WHERE s.creation_key=? AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id=s.id AND product_id=p.id)`).bind(n, n, t, e)), O.push(c.prepare(`INSERT INTO stock_movements (product_id,delta,reason,note,created_at) SELECT ?,?,'venta','Venta '||s.id,? FROM sales s WHERE s.creation_key=?`).bind(t, -n, l, e));
                i && O.push(c.prepare(`INSERT INTO payments (request_key,order_id,amount_cents,kind,method,notes,created_at) SELECT s.creation_key||'-order',s.order_id,s.order_payment_cents,'pago',s.method,'Pago en punto de venta',s.created_at FROM sales s WHERE s.creation_key=?`).bind(e));
                let k;
                try {
                    k = await c.batch(O);
                }
                catch (t) {
                    let r = await c.prepare(`SELECT id,order_id,order_payment_cents,total_cents FROM sales WHERE creation_key=?`).bind(e).first(), a = i ? await c.prepare(`SELECT order_id,amount_cents FROM payments WHERE request_key=?`).bind(e + `-order`).first() : null;
                    if (r?.order_id === i && r?.order_payment_cents === n && r?.total_cents === h && (!i || a?.order_id === i && a?.amount_cents === n)) {
                        N = r.id;
                        break;
                    }
                    throw t;
                }
                if (N = (await c.prepare(`SELECT id FROM sales WHERE creation_key=?`).bind(e).first())?.id, !N)
                    throw new r(`La existencia o el adeudo cambió mientras cobrabas. Actualiza el punto de venta.`, 409);
                if (!k[0].meta.changes) {
                    let e = await c.prepare(`SELECT order_id,order_payment_cents,total_cents FROM sales WHERE id=?`).bind(N).first();
                    if (e?.order_id !== i || e?.order_payment_cents !== n || e?.total_cents !== h)
                        throw new r(`Este identificador ya pertenece a otra venta.`, 409);
                }
                break;
            }
            case `createSupplier`:
            case `updateSupplier`: {
                let e = v(a.name, `proveedor`, 120, !0), t = v(a.phone, `teléfono del proveedor`, 40), n = v(a.notes, `notas del proveedor`, 1e3), suppliesParts = a.suppliesParts === true ? 1 : 0, suppliesAccessories = a.suppliesAccessories === true ? 1 : 0, i = a.active === !1 || a.active === 0 ? 0 : 1;
                if (typeof a.suppliesParts !== `boolean` || typeof a.suppliesAccessories !== `boolean`)
                    throw new r(`Clasifica al proveedor para refacciones, accesorios o ambos.`);
                if (!suppliesParts && !suppliesAccessories)
                    throw new r(`Clasifica al proveedor para refacciones, accesorios o ambos.`);
                if (t && (!/^[+\d\s().-]+$/.test(t) || t.replace(/\D/g, ``).length < 7))
                    throw new r(`Escribe un teléfono válido del proveedor.`);
                if (a.action === `createSupplier`)
                    N = (await c.prepare(`INSERT INTO suppliers (name,phone,notes,supplies_parts,supplies_accessories,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?) RETURNING id`).bind(e, t, n, suppliesParts, suppliesAccessories, i, l, l).all()).results[0]?.id;
                else {
                    let o = b(a.id);
                    if (!(await c.prepare(`UPDATE suppliers SET name=?,phone=?,notes=?,supplies_parts=?,supplies_accessories=?,active=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?`).bind(e, t, n, suppliesParts, suppliesAccessories, i, l, o, S(a.revision)).run()).meta.changes)
                        throw new r(`El proveedor cambió. Actualiza antes de guardar.`, 409);
                    N = o;
                }
                break;
            }
            case `createPartQuote`: {
                let e = b(a.supplierId);
                let supplier = await c.prepare(`SELECT id,active,supplies_parts FROM suppliers WHERE id=?`).bind(e).first();
                if (!supplier?.active || !supplier.supplies_parts)
                    throw new r(`Selecciona un proveedor activo clasificado para refacciones.`, 409);
                let t = a.partRequestId ? b(a.partRequestId) : null, n = v(a.brand, `marca`, 80, !0), i = v(a.model, `modelo`, 100, !0), o = v(a.partName, `refacción`, 150, !0), s = v(a.quality, `calidad`, 100), u = v(a.availability, `disponibilidad`, 30, !0), d = v(a.warranty, `garantía`, 120), f = y(a.cost, `precio del proveedor`), p = a.clientPrice === `` || a.clientPrice === null || a.clientPrice === void 0 ? null : y(a.clientPrice, `precio al cliente`), m = D(a.currency), h = v(a.notes, `notas`, 1e3);
                if (![`por_confirmar`, `disponible`, `agotada`, `bajo_pedido`].includes(u))
                    throw new r(`Disponibilidad inválida.`);
                if (t) {
                    let e = await c.prepare(`SELECT o.currency FROM part_requests pr JOIN orders o ON o.id=pr.order_id WHERE pr.id=?`).bind(t).first();
                    if (!e)
                        throw new r(`La refacción vinculada ya no existe.`, 409);
                    if (e.currency !== m)
                        throw new r(`La cotización vinculada debe usar la moneda de la orden.`);
                }
                N = (await c.prepare(`INSERT INTO part_quotes (supplier_id,part_request_id,brand,model,part_name,quality,availability,warranty,cost_cents,client_price_cents,currency,notes,quoted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`).bind(e, t, n, i, o, s, u, d, f, p, m, h, l).all()).results[0]?.id;
                break;
            }
            case `createSupplierPriceRequest`: {
                let supplierIds=[...new Set((Array.isArray(a.supplierIds)?a.supplierIds:[]).map(b))];
                if(!supplierIds.length||supplierIds.length>30)throw new r(`Selecciona de 1 a 30 proveedores.`);
                let active=(await c.prepare(`SELECT id FROM suppliers WHERE active=1 AND supplies_parts=1 AND id IN (${supplierIds.map(()=>`?`).join(`,`)})`).bind(...supplierIds).all()).results.map(row=>Number(row.id));
                if(active.length!==supplierIds.length)throw new r(`Uno o más proveedores ya no están activos o clasificados para refacciones. Actualiza la pantalla.`,409);
                let partRequestId=null,repairId=null,quoteId=null,brand,model,partName,notes=v(a.notes,`instrucciones`,1000);
                if(a.quoteId){quoteId=b(a.quoteId);let q=await c.prepare(`SELECT brand,model,repair_type FROM quotes WHERE id=? AND NOT EXISTS(SELECT 1 FROM orders WHERE quote_id=quotes.id)`).bind(quoteId).first();if(!q)throw new r(`El presupuesto no existe o ya fue convertido.`,409);brand=q.brand;model=q.model;partName=v(a.partName,`refacción`,150,!0);}
                else {repairId=b(a.repairId);let repair=await c.prepare(`SELECT r.id,r.part_name,o.id AS order_id,o.brand,o.model,o.status FROM order_repairs r JOIN orders o ON o.id=r.order_id WHERE r.id=?`).bind(repairId).first();if(!repair||[`cancelada`,`entregada`].includes(repair.status))throw new r(`La reparación ya no admite solicitudes.`,409);partName=v(a.partName||repair.part_name,`refacción`,150,!0);brand=repair.brand;model=repair.model;let pr=await c.prepare(`SELECT id FROM part_requests WHERE repair_id=? ORDER BY id DESC LIMIT 1`).bind(repairId).first();if(pr)partRequestId=Number(pr.id);else{let created=await c.prepare(`INSERT INTO part_requests (order_id,repair_id,name,status,created_at,updated_at) VALUES (?,?,?,'por_verificar',?,?) RETURNING id`).bind(Number(repair.order_id),repairId,partName,l,l).first();partRequestId=Number(created.id);}}
                let created=await c.prepare(`INSERT INTO price_requests (part_request_id,repair_id,quote_id,brand,model,part_name,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,'pendiente',?,?,?) RETURNING id`).bind(partRequestId,repairId,quoteId,brand,model,partName,notes,l,l).first();N=Number(created.id);
                await c.batch(supplierIds.map(supplierId=>c.prepare(`INSERT INTO price_request_suppliers (price_request_id,supplier_id,status,created_at) VALUES (?,?, 'pendiente',?)`).bind(N,supplierId,l)));
                break;
            }
            case `receiveSupplierResponse`: {
                let requestKey=x(a.requestKey), existing=await c.prepare(`SELECT id FROM supplier_responses WHERE request_key=?`).bind(requestKey).first();if(existing){N=Number(existing.id);break;}
                let associationId=b(a.priceRequestSupplierId),association=await c.prepare(`SELECT prs.status AS supplier_status,pr.status AS request_status FROM price_request_suppliers prs JOIN price_requests pr ON pr.id=prs.price_request_id WHERE prs.id=?`).bind(associationId).first();if(!association)throw new r(`No se encontró la solicitud del proveedor.`,404);
                let original=v(a.originalMessage,`mensaje original`,5000),summary=v(a.technicalSummary,`resumen técnico`,2000),quality=v(a.quality,`calidad`,100),delivery=v(a.deliveryTime,`tiempo de entrega`,120),availability=v(a.availability||`por_confirmar`,`disponibilidad`,30,!0);if(![`por_confirmar`,`disponible`,`agotada`,`bajo_pedido`,`sin_disponibilidad`].includes(availability))throw new r(`Disponibilidad inválida.`);
                let price=a.price===undefined||a.price===null||a.price===``?null:y(a.price,`precio`),shipping=a.shipping===undefined||a.shipping===null||a.shipping===``?null:y(a.shipping,`envío`),receivedAt=v(a.receivedAt||l,`fecha de respuesta`,40,!0),late=[`cerrada`,`cancelada`,`atendida`].includes(association.request_status)||association.supplier_status===`cancelado`;
                let saved=await c.prepare(`INSERT INTO supplier_responses (price_request_supplier_id,request_key,original_message,technical_summary,price_cents,shipping_cents,quality,availability,delivery_time,needs_review,is_late,received_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`).bind(associationId,requestKey,original,summary,price,shipping,quality,availability,delivery, a.needsReview?1:0,late?1:0,receivedAt).first();N=Number(saved.id);
                if(!late)await c.prepare(`UPDATE price_request_suppliers SET status=?,last_message_at=? WHERE id=?`).bind(availability===`sin_disponibilidad`?`sin_disponibilidad`:`respondio`,receivedAt,associationId).run();
                break;
            }
            case `reviewSupplierInboundMessage`: {
                let messageId=b(a.id),inbound=await c.prepare(`SELECT * FROM supplier_inbound_messages WHERE id=?`).bind(messageId).first();
                if(!inbound)throw new r(`No se encontró el mensaje entrante.`,404);
                let decision=v(a.decision,`decisión`,20,!0);if(inbound.status===`linked`&&decision===`accept`||inbound.status===`ignored`&&decision===`ignore`){N=messageId;break;}if([`late`,`linked`,`ignored`].includes(inbound.status))throw new r(`El mensaje ya fue revisado o es tardío.`,409);
                if(decision===`ignore`){await c.prepare(`UPDATE supplier_inbound_messages SET status='ignored',reviewed_at=?,review_reason=? WHERE id=?`).bind(l,v(a.reason||`Ignorado manualmente.`,`motivo`,500),messageId).run();await c.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('supplier_inbound_message',?,'ignored',?,?)`).bind(messageId,`Mensaje entrante ignorado por revisión humana.`,l).run();N=messageId;break;}
                if(decision!==`accept`)throw new r(`Decisión de revisión inválida.`);
                let associationId=b(a.priceRequestSupplierId),association=await c.prepare(`SELECT prs.supplier_id,prs.status AS supplier_status,pr.status AS request_status,pr.id AS price_request_id,o.status AS order_status,im.supplier_id AS inbound_supplier_id,im.correlation_ref AS inbound_correlation_ref FROM price_request_suppliers prs JOIN price_requests pr ON pr.id=prs.price_request_id LEFT JOIN order_repairs repair ON repair.id=pr.repair_id LEFT JOIN orders o ON o.id=repair.order_id JOIN supplier_inbound_messages im ON im.id=? WHERE prs.id=?`).bind(messageId,associationId).first();
                if(!association)throw new r(`No se encontró esa asociación entre proveedor y solicitud.`,404);
                if(association.inbound_supplier_id!==null&&Number(association.inbound_supplier_id)!==Number(association.supplier_id))throw new r(`El proveedor no coincide con el remitente reconocido.`,409);
                if(association.inbound_correlation_ref&&association.inbound_correlation_ref!== (await c.prepare(`SELECT correlation_ref FROM price_request_suppliers WHERE id=?`).bind(associationId).first())?.correlation_ref)throw new r(`La referencia exacta apunta a otra solicitud; no se permite reasignarla.`,409);
                if(association.request_status!==`pendiente`||association.supplier_status===`cancelado`||[`cancelada`,`entregada`].includes(association.order_status))throw new r(`La solicitud o la reparación ya no está activa. La respuesta debe permanecer en historial como tardía.`,409);
                let proposalData=typeof inbound.proposal===`string`?JSON.parse(inbound.proposal):inbound.proposal,sourceIds=Array.isArray(proposalData?.sourceMessageIds)?[...new Set(proposalData.sourceMessageIds.map(Number))]:[];
                if(sourceIds.length>5||sourceIds.some(sourceId=>!Number.isSafeInteger(sourceId)||sourceId<1||sourceId===messageId))throw new r(`Los mensajes fuente de la propuesta no son válidos.`,409);
                let sourceRows=[],waitSetting=await c.prepare(`SELECT quote_response_wait_minutes FROM settings WHERE id=1`).first(),waitMinutes=Number(waitSetting?.quote_response_wait_minutes??20);if(!Number.isInteger(waitMinutes)||waitMinutes<1)waitMinutes=20;waitMinutes=Math.min(waitMinutes,1440);
                for(let sourceId of sourceIds){let source=await c.prepare(`SELECT id,supplier_id,conversation_hash,received_at,original_message,status,candidate_association_ids FROM supplier_inbound_messages WHERE id=?`).bind(sourceId).first();let sourceCandidates=source?.candidate_association_ids;if(typeof sourceCandidates===`string`){try{sourceCandidates=JSON.parse(sourceCandidates)}catch{sourceCandidates=[]}}let elapsed=Date.parse(inbound.received_at)-Date.parse(source?.received_at||``);if(!source||Number(source.supplier_id)!==Number(association.supplier_id)||!inbound.conversation_hash||source.conversation_hash!==inbound.conversation_hash||[`late`,`ignored`,`linked`].includes(source.status)||elapsed<0||elapsed>waitMinutes*60000||!Array.isArray(sourceCandidates)||!sourceCandidates.map(Number).includes(associationId))throw new r(`Un mensaje fuente ya no coincide con esta solicitud o quedó fuera de la ventana de espera.`,409);sourceRows.push(source);}
                let sourceParts=[...sourceRows,{id:messageId,received_at:inbound.received_at,original_message:inbound.original_message}].sort((left,right)=>String(left.received_at).localeCompare(String(right.received_at))),combinedOriginal=sourceParts.map(source=>`[${source.received_at}] ${source.original_message}`).join(`\n`);if(combinedOriginal.length>5000)throw new r(`Los mensajes agrupados exceden el máximo permitido.`,400);
                let offers=Array.isArray(a.offers)?a.offers:[];if(!offers.length||offers.length>8)throw new r(`Confirma de 1 a 8 ofertas estructuradas.`);
                let inserts=[];for(let index=0;index<offers.length;index++){let offer=offers[index];if(!offer||typeof offer!==`object`)throw new r(`Oferta inválida.`);let price=offer.price===undefined||offer.price===null||offer.price===``?null:y(offer.price,`precio`),shipping=offer.shipping===undefined||offer.shipping===null||offer.shipping===``?null:y(offer.shipping,`envío`),quality=v(offer.quality||``,`calidad`,100),availability=v(offer.availability||`por_confirmar`,`disponibilidad`,30,!0),delivery=v(offer.deliveryTime||``,`entrega`,120),summary=v(offer.technicalSummary||``,`resumen`,1000),requestKey=x(offer.requestKey||crypto.randomUUID());if(![`por_confirmar`,`disponible`,`agotada`,`bajo_pedido`,`sin_disponibilidad`].includes(availability))throw new r(`Disponibilidad inválida.`);inserts.push(c.prepare(`INSERT INTO supplier_responses (price_request_supplier_id,inbound_message_id,inbound_offer_index,request_key,original_message,technical_summary,price_cents,shipping_cents,quality,availability,delivery_time,needs_review,is_late,received_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?) ON CONFLICT(inbound_message_id,inbound_offer_index) DO NOTHING`).bind(associationId,messageId,index,requestKey,combinedOriginal,summary,price,shipping,quality,availability,delivery,0,inbound.received_at));}
                let sourceUpdates=sourceRows.flatMap(source=>[c.prepare(`UPDATE supplier_inbound_messages SET status='linked',linked_price_request_supplier_id=?,suggested_price_request_supplier_id=?,reviewed_at=?,review_reason='Fragmento asociado y confirmado junto con otro mensaje.' WHERE id=? AND status NOT IN ('late','ignored','linked')`).bind(associationId,associationId,l,source.id),c.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('supplier_inbound_message',?,'linked',?,?)`).bind(source.id,`Mensaje fragmentario asociado manualmente a la solicitud ${association.price_request_id}.`,l)]);
                await c.batch([...inserts,...sourceUpdates,c.prepare(`UPDATE price_request_suppliers SET status='respondio',last_message_at=? WHERE id=?`).bind(inbound.received_at,associationId),c.prepare(`UPDATE supplier_inbound_messages SET status='linked',linked_price_request_supplier_id=?,suggested_price_request_supplier_id=?,reviewed_at=?,review_reason='Asociado y confirmado por revisión humana.' WHERE id=?`).bind(associationId,associationId,l,messageId),c.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES ('supplier_inbound_message',?,'linked',?,?)`).bind(messageId,`Mensaje asociado manualmente a la solicitud ${association.price_request_id}; ofertas estructuradas confirmadas por persona.`,l)]);
                N=messageId;break;
            }
            case `chooseSupplierResponse`: {
                let requestId=b(a.priceRequestId),responseId=b(a.responseId),offer=await c.prepare(`SELECT sr.price_request_supplier_id,prs.supplier_id,s.name AS supplier_name,sr.price_cents,sr.is_late,pr.status FROM supplier_responses sr JOIN price_request_suppliers prs ON prs.id=sr.price_request_supplier_id JOIN suppliers s ON s.id=prs.supplier_id JOIN price_requests pr ON pr.id=prs.price_request_id WHERE sr.id=? AND pr.id=?`).bind(responseId,requestId).first();if(!offer||offer.price_cents===null||offer.is_late||[`cerrada`,`cancelada`].includes(offer.status))throw new r(`Esta oferta no se puede seleccionar; puede estar incompleta o ser tardía.`,409);
                await c.prepare(`UPDATE price_requests SET selected_supplier_id=?,selected_response_id=?,selected_at=?,status='atendida',closed_at=?,updated_at=? WHERE id=?`).bind(offer.supplier_id,responseId,l,l,l,requestId).run();N=responseId;break;
            }
            case `closeSupplierPriceRequest`: {
                let requestId=b(a.id),status=v(a.status,`estado de la solicitud`,20,!0);if(![`cerrada`,`cancelada`].includes(status))throw new r(`Solo se puede cerrar o cancelar la solicitud.`);let result=await c.prepare(`UPDATE price_requests SET status=?,closed_at=?,updated_at=? WHERE id=? AND status='pendiente'`).bind(status,l,l,requestId).run();if(!result.meta.changes)throw new r(`La solicitud ya fue cerrada o no existe.`,409);N=requestId;break;
            }
            case `setQuoteClientPrice`: {
                let e = b(a.id), t = y(a.clientPrice, `precio al cliente`);
                if (!(await c.prepare(`UPDATE part_quotes SET client_price_cents=?,revision=revision+1 WHERE id=? AND revision=?`).bind(t, e, S(a.revision)).run()).meta.changes)
                    throw new r(`La cotización cambió. Actualiza antes de guardar.`, 409);
                N = e;
                break;
            }
            case `requestPrice`: {
                let e = a.partRequestId ? b(a.partRequestId) : null;
                if (e) {
                    let t = await c.prepare(`SELECT pr.name,o.brand,o.model FROM part_requests pr JOIN orders o ON o.id=pr.order_id WHERE pr.id=?`).bind(e).first();
                    if (!t)
                        throw new r(`La refacción ya no existe.`, 409);
                    let n = await c.prepare(`SELECT id FROM price_requests WHERE part_request_id=? AND status='pendiente'`).bind(e).first();
                    if (n) {
                        N = n.id;
                        break;
                    }
                    N = (await c.prepare(`INSERT INTO price_requests (part_request_id,brand,model,part_name,status,notes,created_at,updated_at) VALUES (?,?,?,?,'pendiente',?,?,?) RETURNING id`).bind(e, t.brand, t.model, t.name, v(a.notes, `notas`, 1e3), l, l).all()).results[0]?.id;
                }
                else {
                    let e = v(a.brand, `marca`, 80, !0), t = v(a.model, `modelo`, 100, !0), n = v(a.partName, `refacción`, 150, !0);
                    N = (await c.prepare(`INSERT INTO price_requests (brand,model,part_name,status,notes,created_at,updated_at) VALUES (?,?,?,'pendiente',?,?,?) RETURNING id`).bind(e, t, n, v(a.notes, `notas`, 1e3), l, l).all()).results[0]?.id;
                }
                break;
            }
            case `resolvePriceRequest`: {
                let e = b(a.id);
                if (!(await c.prepare(`UPDATE price_requests SET status='atendida',updated_at=? WHERE id=? AND status='pendiente'`).bind(l, e).run()).meta.changes && (await c.prepare(`SELECT status FROM price_requests WHERE id=?`).bind(e).first())?.status !== `atendida`)
                    throw new r(`Solicitud no encontrada.`, 404);
                N = e;
                break;
            }
            case `adjustStock`: {
                let e = b(a.productId), t = Number(a.delta), n = v(a.reason, `motivo de ajuste`, 20, !0);
                if (!Number.isInteger(t) || t === 0 || ![`entrada`, `merma`, `ajuste`].includes(n))
                    throw new r(`Ajuste de inventario inválido.`);
                let i = await c.prepare(`SELECT stock FROM products WHERE id=?`).bind(e).first();
                if (!i || i.stock === null && t < 0 || Number(i.stock ?? 0) + t < 0)
                    throw new r(`La existencia no puede quedar negativa.`, 409);
                let o = v(a.note, `nota del ajuste`, 500), s = [c.prepare(`UPDATE products SET stock=COALESCE(stock,0)+?,updated_at=?,revision=revision+1 WHERE id=?`).bind(t, l, e), c.prepare(`INSERT INTO stock_movements (product_id,delta,reason,note,created_at) VALUES (?,?,?,?,?)`).bind(e, t, n, o, l)];
                await c.batch(s), N = e;
                break;
            }
            case `voidPayment`: {
                let e = b(a.id), t = v(a.reason, `motivo de anulación`, 500, !0), n = await c.prepare(`SELECT kind,voided_at FROM payments WHERE id=?`).bind(e).first();
                if (!n)
                    throw new r(`El pago no existe.`, 404);
                if (n.kind === `ajuste_historico`)
                    throw new r(`Las liquidaciones históricas no se pueden anular.`);
                if (n.voided_at)
                    throw new r(`El pago ya está anulado.`, 409);
                if (!(await c.prepare(`UPDATE payments SET voided_at=?,void_reason=? WHERE id=? AND voided_at IS NULL`).bind(l, t, e).run()).meta.changes)
                    throw new r(`El pago cambió. Actualiza antes de continuar.`, 409);
                await c.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES (?,?,?,?,?)`).bind(`payment`, e, `void`, t, l).run(), N = e;
                break;
            }
            case `voidSale`: {
                if (a.confirmation !== `ANULAR`)
                    throw new r(`Escribe ANULAR para confirmar.`);
                let e = b(a.id), t = v(a.reason, `motivo de anulación`, 500, !0), n = await c.prepare(`SELECT order_id,order_payment_cents,voided_at,creation_key FROM sales WHERE id=?`).bind(e).first();
                if (!n)
                    throw new r(`La venta no existe.`, 404);
                if (n.voided_at)
                    throw new r(`La venta ya está anulada.`, 409);
                let i = await c.prepare(`SELECT product_id,quantity FROM sale_items WHERE sale_id=? AND product_id IS NOT NULL`).bind(e).all(), o = [c.prepare(`UPDATE sales SET voided_at=?,void_reason=? WHERE id=? AND voided_at IS NULL`).bind(l, t, e)];
                for (let t of i.results)
                    o.push(c.prepare(`UPDATE products SET stock=stock+?,updated_at=?,revision=revision+1 WHERE id=?`).bind(t.quantity, l, t.product_id)), o.push(c.prepare(`INSERT INTO stock_movements (product_id,delta,reason,note,created_at) VALUES (?,?, 'anulacion',?,?)`).bind(t.product_id, t.quantity, `Venta ${e} anulada`, l));
                n.order_payment_cents > 0 && o.push(c.prepare(`UPDATE payments SET voided_at=?,void_reason=? WHERE request_key=? AND voided_at IS NULL`).bind(l, `Pago anulado junto con la venta`, n.creation_key + `-order`)), o.push(c.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES (?,?,?,?,?)`).bind(`sale`, e, `void`, t, l)), await c.batch(o), N = e;
                break;
            }
            case `restoreBackup`: {
                if (a.confirmation !== `RESTAURAR`)
                    throw new r(`Escribe RESTAURAR para confirmar la restauración.`);
                if (!a.backup || typeof a.backup != `object`)
                    throw new r(`Selecciona un respaldo JSON válido.`);
                try {
                    let snapshot = JSON.stringify(await createBackup(c)), restoreStatements = B(c, a.backup), saveSnapshot = c.prepare(`INSERT INTO restore_snapshots (created_at,payload) VALUES (?,?)`).bind(l, snapshot), trimSnapshots = c.prepare(`DELETE FROM restore_snapshots WHERE id NOT IN (SELECT id FROM restore_snapshots ORDER BY id DESC LIMIT 5)`), auditRestore = c.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at) VALUES (?,?,?,?,?)`).bind(`backup`, 1, `restore`, `Respaldo restaurado; copia previa ${l}`, l);
                    await c.batch([saveSnapshot, trimSnapshots, ...restoreStatements, auditRestore]);
                }
                catch (e) {
                    throw new r(`No se pudo restaurar el respaldo: ${e instanceof Error ? e.message : `formato inválido`}`, 400);
                }
                N = 1;
                break;
            }
            case `createBrand`:
            case `updateBrand`: {
                let e = v(a.name, `marca`, 80, !0), t = a.active === !1 || a.active === 0 ? 0 : 1, n = E(a.sort ?? 0, `orden de marca`, 1e5);
                if (a.action === `createBrand`)
                    N = (await c.prepare(`INSERT INTO brands (name,active,sort) VALUES (?,?,?) RETURNING id`).bind(e, t, n).all()).results[0]?.id;
                else {
                    let i = b(a.id);
                    if (!(await c.prepare(`UPDATE brands SET name=?,active=?,sort=? WHERE id=?`).bind(e, t, n, i).run()).meta.changes)
                        throw new r(`La marca no existe.`, 404);
                    N = i;
                }
                break;
            }
            case `createService`:
            case `updateService`: {
                let e = v(a.name, `servicio`, 120, !0), t = y(a.basePrice ?? a.basePriceCents, `precio base`), n = D(a.currency), i = E(a.warrantyDays ?? 0, `días de garantía`, 3650), o = a.active === !1 || a.active === 0 ? 0 : 1, s = E(a.sort ?? 0, `orden de servicio`, 1e5);
                if (a.action === `createService`)
                    N = (await c.prepare(`INSERT INTO services (name,base_price_cents,currency,warranty_days,active,sort) VALUES (?,?,?,?,?,?) RETURNING id`).bind(e, t, n, i, o, s).all()).results[0]?.id;
                else {
                    let l = b(a.id);
                    if (!(await c.prepare(`UPDATE services SET name=?,base_price_cents=?,currency=?,warranty_days=?,active=?,sort=? WHERE id=?`).bind(e, t, n, i, o, s, l).run()).meta.changes)
                        throw new r(`El servicio no existe.`, 404);
                    N = l;
                }
                break;
            }
            case `updateMethod`: {
                let e = v(a.key, `método`, 40, !0), t = v(a.label, `etiqueta del método`, 80, !0), n = a.active === !1 || a.active === 0 ? 0 : 1, i = E(a.sort ?? 0, `orden de método`, 1e5);
                if (![`efectivo`, `transferencia`, `tarjeta`, `otro`].includes(e))
                    throw new r(`Método de pago inválido.`);
                if (!(await c.prepare(`UPDATE payment_methods SET label=?,active=?,sort=? WHERE key=?`).bind(t, n, i, e).run()).meta.changes)
                    throw new r(`El método no existe.`, 404);
                N = Number((await c.prepare(`SELECT id FROM payment_methods WHERE key=?`).bind(e).first())?.id);
                break;
            }
            case `warrantyTerms`: {
                let terms = v(a.warrantyTerms, `términos de garantía`, 2000);
                await c.prepare(`INSERT OR IGNORE INTO settings (id,revision) VALUES (1,0)`).run();
                let saved = await c.prepare(`UPDATE settings SET warranty_terms=?,revision=revision+1 WHERE id=1 AND revision=?`).bind(terms, S(a.revision)).run();
                if (!saved.meta.changes)
                    throw new r(`La configuración cambió. Actualiza antes de guardar.`, 409);
                N = 1;
                break;
            }
            case `settings`: {
                let e = await d(c), t = v(a.workshopName, `nombre del taller`, 80, !0), n = String(a.defaultCurrency);
                if (![`MXN`, `USD`].includes(n))
                    throw new r(`Moneda inválida.`);
                let i = y(a.reviewUsd, `revisión`), o = a.exchangeRate === `` || a.exchangeRate === null ? null : Number(a.exchangeRate);
                if (o !== null && (!Number.isFinite(o) || o <= 0 || o > 1e3))
                    throw new r(`El tipo de cambio debe ser mayor que cero y menor o igual a 1000.`);
                let wait = Object.hasOwn(a, `quoteResponseWaitMinutes`) ? E(a.quoteResponseWaitMinutes, `ventana de respuesta`, 1440) : e.quoteResponseWaitMinutes;
                if (wait < 1)
                    throw new r(`La ventana debe ser de 1 a 1440 minutos.`);
                let s = Object.hasOwn(a, `logoDataUrl`), l = s ? A(a.logoDataUrl) : null, u = { phone: Object.hasOwn(a, `phone`) ? v(a.phone, `teléfono del taller`, 40) : e.phone, whatsapp: Object.hasOwn(a, `whatsapp`) ? v(a.whatsapp, `WhatsApp del taller`, 40) : e.whatsapp, address: Object.hasOwn(a, `address`) ? v(a.address, `dirección`, 180) : e.address, city: Object.hasOwn(a, `city`) ? v(a.city, `ciudad`, 100) : e.city, timezone: Object.hasOwn(a, `timezone`) ? O(a.timezone) : e.timezone, ticketOrderNote: Object.hasOwn(a, `ticketOrderNote`) ? v(a.ticketOrderNote, `nota del ticket de orden`, 300) : e.ticketOrderNote, ticketPaymentNote: Object.hasOwn(a, `ticketPaymentNote`) ? v(a.ticketPaymentNote, `nota del ticket de pago`, 300) : e.ticketPaymentNote, ticketSaleNote: Object.hasOwn(a, `ticketSaleNote`) ? v(a.ticketSaleNote, `nota del ticket de venta`, 300) : e.ticketSaleNote, waTemplateReady: Object.hasOwn(a, `waTemplateReady`) ? v(a.waTemplateReady, `plantilla de equipo listo`, 500) : e.waTemplateReady, waTemplateQuote: Object.hasOwn(a, `waTemplateQuote`) ? v(a.waTemplateQuote, `plantilla de presupuesto`, 500) : e.waTemplateQuote, waTemplateReminder: Object.hasOwn(a, `waTemplateReminder`) ? v(a.waTemplateReminder, `plantilla de recordatorio`, 500) : e.waTemplateReminder, ticketPaperMm: Object.hasOwn(a, `ticketPaperMm`) ? Number(a.ticketPaperMm) : e.ticketPaperMm, lowStockThreshold: Object.hasOwn(a, `lowStockThreshold`) ? E(a.lowStockThreshold, `umbral de inventario`, 1e3) : e.lowStockThreshold, quoteStaleDays: Object.hasOwn(a, `quoteStaleDays`) ? E(a.quoteStaleDays, `días de presupuesto`, 3650) : e.quoteStaleDays, overdueDays: Object.hasOwn(a, `overdueDays`) ? E(a.overdueDays, `días de adeudo`, 3650) : e.overdueDays, quoteValidDays: Object.hasOwn(a, `quoteValidDays`) ? E(a.quoteValidDays, `días de vigencia`, 3650) : e.quoteValidDays, backupWarningDays: Object.hasOwn(a, `backupWarningDays`) ? E(a.backupWarningDays, `días de aviso de respaldo`, 3650) : e.backupWarningDays, folioPrefixOrder: Object.hasOwn(a, `folioPrefixOrder`) ? k(a.folioPrefixOrder, `prefijo de orden`) : e.folioPrefixOrder, folioPrefixQuote: Object.hasOwn(a, `folioPrefixQuote`) ? k(a.folioPrefixQuote, `prefijo de presupuesto`) : e.folioPrefixQuote, folioPrefixSale: Object.hasOwn(a, `folioPrefixSale`) ? k(a.folioPrefixSale, `prefijo de venta`) : e.folioPrefixSale };
                if (![58, 80].includes(u.ticketPaperMm))
                    throw new r(`El papel del ticket solo puede ser de 58 u 80 mm.`);
                if (!(await c.prepare(`INSERT INTO settings (id,workshop_name,default_currency,review_usd_cents,exchange_rate,logo_data_url,phone,whatsapp,address,city,timezone,ticket_order_note,ticket_payment_note,ticket_sale_note,wa_template_ready,wa_template_quote,wa_template_reminder,ticket_paper_mm,low_stock_threshold,quote_stale_days,overdue_days,quote_valid_days,folio_prefix_order,folio_prefix_quote,folio_prefix_sale,revision) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET workshop_name=excluded.workshop_name,default_currency=excluded.default_currency,review_usd_cents=excluded.review_usd_cents,exchange_rate=excluded.exchange_rate,logo_data_url=CASE WHEN ?=1 THEN excluded.logo_data_url ELSE settings.logo_data_url END,phone=excluded.phone,whatsapp=excluded.whatsapp,address=excluded.address,city=excluded.city,timezone=excluded.timezone,ticket_order_note=excluded.ticket_order_note,ticket_payment_note=excluded.ticket_payment_note,ticket_sale_note=excluded.ticket_sale_note,wa_template_ready=excluded.wa_template_ready,wa_template_quote=excluded.wa_template_quote,wa_template_reminder=excluded.wa_template_reminder,ticket_paper_mm=excluded.ticket_paper_mm,low_stock_threshold=excluded.low_stock_threshold,quote_stale_days=excluded.quote_stale_days,overdue_days=excluded.overdue_days,quote_valid_days=excluded.quote_valid_days,folio_prefix_order=excluded.folio_prefix_order,folio_prefix_quote=excluded.folio_prefix_quote,folio_prefix_sale=excluded.folio_prefix_sale,revision=settings.revision+1 WHERE settings.revision=?`).bind(t, n, i, o, l, u.phone, u.whatsapp, u.address, u.city, u.timezone, u.ticketOrderNote, u.ticketPaymentNote, u.ticketSaleNote, u.waTemplateReady, u.waTemplateQuote, u.waTemplateReminder, u.ticketPaperMm, u.lowStockThreshold, u.quoteStaleDays, u.overdueDays, u.quoteValidDays, u.folioPrefixOrder, u.folioPrefixQuote, u.folioPrefixSale, +!!s, S(a.revision)).run()).meta.changes)
                    throw new r(`La configuración cambió. Actualiza antes de guardar.`, 409);
                if (Object.hasOwn(a, `backupWarningDays`))
                    await c.prepare(`UPDATE settings SET backup_warning_days=? WHERE id=1`).bind(u.backupWarningDays).run();
                if (Object.hasOwn(a, `quoteResponseWaitMinutes`))
                    await c.prepare(`UPDATE settings SET quote_response_wait_minutes=? WHERE id=1`).bind(wait).run();
                break;
            }
            case `createPurchaseOrder`:
            case `markPurchaseOrdered`:
            case `recordSupplierPayment`:
            case `receivePurchaseOrder`:
            case `cancelPurchaseOrder`:
            case `transferPurchasePartToInventory`:
            case `installPurchasedPart`:
                if (!isProcurementAction(a.action)) throw new r(`Operación de compra inválida.`);
                N = await runProcurementAction(c, a, l);
                break;
            case `recordCashOutflow`:
            case `voidCashOutflow`:
            case `createRecurringExpense`:
            case `updateRecurringExpense`:
            case `payRecurringOccurrence`:
            case `closeCashDay`:
                if (!isCashAction(a.action)) throw new r(`Operación de caja inválida.`);
                N = await runCashAction(c, a, l);
                break;
            default: throw new r(`Operación desconocida.`);
        }
        return i({ ok: !0, id: N, ...P === void 0 ? {} : typeof P === `object` ? P : { processed: a.records instanceof Array ? a.records.length : 0, imported: P }, ...a.action === `unlock` ? { locked: !1 } : {} }, 200, F ? { "Set-Cookie": F } : {});
    }
    catch (e) {
        return e instanceof r ? i({ error: e.message }, e.code) : e instanceof ProcurementError ? i({ error: e.message }, e.status) : e instanceof CashError ? i({ error: e.message }, e.status) : (console.error(`taller-save`, e), i({ error: `No se pudo guardar. Conservamos tus datos; intenta de nuevo.` }, 503));
    }
}
export { V as GET, H as POST, n as dynamic };
/* eslint-disable */
