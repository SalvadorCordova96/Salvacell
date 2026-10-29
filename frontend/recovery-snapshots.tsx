'use client';
import {useEffect,useState} from 'react';
import {Download,RotateCcw} from 'lucide-react';
import {date} from './types';

type Snapshot={id:number;createdAt:string};
export function RecoverySnapshots(){
 const [snapshots,setSnapshots]=useState<Snapshot[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;void fetch('/api/taller?recovery=1',{cache:'no-store'}).then(async response=>{const body=await response.json() as {snapshots?:Snapshot[];error?:string};if(!response.ok)throw new Error(body.error||'No se pudieron cargar las copias.');return body.snapshots||[];}).then(rows=>{if(live)setSnapshots(rows);}).catch(reason=>{if(live)setError(reason instanceof Error?reason.message:'No se pudieron cargar las copias.');});return()=>{live=false;};},[]);
 return <section className="panel settings-card"><div className="section-heading"><div><h2><RotateCcw size={18}/>Copias previas a restauraciones</h2><p>El servidor conserva hasta cinco copias anteriores a una restauración. Contienen datos personales.</p></div></div>{error?<p className="form-error">{error}</p>:snapshots===null?<p className="muted">Cargando copias…</p>:snapshots.length?<ul className="recovery-list">{snapshots.map(snapshot=><li key={snapshot.id}><span>Copia {snapshot.id}<small>{date(snapshot.createdAt,true)}</small></span><a className="sc-button secondary small" href={`/api/taller?recovery=1&id=${snapshot.id}`}><Download size={15}/>Descargar JSON</a></li>)}</ul>:<p className="muted">Todavía no hay restauraciones; se creará una copia antes de la primera.</p>}</section>;
}
