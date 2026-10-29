'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Accordion } from '@heroui/react';
import { Check, ChevronDown, PackageCheck, Plus, ShoppingCart, X } from 'lucide-react';
import { Field, Modal } from './ui';
import { type BootData, type PurchaseOrder, type PurchaseOrderItem, money, date, folio } from './types';

type Mutation = Record<string, unknown>;
type Mutate = (payload: Mutation) => Promise<{ id: number; data: BootData }>;

const purchaseStatusLabels: Record<PurchaseOrder['status'], string> = {
  borrador: 'Borrador',
  solicitada: 'Solicitada',
  parcial: 'Recepción parcial',
  recibida: 'Recibida',
  cancelada: 'Cancelada',
};

const purchaseStatusBadges: Record<PurchaseOrder['status'], string> = {
  borrador: 'nueva',
  solicitada: 'proceso',
  parcial: 'esperando_refaccion',
  recibida: 'terminada',
  cancelada: 'cancelada',
};

function operationKey() {
  return globalThis.crypto?.randomUUID?.() ?? `proc-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function SupplierPurchases({ data, mutate, notify }: { data: BootData; mutate: Mutate; notify: (message: string) => void }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [shipping, setShipping] = useState('');
  const [paymentDrafts, setPaymentDrafts] = useState<Record<number, string>>({});
  const [receiveDrafts, setReceiveDrafts] = useState<Record<number, { quantity: string; unitCost: string }>>({});
  const [productDrafts, setProductDrafts] = useState<Record<number, string>>({});
  const [cancelTarget, setCancelTarget] = useState<PurchaseOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const alreadyOrdered = useMemo(() => new Set(data.purchaseOrderItems.flatMap((item) => {
    const order = data.purchaseOrders.find((candidate) => candidate.id === item.purchaseOrderId);
    return order && order.status !== 'cancelada' ? [item.supplierResponseId].filter((id): id is number => id !== null) : [];
  })), [data.purchaseOrderItems, data.purchaseOrders]);
  const offers = data.supplierResponses.filter((response) =>
    response.selectedResponseId === response.id && response.requestStatus === 'atendida' &&
    response.priceCents !== null && response.priceCents >= 0 &&
    ['disponible', 'bajo_pedido'].includes(response.availability) &&
    !response.isLate && !response.needsReview && response.repairId !== null &&
    response.repairStatus !== 'cancelada' && response.repairStatus !== 'entregada' &&
    !alreadyOrdered.has(response.id),
  );
  const selectedOffers = offers.filter((offer) => selected.includes(offer.id));
  const first = selectedOffers[0];
  const oneSupplierCurrency = !!first && selectedOffers.every((offer) => offer.supplierId === first.supplierId && offer.currency === first.currency);

  async function act(payload: Mutation, success: string) {
    setBusy(true);
    setError('');
    try {
      await mutate(payload);
      notify(success);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la operación.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createOrder() {
    if (!selectedOffers.length || !oneSupplierCurrency) return;
    const done = await act({
      action: 'createPurchaseOrder', requestKey: operationKey(),
      responseIds: selectedOffers.map((offer) => offer.id),
      items: selectedOffers.map((offer) => ({ responseId: offer.id, quantity: Number(quantities[offer.id] || 1) })),
      shipping, notes: '',
    }, 'Pedido en borrador creado; aún no se envió al proveedor.');
    if (done) { setSelected([]); setShipping(''); }
  }

  async function confirmCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = cancelReason.trim();
    if (!cancelTarget || !reason) return;
    const done = await act({ action: 'cancelPurchaseOrder', id: cancelTarget.id, reason }, 'Pedido cancelado; se conservó el historial.');
    if (done) {
      setCancelTarget(null);
      setCancelReason('');
    }
  }

  function orderItems(order: PurchaseOrder) {
    return data.purchaseOrderItems.filter((item) => item.purchaseOrderId === order.id);
  }

  const firstActionableOrder = data.purchaseOrders.find((order) => ['borrador', 'solicitada', 'parcial'].includes(order.status));

  return <div className="purchase-management">
    {error && <p role="alert" className="form-error">{error}</p>}
    <section className="panel">
      <div className="section-heading"><div><h2>Preparar pedido al proveedor</h2><span className="muted">Solo ofertas que elegiste manualmente. Crear el borrador no envía mensajes ni confirma una compra.</span></div></div>
      {offers.length ? <>
        <div className="table-wrap"><table><thead><tr><th/><th>Refacción / reparación</th><th>Proveedor y oferta</th><th>Estado</th><th>Cantidad</th></tr></thead><tbody>
          {offers.map((offer) => {
            const request = data.priceRequests.find((item) => item.id === offer.priceRequestId);
            const part = offer.partRequestId !== null ? data.partRequests.find((item) => item.id === offer.partRequestId) : undefined;
            const repair = offer.repairId !== null ? data.orderRepairs.find((item) => item.id === offer.repairId) : undefined;
            const order = repair && data.orders.find((item) => item.id === repair.orderId);
            return <tr key={offer.id}>
              <td><input aria-label={`Seleccionar oferta ${offer.id}`} type="checkbox" checked={selected.includes(offer.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, offer.id] : current.filter((id) => id !== offer.id))}/></td>
              <td><strong>{offer.brand} {offer.model}</strong><small>{request?.partName || part?.name || 'Refacción'}{order ? ` · ${folio(order.id)} · ${order.firstName} ${order.lastName}` : ''}</small></td>
              <td><strong>{offer.supplierName}</strong><small>{offer.quality || 'Calidad sin especificar'} · {money(offer.priceCents ?? 0, offer.currency || 'MXN')} {offer.shippingCents === null ? '· envío por confirmar' : `· envío cotizado ${money(offer.shippingCents, offer.currency || 'MXN')}`}</small></td>
              <td>{offer.availability === 'bajo_pedido' ? 'Bajo pedido' : 'Disponible'}<small>{offer.deliveryTime || 'Entrega sin especificar'}</small></td>
              <td><input aria-label={`Cantidad de ${offer.brand} ${offer.model}`} type="number" min="1" max="1000" step="1" value={quantities[offer.id] ?? '1'} onChange={(event) => setQuantities((current) => ({ ...current, [offer.id]: event.target.value }))}/></td>
            </tr>;
          })}
        </tbody></table></div>
        {selected.length > 0 && <div className="purchase-create-row">
          {!oneSupplierCurrency && <span className="form-error">Un pedido agrupa únicamente ofertas del mismo proveedor y moneda.</span>}
          <label className="field"><span>Envío total del pedido</span><input type="number" min="0" step="0.01" value={shipping} onChange={(event) => setShipping(event.target.value)}/></label>
          <button className="sc-button primary" disabled={busy || !oneSupplierCurrency} onClick={() => void createOrder()}><Plus size={16}/>Crear borrador</button>
        </div>}
      </> : <div className="supplier-empty"><ShoppingCart size={30}/><p>No hay ofertas elegidas y disponibles para convertir en pedido.</p></div>}
    </section>

    <section className="panel">
      <div className="section-heading"><div><h2>Pedidos y recepciones</h2><span className="muted">El inventario aumenta únicamente cuando registras una recepción real.</span></div><span className="count-pill">{data.purchaseOrders.length}</span></div>
      {data.purchaseOrders.length ? <Accordion className="purchase-order-list" aria-label="Pedidos a proveedores" allowsMultipleExpanded defaultExpandedKeys={firstActionableOrder ? [String(firstActionableOrder.id)] : []}>{data.purchaseOrders.map((order) => {
        const items = orderItems(order);
        const balance = Math.max(0, order.totalCents - order.paidCents);
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const receivedQuantity = items.reduce((sum, item) => sum + item.receivedQuantity, 0);
        return <Accordion.Item className="purchase-order-card" id={String(order.id)} key={order.id}>
          <Accordion.Heading><Accordion.Trigger className="purchase-order-trigger">
            <span className="purchase-order-summary"><strong>{order.supplierName} · Pedido #{order.id}</strong><small>{date(order.createdAt, true)} · {items.length} {items.length === 1 ? 'concepto' : 'conceptos'} · {receivedQuantity}/{totalQuantity} recibidas</small></span>
            <span className="purchase-order-total"><span className={`sc-badge ${purchaseStatusBadges[order.status]}`}>{purchaseStatusLabels[order.status]}</span><strong>{money(order.totalCents, order.currency)}</strong><small>Saldo {money(balance, order.currency)}</small></span>
            <Accordion.Indicator><ChevronDown size={17}/></Accordion.Indicator>
          </Accordion.Trigger></Accordion.Heading>
          <Accordion.Panel><Accordion.Body className="purchase-order-body">
          <div className="purchase-line-list">{items.map((item: PurchaseOrderItem) => {
            const remaining = item.quantity - item.receivedQuantity;
            const part = item.partRequestId !== null ? data.partRequests.find((candidate) => candidate.id === item.partRequestId) : undefined;
            const repair = item.repairId !== null ? data.orderRepairs.find((candidate) => candidate.id === item.repairId) : undefined;
            const orderRecord = repair && data.orders.find((candidate) => candidate.id === repair.orderId);
            const canTransfer = item.destination === 'repair' && item.receivedQuantity > 0 && (part?.status === 'cancelada' || orderRecord?.status === 'cancelada');
            return <div className="purchase-line" key={item.id}>
              <div><strong>{item.brand} {item.model} · {item.itemName}</strong><small>{item.quality || 'Calidad sin especificar'} · {item.receivedQuantity}/{item.quantity} recibidas · {item.destination === 'inventory' ? 'Inventario' : orderRecord ? `${folio(orderRecord.id)} · ${orderRecord.firstName} ${orderRecord.lastName}` : 'Reparación'}</small></div>
              <div className="purchase-line-actions">
                {remaining > 0 && ['solicitada', 'parcial'].includes(order.status) && <>
                  <input aria-label={`Cantidad recibida de ${item.itemName}`} type="number" min="1" max={remaining} step="1" value={receiveDrafts[item.id]?.quantity ?? String(remaining)} onChange={(event) => setReceiveDrafts((current) => ({ ...current, [item.id]: { quantity: event.target.value, unitCost: current[item.id]?.unitCost ?? (item.unitCostCents / 100).toFixed(2) } }))}/>
                  <input aria-label={`Costo real de ${item.itemName}`} type="number" min="0" step="0.01" placeholder="Costo real" value={receiveDrafts[item.id]?.unitCost ?? (item.unitCostCents / 100).toFixed(2)} onChange={(event) => setReceiveDrafts((current) => ({ ...current, [item.id]: { quantity: current[item.id]?.quantity ?? String(remaining), unitCost: event.target.value } }))}/>
                  <button className="sc-button secondary small" disabled={busy} onClick={() => void act({ action: 'receivePurchaseOrder', purchaseOrderId: order.id, requestKey: operationKey(), items: [{ purchaseOrderItemId: item.id, quantity: Number(receiveDrafts[item.id]?.quantity ?? remaining), actualUnitCost: receiveDrafts[item.id]?.unitCost ?? (item.unitCostCents / 100).toFixed(2) }] }, 'Recepción registrada; inventario/costo actualizados según el destino.')}><PackageCheck size={15}/>Recibir</button>
                </>}
                {part?.status === 'disponible' && orderRecord?.status !== 'cancelada' && orderRecord?.status !== 'entregada' && <button className="sc-button secondary small" disabled={busy} onClick={() => void act({ action: 'installPurchasedPart', partRequestId: part.id }, 'Refacción marcada como instalada.')}>Marcar instalada</button>}
                {canTransfer && <><select aria-label={`Producto de inventario para ${item.itemName}`} value={productDrafts[item.id] ?? ''} onChange={(event) => setProductDrafts((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">Transferir a inventario…</option>{data.products.filter((product) => product.active && product.currency === order.currency).map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku || 'sin SKU'}</option>)}</select><button className="sc-button secondary small" disabled={busy || !productDrafts[item.id]} onClick={() => void act({ action: 'transferPurchasePartToInventory', purchaseOrderItemId: item.id, productId: Number(productDrafts[item.id]) }, 'Pieza recibida transferida a inventario con trazabilidad.')}>Transferir</button></>}
              </div>
            </div>;
          })}</div>
          <footer>
            <span>Pagado {money(order.paidCents, order.currency)} · saldo {money(balance, order.currency)}</span>
            {order.status === 'borrador' && <button className="sc-button secondary small" disabled={busy} onClick={() => void act({ action: 'markPurchaseOrdered', id: order.id }, 'Pedido marcado como solicitado; no se envió ningún mensaje.')}>Marcar solicitado</button>}
            {balance > 0 && ['solicitada', 'parcial', 'recibida'].includes(order.status) && <form onSubmit={(event) => { event.preventDefault(); void act({ action: 'recordSupplierPayment', purchaseOrderId: order.id, requestKey: operationKey(), amount: paymentDrafts[order.id], method: 'transferencia' }, 'Pago al proveedor registrado por separado.').then((done) => done && setPaymentDrafts((current) => ({ ...current, [order.id]: '' }))); }}><label className="field supplier-payment-field"><span>Pago al proveedor · {order.currency}</span><input aria-label={`Pago al proveedor ${order.supplierName} · ${order.currency}`} type="number" min="0.01" max={(balance / 100).toFixed(2)} step="0.01" placeholder="Importe" value={paymentDrafts[order.id] ?? ''} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [order.id]: event.target.value }))}/></label><button className="sc-button secondary small" disabled={busy || !paymentDrafts[order.id]}><Check size={15}/>Registrar pago</button></form>}
            {!['cancelada', 'recibida'].includes(order.status) && <button className="sc-button danger small" disabled={busy} onClick={() => { setError(''); setCancelTarget(order); setCancelReason(''); }}><X size={15}/>Cancelar pedido</button>}
          </footer>
          </Accordion.Body></Accordion.Panel>
        </Accordion.Item>;
      })}</Accordion> : <div className="supplier-empty"><PackageCheck size={30}/><p>Aún no hay pedidos registrados.</p></div>}
    </section>
    <p className="help supplier-help">Este módulo no contacta proveedores ni usa OpenClaw. Conserva respuesta, oferta elegida, pedido, pagos y recepciones para integrarlos después de forma supervisada.</p>
    {cancelTarget && <Modal title={`Cancelar pedido #${cancelTarget.id}`} eyebrow="Compras a proveedores" close={() => { if (!busy) { setCancelTarget(null); setCancelReason(''); } }}>
      <form onSubmit={event => void confirmCancel(event)}>
        <div className="form-body">
          <p>El pedido se marcará como cancelado y se conservará su historial. Indica el motivo para dejarlo registrado.</p>
          <Field label="Motivo de cancelación"><textarea autoFocus required maxLength={500} rows={3} value={cancelReason} onChange={event => setCancelReason(event.target.value)} /></Field>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="dialog-actions">
          <button type="button" className="sc-button secondary" disabled={busy} onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Volver al pedido</button>
          <button type="submit" className="sc-button danger" disabled={busy || !cancelReason.trim()}><X size={16}/>{busy ? 'Cancelando…' : 'Confirmar cancelación'}</button>
        </div>
      </form>
    </Modal>}
  </div>;
}
