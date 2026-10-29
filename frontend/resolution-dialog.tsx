'use client';

import {useState,type FormEvent} from 'react';
import {AlertTriangle,ArrowLeft,CheckCircle2} from 'lucide-react';
import {type Currency,money} from './types';
import {Field,Modal} from './ui';

export type ResolutionDialogOrder={
 id:number;
 folio:string;
 customerName:string;
 deviceName:string;
 currency:Currency;
 totalCents:number;
 paidCents:number;
};

export type ResolutionDialogPaymentMethod={key:string;label:string};

export type ResolutionSubmission={
 orderId:number;
 reason:string;
 refundCents:number;
 refundMethod:string|null;
};

type Props={
 order:ResolutionDialogOrder;
 paymentMethods:ResolutionDialogPaymentMethod[];
 onSave:(submission:ResolutionSubmission)=>void|Promise<void>;
 onClose:()=>void;
};

function toCents(value:string):number|null{
 if(!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim()))return null;
 const parsed=Number(value.replace(',','.'));
 return Number.isFinite(parsed)?Math.round(parsed*100):null;
}

/** Captures a cancellation and (optionally) a separate refund instruction.
 * It never edits or removes the order's original payment records.
 */
export function ResolutionDialog({order,paymentMethods,onSave,onClose}:Props){
 const [reason,setReason]=useState('');
 const [refund,setRefund]=useState('0');
 const [refundMethod,setRefundMethod]=useState('');
 const [reviewing,setReviewing]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const refundCents=toCents(refund);
 const needsMethod=refundCents!==null&&refundCents>0;
 const availableMethods=paymentMethods.filter(method=>method.key.trim()&&method.label.trim());
 const validationError=!reason.trim()?'Escribe el motivo de cancelación.'
  :refundCents===null?'Escribe un importe válido con hasta dos decimales.'
  :refundCents>order.paidCents?'La devolución no puede superar lo que aparece cobrado en esta orden.'
  :needsMethod&&!availableMethods.some(method=>method.key===refundMethod)?'Selecciona el método de devolución.'
  :'';

 function review(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError('');
  if(validationError){setError(validationError);return;}
  setReviewing(true);
 }

 async function confirm(){
  if(validationError||refundCents===null){setError(validationError||'Revisa los datos de la devolución.');setReviewing(false);return;}
  setBusy(true);setError('');
  try{
   await onSave({orderId:order.id,reason:reason.trim(),refundCents,refundMethod:refundCents>0?refundMethod:null});
   onClose();
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo registrar la cancelación.');setReviewing(false);}
  finally{setBusy(false);}
 }

 return <Modal title={reviewing?'Confirma cancelación y devolución':'Cancelar orden'} eyebrow={`${order.folio} · ${order.customerName}`} close={onClose}>
  {!reviewing?<form onSubmit={review}>
   <div className="form-body">
    <div className="notice"><AlertTriangle size={17}/><span>Se registrará la cancelación sin borrar los pagos originales. Si se devuelve dinero, esa devolución debe quedar como un movimiento separado.</span></div>
    <div className="form-section-title"><span>ORDEN</span><h3>{order.deviceName}</h3></div>
    <div className="form-grid">
     <Field label="Motivo de cancelación" wide><textarea rows={3} maxLength={1000} required value={reason} onChange={event=>setReason(event.target.value)} placeholder="Describe por qué se cancela la orden."/></Field>
     <Field label={`Importe a devolver · máximo ${money(order.paidCents,order.currency)}`} wide>
      <input type="text" inputMode="decimal" value={refund} onChange={event=>setRefund(event.target.value)} aria-describedby="resolution-refund-help" placeholder="0.00"/>
     </Field>
     <small className="help wide" id="resolution-refund-help">Puedes registrar cero, una devolución parcial o hasta el total cobrado. Esto no modifica ni elimina los cobros originales.</small>
     {needsMethod&&<Field label="Método de devolución" wide>
      <select required value={refundMethod} onChange={event=>setRefundMethod(event.target.value)}>
       <option value="">Selecciona un método</option>
       {availableMethods.map(method=><option key={method.key} value={method.key}>{method.label}</option>)}
      </select>
     </Field>}
    </div>
    {error&&<p className="form-error" role="alert">{error}</p>}
   </div>
   <div className="dialog-actions"><button type="button" className="sc-button secondary" disabled={busy} onClick={onClose}>Volver</button><button type="submit" className="sc-button primary" disabled={busy}>Revisar cancelación</button></div>
  </form>:<>
   <div className="form-body">
    <div className="notice"><AlertTriangle size={17}/><span>Confirma que el motivo y el importe sean correctos antes de registrar. Los cobros originales se conservarán.</span></div>
    <dl className="detail-info resolution-review">
     <div><dt>Orden</dt><dd>{order.folio} · {order.deviceName}</dd></div>
     <div><dt>Motivo</dt><dd>{reason.trim()}</dd></div>
     <div><dt>Importe cobrado</dt><dd>{money(order.paidCents,order.currency)}</dd></div>
     <div><dt>Devolución a registrar</dt><dd>{money(refundCents||0,order.currency)}{needsMethod?` · ${availableMethods.find(method=>method.key===refundMethod)?.label||''}`:''}</dd></div>
    </dl>
    {error&&<p className="form-error" role="alert">{error}</p>}
   </div>
   <div className="dialog-actions"><button type="button" className="sc-button secondary" disabled={busy} onClick={()=>{setError('');setReviewing(false);}}><ArrowLeft size={16}/> Corregir</button><button type="button" className="sc-button primary" disabled={busy} onClick={()=>void confirm()}><CheckCircle2 size={16}/>{busy?'Guardando…':'Confirmar cancelación'}</button></div>
  </>}
 </Modal>;
}
