'use client';
import {useState,type FormEvent} from 'react';
import {Check,ShieldCheck} from 'lucide-react';
import {type Settings} from './types';
import {type Mutation} from './ui';

export function WarrantySettings({settings,mutate,notify}:{settings:Settings;mutate:(payload:Mutation)=>Promise<unknown>;notify:(message:string)=>void}){
 const [terms,setTerms]=useState(settings.warrantyTerms||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{await mutate({action:'warrantyTerms',warrantyTerms:terms,revision:settings.revision});notify('Términos de garantía guardados');}catch(e){setError(e instanceof Error?e.message:'No se pudieron guardar los términos.');}finally{setBusy(false);}}
 return <form className="panel settings-card" onSubmit={save}><div className="section-heading"><div><h2><ShieldCheck size={19}/>Garantía en entregas</h2><p>Estos términos se imprimirán en el comprobante de entrega; no se agregan a órdenes históricas.</p></div></div><label className="field"><span>Términos de garantía</span><textarea rows={4} maxLength={2000} value={terms} onChange={event=>setTerms(event.target.value)} placeholder="Escribe las condiciones que entrega tu taller junto con el equipo."/><small>{terms.length}/2000 · Si se deja vacío, el ticket no afirmará condiciones.</small></label>{error&&<p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="sc-button primary" disabled={busy||terms===(settings.warrantyTerms||'')}><Check size={16}/>{busy?'Guardando…':'Guardar términos'}</button></div></form>;
}
