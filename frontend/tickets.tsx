'use client';
import {type RepairPrintItem} from './ui';
import {type RecordData,type Settings,folio,money,orderDate,paymentDate,warrantyEndDate} from './types';
import {methods} from '@/lib/format';

export function ThermalTicket({item,settings,logo,workshop,requiredPart,preview=false}:{item:RepairPrintItem;settings:Settings;logo:string;workshop:string;requiredPart?:string;preview?:boolean}){
 const order=item.order;
 const stamp=(value:string)=>new Intl.DateTimeFormat('es-MX',{timeZone:settings.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
 const promisedDate=order.promisedDate?new Intl.DateTimeFormat('es-MX',{timeZone:settings.timezone,dateStyle:'medium'}).format(new Date(`${order.promisedDate}T12:00:00`)):'';
 return <article id={preview?undefined:'print-ticket'} className={preview?'thermal-ticket thermal-ticket-preview':'thermal-ticket'} style={preview?{width:settings.ticketPaperMm===80?'76mm':'54mm'}:undefined}>
  <header className="thermal-brand"><img src={logo} alt="Logotipo del negocio"/><strong>{workshop}</strong><span>{settings.phone}</span></header><hr/>
  <h1>{item.type==='order'?'ORDEN DE TRABAJO':'RECIBO DE PAGO'}</h1>
  <div className="thermal-line"><span>Folio</span><b>{item.type==='order'?folio(order.id):`COB-${String(item.payment.id).padStart(6,'0')}`}</b></div>
  {item.type==='payment'&&<div className="thermal-line"><span>Orden</span><b>{folio(order.id)}</b></div>}
  <div className="thermal-line"><span>Fecha</span><b>{item.type==='order'&&order.legacyOrderNumber?orderDate(order):item.type==='payment'&&item.payment.notes.startsWith('Anticipo importado;')?paymentDate(item.payment):stamp(item.type==='order'?order.createdAt:item.payment.createdAt)}</b></div>
  {order.legacyOrderNumber&&<div className="thermal-line"><span>Folio anterior</span><b>{order.legacyOrderNumber}</b></div>}<hr/>
  <div className="thermal-field"><b>Cliente</b><span>{order.firstName} {order.lastName}</span></div>
  <div className="thermal-field"><b>Teléfono</b><span>{order.phone||'No registrado'}</span></div>
  <div className="thermal-field"><b>Equipo</b><span>{order.brand} {order.model}</span></div>
  {item.type==='order'?<>
   <div className="thermal-field"><b>Falla reportada</b><span>{order.problem||'Sin problema registrado'}</span></div>
   <div className="thermal-field"><b>Reparación</b><span>{order.repairType||'Por diagnosticar'}</span></div>
   {order.imei&&<div className="thermal-field"><b>IMEI / serie</b><span>{order.imei}</span></div>}
   {order.accessoriesLeft&&<div className="thermal-field"><b>Accesorios recibidos</b><span>{order.accessoriesLeft}</span></div>}
   {order.physicalCondition&&<div className="thermal-field"><b>Condición física</b><span>{order.physicalCondition}</span></div>}
   {promisedDate&&<div className="thermal-field"><b>Fecha prometida</b><span>{promisedDate}</span></div>}
   {order.technician&&<div className="thermal-field"><b>Técnico</b><span>{order.technician}</span></div>}
   {order.notes&&<div className="thermal-field"><b>Comentarios</b><span>{order.notes}</span></div>}
   {requiredPart&&<div className="thermal-field"><b>Refacción requerida</b><span>{requiredPart}</span></div>}
   <hr/><div className="thermal-line"><span>Reparación</span><b>{money(order.serviceCents+order.partsCents,order.currency)}</b></div>
   {order.reviewCents>0&&<div className="thermal-line"><span>Revisión</span><b>{money(order.reviewCents,order.currency)}</b></div>}
   <div className="thermal-line thermal-total"><span>Total</span><b>{money(order.totalCents,order.currency)}</b></div>
   <div className="thermal-line"><span>Anticipo / pagos</span><b>{money(order.paidCents,order.currency)}</b></div>
   <div className="thermal-line thermal-balance"><span>Saldo</span><b>{money(order.dueCents,order.currency)}</b></div>
   <p className="thermal-thanks">{settings.ticketOrderNote}</p>
  </>:<>
   <hr/><div className="thermal-field"><b>Concepto</b><span>{item.payment.kind==='anticipo'?'Anticipo':'Pago a cuenta de reparación'}</span></div>
   <div className="thermal-line"><span>Método</span><b>{methods[item.payment.method]}</b></div>
   {item.payment.notes&&<div className="thermal-field"><b>Nota</b><span>{item.payment.notes}</span></div>}
   <div className="thermal-line thermal-total"><span>Importe recibido</span><b>{money(item.payment.amountCents,item.payment.currency)}</b></div><hr/>
   <div className="thermal-line"><span>Total de la orden</span><b>{money(order.totalCents,order.currency)}</b></div>
   <div className="thermal-line"><span>Total abonado</span><b>{money(order.paidCents,order.currency)}</b></div>
   <div className="thermal-line thermal-balance"><span>Saldo pendiente</span><b>{money(order.dueCents,order.currency)}</b></div>
   <p className="thermal-thanks">{settings.ticketPaymentNote}</p>
  </>}
  <footer className="thermal-footer">{workshop} · {settings.city}</footer>
 </article>;
}

export function QuoteTicket({quote,settings,logo,workshop}:{quote:RecordData;settings:Settings;logo:string;workshop:string}){
 const stamp=new Intl.DateTimeFormat('es-MX',{timeZone:settings.timezone,dateStyle:'medium'}).format(new Date(quote.createdAt));
 return <article id="print-ticket" className="thermal-ticket"><header className="thermal-brand"><img src={logo} alt="Logotipo del negocio"/><strong>{workshop}</strong><span>{settings.phone}</span></header><hr/><h1>PRESUPUESTO</h1><div className="thermal-line"><span>Folio</span><b>{folio(quote.id,true)}</b></div><div className="thermal-line"><span>Fecha</span><b>{stamp}</b></div>{quote.validUntil&&<div className="thermal-line"><span>Vigente hasta</span><b>{quote.validUntil}</b></div>}<hr/><div className="thermal-field"><b>Cliente</b><span>{quote.firstName} {quote.lastName}</span></div><div className="thermal-field"><b>Teléfono</b><span>{quote.phone||'No registrado'}</span></div><div className="thermal-field"><b>Equipo</b><span>{quote.brand} {quote.model}</span></div>{quote.problem&&<div className="thermal-field"><b>Falla reportada</b><span>{quote.problem}</span></div>}<div className="thermal-field"><b>Servicio</b><span>{quote.repairType||'Por definir'}</span></div>{quote.notes&&<div className="thermal-field"><b>Notas</b><span>{quote.notes}</span></div>}<hr/><div className="thermal-line"><span>Servicio / mano de obra</span><b>{money(quote.serviceCents,quote.currency)}</b></div><div className="thermal-line"><span>Refacciones</span><b>{money(quote.partsCents,quote.currency)}</b></div>{quote.reviewCents>0&&<div className="thermal-line"><span>Revisión</span><b>{money(quote.reviewCents,quote.currency)}</b></div>}<div className="thermal-line thermal-total"><span>Total estimado</span><b>{money(quote.totalCents,quote.currency)}</b></div><p className="thermal-thanks">Este presupuesto es informativo y puede cambiar al diagnosticar el equipo.</p><footer className="thermal-footer">{workshop} · {settings.city}</footer></article>;
}

export function DeliveryTicket({order,settings,logo,workshop}:{order:RecordData;settings:Settings;logo:string;workshop:string}){
 const stamp=order.deliveredAt?new Intl.DateTimeFormat('es-MX',{timeZone:settings.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(order.deliveredAt)):'Sin fecha de entrega registrada';
 const warrantyUntil=warrantyEndDate(order.deliveredAt,order.warrantyDays,settings.timezone);
 return <article id="print-ticket" className="thermal-ticket"><header className="thermal-brand"><img src={logo} alt="Logotipo del negocio"/><strong>{workshop}</strong><span>{settings.phone}</span></header><hr/><h1>COMPROBANTE DE ENTREGA</h1><div className="thermal-line"><span>Folio</span><b>{folio(order.id)}</b></div><div className="thermal-line"><span>Entrega</span><b>{stamp}</b></div><hr/><div className="thermal-field"><b>Cliente</b><span>{order.firstName} {order.lastName}</span></div><div className="thermal-field"><b>Equipo</b><span>{order.brand} {order.model}</span></div><div className="thermal-field"><b>Reparación</b><span>{order.repairType||'Servicio realizado'}</span></div>{warrantyUntil&&<div className="thermal-line"><span>Garantía hasta</span><b>{warrantyUntil}</b></div>}<hr/><div className="thermal-line thermal-total"><span>Total</span><b>{money(order.totalCents,order.currency)}</b></div><div className="thermal-line"><span>Pagado</span><b>{money(order.paidCents,order.currency)}</b></div>{order.dueCents>0&&<div className="thermal-line thermal-balance"><span>Saldo pendiente</span><b>{money(order.dueCents,order.currency)}</b></div>}{settings.warrantyTerms.trim()&&<><hr/><div className="thermal-field"><b>Términos de garantía</b><span>{settings.warrantyTerms}</span></div></>}<footer className="thermal-footer">{workshop} · {settings.city}</footer></article>;
}
