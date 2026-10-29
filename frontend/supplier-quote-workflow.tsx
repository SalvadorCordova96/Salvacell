'use client';

import { useEffect, useState } from 'react';
import { Accordion } from '@heroui/react';
import { Check, ChevronDown, Clock3, LoaderCircle, MessageSquareText, Plus, Send, X } from 'lucide-react';
import type { Mutation } from './ui';
import type { OrderRepair, PartRequest, PriceRequest, PriceRequestSupplier, RecordData, Supplier, SupplierInboundMessage, SupplierResponse } from './types';
import { date, money } from './types';

type Quick = (payload: Mutation, message: string) => Promise<unknown>;

export function SupplierQuoteWorkflow({ record, isBudget, repairs, partRequests, suppliers, requests, requestSuppliers, responses, inboxMessages, quick, waitMinutes }: {
  record: RecordData; isBudget: boolean; repairs: OrderRepair[]; partRequests: PartRequest[]; suppliers: Supplier[]; requests: PriceRequest[];
  requestSuppliers: PriceRequestSupplier[]; responses: SupplierResponse[]; inboxMessages: SupplierInboundMessage[]; quick: Quick; waitMinutes:number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [partName, setPartName] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(timer); }, []);
  const orderPartRequestIds = new Set(partRequests.filter(part => part.orderId === record.id && !part.repairId).map(part => part.id));
  const relevant = requests.filter(request => isBudget ? request.quoteId === record.id : request.repairId ? repairs.some(line => line.id === request.repairId && line.orderId === record.id) : !!request.partRequestId && orderPartRequestIds.has(request.partRequestId));
  const orderPartRequests = !isBudget ? relevant.filter(request => !request.repairId) : [];
  const available = suppliers.filter(supplier => supplier.active && supplier.suppliesParts);

  async function create(repairId?: number, name = partName) {
    if (!name.trim() || !selected.length) return;
    setBusy(true);
    try {
      const result = await quick({ action: 'createSupplierPriceRequest', ...(isBudget ? { quoteId: record.id } : { repairId }), partName: name.trim(), supplierIds: selected }, 'Solicitud de precio guardada; no se envió ningún mensaje');
      if (result) { setPartName(''); setSelected([]); setActive(null); }
    } finally { setBusy(false); }
  }

  const supplierPicker = <div className="field wide"><span>Proveedores activos</span><div className="check-list">{available.map(supplier => <label key={supplier.id}><input type="checkbox" checked={selected.includes(supplier.id)} onChange={event => setSelected(current => event.target.checked ? [...current, supplier.id] : current.filter(id => id !== supplier.id))}/>{supplier.name}</label>)}</div>{!available.length && <small>Agrega proveedores desde el módulo Proveedores.</small>}</div>;

  return <section className="order-quote-workflow">
    <div className="section-heading"><div><h3>Cotizaciones de refacciones</h3><p className="muted">Solicitudes y respuestas ligadas a {isBudget ? 'este presupuesto' : 'cada reparación'}.</p></div></div>
    {isBudget && <div className="form-grid"><label className="field"><span>Refacción para cotizar</span><input maxLength={150} value={partName} onChange={event => setPartName(event.target.value)} placeholder="Ej. Pantalla Samsung A05"/></label>{supplierPicker}<div><button className="sc-button secondary small" disabled={busy || !partName.trim() || !selected.length} onClick={() => void create()}>{busy ? <LoaderCircle className="spin" size={15}/> : <Plus size={15}/>}Crear solicitud</button></div></div>}
    {!isBudget && repairs.map(line => {
      const lineRequests = relevant.filter(request => request.repairId === line.id);
      return <article className="quote-repair-block" key={line.id}><div className="section-heading"><strong>{line.repairType} · {line.partName || 'Refacción por definir'}</strong><button className="sc-button secondary small" disabled={busy || !line.partName.trim()} onClick={() => { setActive(active === line.id ? null : line.id); setPartName(line.partName); setSelected([]); }}>{active === line.id ? <X size={15}/> : <Plus size={15}/>}Solicitar precio</button></div>
        {active === line.id && <div className="form-grid"><label className="field"><span>Refacción</span><input maxLength={150} value={partName} onChange={event => setPartName(event.target.value)}/></label>{supplierPicker}<div><button className="sc-button primary small" disabled={busy || !partName.trim() || !selected.length} onClick={() => void create(line.id, partName)}>{busy ? <LoaderCircle className="spin" size={15}/> : <Send size={15}/>}Guardar solicitud</button></div></div>}
        <QuoteRequestList requests={lineRequests} requestSuppliers={requestSuppliers} responses={responses} inboxMessages={inboxMessages} quick={quick} currency={record.currency} waitMinutes={waitMinutes} now={now}/></article>;
    })}
    {!isBudget && orderPartRequests.length > 0 && <article className="quote-repair-block quote-order-requests"><div className="section-heading"><strong>Refacciones vinculadas a la orden</strong><span className="muted">{orderPartRequests.length} {orderPartRequests.length === 1 ? 'solicitud' : 'solicitudes'}</span></div><QuoteRequestList requests={orderPartRequests} requestSuppliers={requestSuppliers} responses={responses} inboxMessages={inboxMessages} quick={quick} currency={record.currency} waitMinutes={waitMinutes} now={now}/></article>}
    {isBudget && <QuoteRequestList requests={relevant} requestSuppliers={requestSuppliers} responses={responses} inboxMessages={inboxMessages} quick={quick} currency={record.currency} waitMinutes={waitMinutes} now={now}/>}
    {!isBudget && !repairs.length && <p className="muted">No hay reparaciones asociadas a esta orden.</p>}
    {!relevant.length && !active && <p className="muted">Todavía no hay solicitudes de cotización.</p>}
  </section>;
}

type QuoteRequestListProps = { requests: PriceRequest[]; requestSuppliers: PriceRequestSupplier[]; responses: SupplierResponse[]; inboxMessages: SupplierInboundMessage[]; quick: Quick; currency: RecordData['currency']; waitMinutes: number; now: number };

function QuoteRequestList({ requests, requestSuppliers, responses, inboxMessages, quick, currency, waitMinutes, now }: QuoteRequestListProps) {
  if (!requests.length) return null;
  const firstPending = requests.find(request => request.status === 'pendiente');
  const firstRequest = firstPending || requests[0];
  return <Accordion className="quote-request-list" defaultExpandedKeys={[String(firstRequest.id)]} allowsMultipleExpanded={false}>
    {requests.map(request => <RequestCard key={request.id} request={request} suppliers={requestSuppliers.filter(item => item.priceRequestId === request.id)} responses={responses.filter(item => item.priceRequestId === request.id)} inboxMessages={inboxMessages} quick={quick} currency={currency} waitMinutes={waitMinutes} now={now}/>)}
  </Accordion>;
}

function RequestCard({ request, suppliers, responses, inboxMessages, quick, currency, waitMinutes, now }: { request: PriceRequest; suppliers: PriceRequestSupplier[]; responses: SupplierResponse[]; inboxMessages: SupplierInboundMessage[]; quick: Quick; currency: RecordData['currency']; waitMinutes:number; now:number }) {
  const [replyFor, setReplyFor] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState('');
  const [price, setPrice] = useState('');
  const [shipping, setShipping] = useState('');
  const [quality, setQuality] = useState('');
  const [delivery, setDelivery] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposalBusyId, setProposalBusyId] = useState<number | null>(null);
  const closed = request.status !== 'pendiente';
  const replyCount = suppliers.filter(item => item.status === 'respondio' || item.status === 'sin_disponibilidad').length;
  const responseCount = responses.length;
  const lastMessageAt = suppliers.map(item => item.lastMessageAt).filter((value): value is string => !!value).sort().at(-1);
  const completeForNow = request.status === 'pendiente' && !!lastMessageAt && now - Date.parse(lastMessageAt) >= waitMinutes * 60000;
  const statusLabel = completeForNow ? 'Completa por ahora' : request.status === 'pendiente' ? 'Pendiente' : request.status === 'atendida' ? 'Oferta elegida' : request.status === 'cancelada' ? 'Cancelada' : 'Cerrada';
  const statusClass = request.status === 'atendida' ? 'terminada' : request.status === 'pendiente' ? 'proceso' : '';
  async function saveReply(id: number) {
    setBusy(true);
    try { const result = await quick({ action: 'receiveSupplierResponse', priceRequestSupplierId: id, requestKey: crypto.randomUUID(), originalMessage: message, technicalSummary: summary, price, shipping, quality, deliveryTime: delivery, availability: price ? 'disponible' : 'por_confirmar', needsReview: !price || !message }, 'Respuesta registrada para revisión'); if (result) { setReplyFor(null); setMessage(''); setSummary(''); setPrice(''); setShipping(''); setQuality(''); setDelivery(''); } }
    finally { setBusy(false); }
  }
  async function confirmProposal(inbound: SupplierInboundMessage, associationId: number) {
    if (!inbound.proposal?.offers.length) return;
    setProposalBusyId(inbound.id);
    try {
      await quick({ action: 'reviewSupplierInboundMessage', id: inbound.id, decision: 'accept', priceRequestSupplierId: associationId, reason: 'Propuesta confirmada desde el detalle de la orden o presupuesto', offers: inbound.proposal.offers.map(offer => ({ ...offer, requestKey: crypto.randomUUID() })) }, 'Respuesta del proveedor confirmada y guardada para esta solicitud');
    } finally { setProposalBusyId(null); }
  }
  return <Accordion.Item className="quote-request-card" id={String(request.id)}>
    <Accordion.Heading><Accordion.Trigger className="quote-request-trigger"><span className="quote-request-summary"><strong>{request.partName}</strong><span className="quote-request-meta"><small><Clock3 size={13}/>{date(request.createdAt)}</small><small>{replyCount}/{suppliers.length} respuestas · {responseCount} {responseCount === 1 ? 'oferta' : 'ofertas'}</small></span></span><span className={`sc-badge ${statusClass}`}>{statusLabel}</span><Accordion.Indicator><ChevronDown size={16}/></Accordion.Indicator></Accordion.Trigger></Accordion.Heading>
    <Accordion.Panel><Accordion.Body className="quote-request-panel"><div className="quote-request-action-row"><span className="muted">Solicitud #{request.id}</span>{!closed&&<button className="sc-button secondary small quote-close-request" onClick={()=>void quick({action:'closeSupplierPriceRequest',id:request.id,status:'cerrada'},'Solicitud cerrada')}>Cerrar solicitud</button>}</div>
    <div className="quote-response-list">{suppliers.map(supplier => <div className="quote-supplier-response" key={supplier.id}><div className="section-heading"><strong>{supplier.supplierName}</strong><span className="sc-badge">{supplier.status==='pendiente'?'Sin respuesta':supplier.status==='sin_disponibilidad'?'Sin disponibilidad':supplier.status==='cancelado'?'Cancelado':'Respondió'}</span></div>
      {responses.filter(response => response.priceRequestSupplierId === supplier.id).map(response => <div className={'supplier-response'+(response.isLate?' late':'')} key={response.id}><div className="response-values"><strong>{response.priceCents===null?'Precio sin especificar':money(response.priceCents,currency)}{response.shippingCents!==null&&<> + {money(response.shippingCents,currency)} envío</>}</strong><span>{response.quality||'Calidad sin especificar'} · {response.deliveryTime||'Entrega sin especificar'}</span></div>{response.technicalSummary&&<p>{response.technicalSummary}</p>}<details><summary><MessageSquareText size={14}/> Mensaje original</summary><p>{response.originalMessage||'Sin texto original'}</p></details><small>{date(response.receivedAt,true)}{response.needsReview?' · Requiere revisión':''}{response.isLate?' · Respuesta tardía':''}</small>{request.status==='pendiente'&&!response.isLate&&response.priceCents!==null&&<button className="sc-button secondary small" onClick={()=>void quick({action:'chooseSupplierResponse',priceRequestId:request.id,responseId:response.id},'Oferta elegida manualmente; no se envió confirmación') }><Check size={14}/>{request.selectedResponseId===response.id?'Elegida':'Elegir oferta'}</button>}</div>)}
      {!closed&&supplier.status!=='cancelado'&&<div>{replyFor===supplier.id?<div className="form-grid"><label className="field wide"><span>Mensaje original del proveedor</span><textarea rows={2} maxLength={5000} value={message} onChange={event=>setMessage(event.target.value)}/></label><label className="field wide"><span>Resumen técnico (opcional)</span><textarea rows={2} maxLength={2000} value={summary} onChange={event=>setSummary(event.target.value)}/></label><label className="field"><span>Precio</span><input type="number" min="0" step="0.01" value={price} onChange={event=>setPrice(event.target.value)}/></label><label className="field"><span>Envío</span><input type="number" min="0" step="0.01" value={shipping} onChange={event=>setShipping(event.target.value)}/></label><label className="field"><span>Calidad / variante</span><input maxLength={100} value={quality} onChange={event=>setQuality(event.target.value)}/></label><label className="field"><span>Tiempo de entrega</span><input maxLength={120} value={delivery} onChange={event=>setDelivery(event.target.value)}/></label><button className="sc-button primary small" disabled={busy||!message.trim()} onClick={()=>void saveReply(supplier.id)}>{busy?<LoaderCircle className="spin" size={15}/>:<Check size={15}/>}Guardar respuesta</button><button className="sc-button text-button" onClick={()=>setReplyFor(null)}>Cancelar</button></div>:<button className="link-button" onClick={()=>setReplyFor(supplier.id)}><Plus size={14}/>Registrar respuesta recibida</button>}</div>}
      </div>)}</div>
    {inboxMessages.filter(inbound => inbound.proposal && ['needs_review', 'ambiguous', 'unmatched'].includes(inbound.status) && inbound.candidateAssociationIds?.some(id => suppliers.some(association => association.id === id))).map(inbound => {
      const proposal = inbound.proposal!;
      const candidates = suppliers.filter(association => inbound.candidateAssociationIds.includes(association.id));
      const exactAssociation = candidates.length === 1 && proposal.suggestedAssociationId === candidates[0].id ? candidates[0] : null;
      return <article className="supplier-agent-proposal quote-agent-proposal" key={inbound.id}>
        <strong>Respuesta interpretada · {inbound.supplierName || 'Proveedor'} · {Math.round(proposal.confidence * 100)}% de confianza</strong>
        <p>{proposal.technicalSummary || proposal.reason || 'El agente no generó un resumen.'}</p>
        {proposal.offers.length ? <ul>{proposal.offers.map((offer, index) => <li key={`${inbound.id}-${index}`}><b>{offer.quality || offer.technicalSummary || `Opción ${index + 1}`}</b> · {offer.price ? `${offer.price} ${currency}` : 'Precio sin especificar'}{offer.shipping ? ` + ${offer.shipping} ${currency} envío` : ''} · {offer.deliveryTime || 'Entrega sin especificar'}{offer.availability !== 'por_confirmar' ? ` · ${offer.availability}` : ''}</li>)}</ul> : <p>El mensaje requiere revisión manual; no se encontraron ofertas concretas.</p>}
        <details><summary>Ver respuesta original del proveedor</summary><p className="supplier-inbox-original">{inbound.originalMessage}</p></details>
        {exactAssociation && proposal.offers.length > 0
          ? <button className="sc-button primary small" disabled={proposalBusyId === inbound.id || closed} onClick={() => void confirmProposal(inbound, exactAssociation.id)}>{proposalBusyId === inbound.id ? <LoaderCircle className="spin" size={15}/> : <Check size={15}/>}Confirmar y guardar oferta(s)</button>
          : <small>Hay varias solicitudes posibles o falta información. Revísalo desde Mensajes entrantes; no se asociará automáticamente.</small>}
      </article>;
    })}
    </Accordion.Body></Accordion.Panel>
  </Accordion.Item>;
}
