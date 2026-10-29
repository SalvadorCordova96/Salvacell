'use client';

import {useState,type FormEvent} from 'react';
import {CheckCircle2,ShieldCheck} from 'lucide-react';
import {Field} from './ui';
import type {WarrantyClaim} from './types';

export type WarrantyClaimStatus='recibida'|'en_revision'|'esperando_pieza'|'resuelta'|'cerrada';

export type WarrantyClaimSubmission={
 orderId:number;
 reason:string;
 status:WarrantyClaimStatus;
 outcome:string;
 id?:number;
 revision?:number;
};

type Props={
 order:{id:number;folio:string;customerName:string;deviceName:string};
 existingClaim?:WarrantyClaim;
 onSave:(claim:WarrantyClaimSubmission)=>void|Promise<void>;
 onClose:()=>void;
 saving?:boolean;
};

const statusOptions:{value:WarrantyClaimStatus;label:string}[]=[
 {value:'recibida',label:'Recibida'},
 {value:'en_revision',label:'En revisión'},
 {value:'esperando_pieza',label:'Esperando pieza'},
 {value:'resuelta',label:'Resuelta'},
 {value:'cerrada',label:'Cerrada'},
];

/** Captures a service follow-up linked to the original order without asserting
 * legal eligibility, coverage, or warranty terms.
 */
export function WarrantyClaimPanel({order,existingClaim,onSave,onClose,saving=false}:Props){
 const [reason,setReason]=useState(existingClaim?.reason||'');
 const [status,setStatus]=useState<WarrantyClaimStatus>(existingClaim?.status||'recibida');
 const [outcome,setOutcome]=useState(existingClaim?.outcome||'');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const isSaving=saving||busy;
 const outcomeRequired=status==='resuelta'||status==='cerrada';

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError('');
  if(!reason.trim()){setError('Describe el motivo o problema reportado.');return;}
  if(outcomeRequired&&!outcome.trim()){setError('Registra el resultado o la solución antes de cerrar el seguimiento.');return;}
  setBusy(true);
  try{
   await onSave({orderId:order.id,reason:reason.trim(),status,outcome:outcome.trim(),...(existingClaim?{id:existingClaim.id,revision:existingClaim.revision}:{})});
   onClose();
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo guardar el seguimiento.');}
  finally{setBusy(false);}
 }

 return <form className="panel warranty-claim-panel" onSubmit={event=>void submit(event)}>
  <div className="section-heading"><div><h2><ShieldCheck size={19}/>{existingClaim?'Actualizar seguimiento de garantía':'Seguimiento de garantía'}</h2><p>{existingClaim?'Actualiza el mismo reclamo conservando su historial de auditoría.':'Registra el seguimiento asociado a una orden original.'} La elegibilidad y las condiciones se determinan según la información del taller.</p></div></div>
  <div className="form-body">
   <div className="notice"><ShieldCheck size={17}/><span>Este registro no determina por sí solo si una reparación está cubierta ni agrega condiciones legales.</span></div>
   <div className="form-section-title"><span>ORDEN ORIGINAL</span><h3>{order.folio}</h3></div>
   <dl className="detail-info warranty-order-context">
    <div><dt>Cliente</dt><dd>{order.customerName}</dd></div>
    <div><dt>Equipo</dt><dd>{order.deviceName}</dd></div>
   </dl>
   <div className="form-grid">
    <Field label="Motivo o problema reportado" wide><textarea required rows={3} maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Describe qué reportó el cliente."/></Field>
    <Field label="Estado del seguimiento" wide><select value={status} onChange={event=>setStatus(event.target.value as WarrantyClaimStatus)}>{statusOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
    <Field label={outcomeRequired?'Resultado o solución':'Resultado o solución (si ya se conoce)'} wide><textarea rows={3} maxLength={2000} required={outcomeRequired} value={outcome} onChange={event=>setOutcome(event.target.value)} placeholder="Anota el diagnóstico, el resultado o la solución aplicada."/></Field>
   </div>
   {error&&<p className="form-error" role="alert">{error}</p>}
  </div>
  <div className="dialog-actions"><button type="button" className="sc-button secondary" disabled={isSaving} onClick={onClose}>Cancelar</button><button type="submit" className="sc-button primary" disabled={isSaving}><CheckCircle2 size={16}/>{isSaving?'Guardando…':existingClaim?'Actualizar seguimiento':'Guardar seguimiento'}</button></div>
 </form>;
}
