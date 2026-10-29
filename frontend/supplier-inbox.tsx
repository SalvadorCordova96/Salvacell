'use client';

import { useState } from 'react';
import { Accordion } from '@heroui/react';
import { AlertTriangle, Check, LoaderCircle, MessageSquare, Plus, X } from 'lucide-react';
import { type BootData, type SupplierInboundMessage, type SupplierInboundOffer, folio } from './types';

type Mutation = Record<string, unknown>;
type Mutate = (input: Mutation) => Promise<{ id: number; data: BootData }>;
const emptyOffer = (): SupplierInboundOffer => ({ technicalSummary: '', price: '', shipping: '', quality: '', availability: 'por_confirmar', deliveryTime: '' });
const statusLabel: Record<SupplierInboundMessage['status'], string> = {
  unmatched: 'Sin coincidencia', needs_review: 'Revisión requerida', ambiguous: 'Varias solicitudes posibles',
  linked: 'Asociado', late: 'Tardío', ignored: 'Ignorado',
};

export function SupplierInbox({ data, mutate, notify }: { data: BootData; mutate: Mutate; notify: (message: string) => void }) {
  const messages = data.supplierInboxMessages;
  const firstToReview = messages.find(message => ['unmatched', 'needs_review', 'ambiguous'].includes(message.status));
  return <section className="panel supplier-inbox">
    <div className="section-heading"><div><h2>Mensajes entrantes de proveedores</h2><span className="muted">{messages.filter(message => ['unmatched', 'needs_review', 'ambiguous'].includes(message.status)).length} por revisar · El agente propone; tú confirmas la solicitud y cada oferta. No se envían mensajes desde aquí.</span></div></div>
    {messages.length ? <Accordion className="supplier-inbox-list" allowsMultipleExpanded defaultExpandedKeys={firstToReview ? [String(firstToReview.id)] : []}>
      {messages.map(message => {
        const preview = message.proposal?.technicalSummary || message.proposal?.reason || message.reviewReason || message.originalMessage;
        return <Accordion.Item className="supplier-inbox-item" id={String(message.id)} key={message.id}>
          <Accordion.Heading><Accordion.Trigger className="supplier-inbox-trigger">
            <span className="supplier-inbox-summary"><strong>{message.supplierName || 'Proveedor sin identificar'}</strong><small>{new Date(message.receivedAt).toLocaleString('es-MX')} · remitente ····{message.senderHint || '????'}</small><small className="supplier-inbox-preview">{preview}</small></span>
            <span className={`sc-badge ${message.status === 'ambiguous' || message.status === 'unmatched' ? 'warning' : ''}`}>{statusLabel[message.status]}</span><Accordion.Indicator/>
          </Accordion.Trigger></Accordion.Heading>
          <Accordion.Panel><Accordion.Body className="supplier-inbox-body"><InboxCard message={message} data={data} mutate={mutate} notify={notify}/></Accordion.Body></Accordion.Panel>
        </Accordion.Item>;
      })}
    </Accordion>
      : <div className="supplier-empty"><MessageSquare size={31}/><p>No hay mensajes de proveedor pendientes de revisar.</p></div>}
  </section>;
}

function InboxCard({ message, data, mutate, notify }: { message: SupplierInboundMessage; data: BootData; mutate: Mutate; notify: (message: string) => void }) {
  const initialOffers = message.proposal?.offers?.length ? message.proposal.offers : [emptyOffer()];
  const [associationId, setAssociationId] = useState(message.status === 'ambiguous' ? '' : String(message.suggestedPriceRequestSupplierId || message.candidateAssociationIds?.[0] || ''));
  const [offers, setOffers] = useState<SupplierInboundOffer[]>(initialOffers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editable = ['unmatched', 'needs_review', 'ambiguous'].includes(message.status);
  const associations = data.priceRequestSuppliers.filter(association => {
    const request = data.priceRequests.find(row => row.id === association.priceRequestId);
    const repair = request?.repairId ? data.orderRepairs.find(row => row.id === request.repairId) : undefined;
    const order = repair ? data.orders.find(row => row.id === repair.orderId) : undefined;
    return association.status !== 'cancelado' && request?.status === 'pendiente' && (!order || !['cancelada', 'entregada'].includes(String(order.status))) && (message.supplierId === null || association.supplierId === message.supplierId);
  });
  async function review(decision: 'accept' | 'ignore') {
    setBusy(true); setError('');
    try {
      if (decision === 'accept' && (!associationId || !offers.length)) throw new Error('Elige proveedor/solicitud y confirma al menos una oferta.');
      await mutate({ action: 'reviewSupplierInboundMessage', id: message.id, decision, priceRequestSupplierId: Number(associationId), reason: 'Revisión desde bandeja de mensajes', offers: offers.map(offer => ({ ...offer, requestKey: crypto.randomUUID() })) });
      notify(decision === 'accept' ? 'Mensaje asociado; ofertas guardadas para la orden.' : 'Mensaje marcado como ignorado.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo revisar el mensaje.'); }
    finally { setBusy(false); }
  }
  function updateOffer(index: number, field: keyof SupplierInboundOffer, value: string) {
    setOffers(current => current.map((offer, position) => position === index ? { ...offer, [field]: value } : offer));
  }
  const proposal = message.proposal;
  const sourceMessages = (proposal?.sourceMessageIds || []).map(id => data.supplierInboxMessages.find(item => item.id === id)).filter((item): item is SupplierInboundMessage => Boolean(item));
  return <div className="supplier-inbox-card">
    {message.reviewReason && <p className="help"><AlertTriangle size={15}/> {message.reviewReason}</p>}
    {message.agentProcessingState === 'queued' || message.agentProcessingState === 'dispatching' || message.agentProcessingState === 'dispatched'
      ? <p className="help">OpenClaw está preparando una propuesta; los campos aún requieren tu revisión.</p>
      : message.agentProcessingState === 'failed'
        ? <p className="help">No se pudo completar la interpretación automática. Puedes capturar la respuesta manualmente.</p>
        : null}
    <details><summary>Ver mensaje original</summary><p className="supplier-inbox-original">{message.originalMessage}</p></details>
    {proposal && <div className="supplier-agent-proposal"><strong>Propuesta del agente · {Math.round(proposal.confidence * 100)}% de confianza</strong><p>{proposal.technicalSummary || proposal.reason || 'Sin resumen.'}</p>{proposal.reason && <small>Motivo: {proposal.reason}</small>}{sourceMessages.length>0&&<details><summary>Fragmentos usados ({sourceMessages.length})</summary>{sourceMessages.map(source=><p className="supplier-inbox-original" key={source.id}>{new Date(source.receivedAt).toLocaleString('es-MX')} · {source.originalMessage}</p>)}</details>}</div>}
    {editable && <fieldset className="supplier-inbox-review" disabled={busy}>
      <label className="field"><span>Solicitud a la que corresponde</span><select value={associationId} onChange={event => setAssociationId(event.target.value)}><option value="">Selecciona manualmente</option>{associations.map(association => {const request=data.priceRequests.find(row=>row.id===association.priceRequestId)!;const repair=request.repairId?data.orderRepairs.find(row=>row.id===request.repairId):undefined;return <option key={association.id} value={association.id}>{request.quoteId?`Presupuesto ${folio(request.quoteId,true)}`:repair?`${folio(repair.orderId)} · ${repair.repairType}`:'Solicitud'} · {request.brand} {request.model} · {request.partName} · {association.supplierName}</option>;})}</select></label>
      <div className="section-heading"><strong>Ofertas que se guardarán al confirmar</strong><button type="button" className="sc-button secondary small" onClick={()=>setOffers(current=>[...current,emptyOffer()])}><Plus size={15}/>Agregar opción</button></div>
      {offers.map((offer,index)=><div className="supplier-inbox-offer" key={index}><div className="section-heading"><strong>Opción {index+1}</strong>{offers.length>1&&<button type="button" className="icon-button" aria-label="Quitar opción" onClick={()=>setOffers(current=>current.filter((_,position)=>position!==index))}><X size={16}/></button>}</div><label className="field"><span>Resumen / variante</span><input maxLength={1000} value={offer.technicalSummary} onChange={event=>updateOffer(index,'technicalSummary',event.target.value)}/></label><div className="form-grid"><label className="field"><span>Precio</span><input inputMode="decimal" placeholder="Desconocido" value={offer.price} onChange={event=>updateOffer(index,'price',event.target.value)}/></label><label className="field"><span>Envío</span><input inputMode="decimal" placeholder="Desconocido" value={offer.shipping} onChange={event=>updateOffer(index,'shipping',event.target.value)}/></label><label className="field"><span>Calidad</span><input maxLength={100} value={offer.quality} onChange={event=>updateOffer(index,'quality',event.target.value)}/></label><label className="field"><span>Disponibilidad</span><select value={offer.availability} onChange={event=>updateOffer(index,'availability',event.target.value as SupplierInboundOffer['availability'])}><option value="por_confirmar">Por confirmar</option><option value="disponible">Disponible</option><option value="agotada">Agotada</option><option value="bajo_pedido">Bajo pedido</option><option value="sin_disponibilidad">Sin disponibilidad</option></select></label><label className="field wide"><span>Tiempo de entrega</span><input maxLength={120} value={offer.deliveryTime} onChange={event=>updateOffer(index,'deliveryTime',event.target.value)}/></label></div></div>)}
    </fieldset>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {editable && <footer><button type="button" className="sc-button secondary small" disabled={busy} onClick={()=>void review('ignore')}>Ignorar mensaje</button><button type="button" className="sc-button primary small" disabled={busy||!associationId} onClick={()=>void review('accept')}>{busy?<LoaderCircle className="spin" size={15}/>:<Check size={15}/>}Confirmar y guardar ofertas</button></footer>}
    {message.status==='linked'&&<p className="help">Asociado a {message.linkedSupplierName} · {message.linkedBrand} {message.linkedModel} · {message.linkedPartName}. La selección de compra sigue siendo manual.</p>}
  </div>;
}
