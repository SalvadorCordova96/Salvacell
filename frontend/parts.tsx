'use client';
import {useMemo,useState,type FormEvent} from 'react';
import {AlertCircle,Check,LoaderCircle,PackageSearch,Plus} from 'lucide-react';
import {Label,SearchField,ToggleButton,ToggleButtonGroup} from '@heroui/react';
import {type PartRequest,type PartStatus,type RecordData,folio,money,date} from './types';

const labels=Object.assign({por_verificar:'Por verificar',solicitada:'Solicitada',disponible:'Disponible',no_disponible:'No disponible'},Object.defineProperties({}, {instalada:{value:'Instalada'},cancelada:{value:'Cancelada'}})) as Record<PartStatus,string>;
type Mutate=(p:Record<string,unknown>)=>Promise<{id:number}>;

export function PartDetail({order,parts=[],add,edit}:{order:RecordData;parts?:PartRequest[];add:()=>void;edit:(part:PartRequest)=>void}){
 return <section className="part-detail"><div className="part-detail-head"><h3>Refacciones internas</h3><button className="link-button" onClick={add}><Plus size={14}/> Agregar refacción</button></div>{parts.length?parts.map(part=><article className="part-detail-entry" key={part.id}><div className="part-detail-head"><p><strong>{part.name}</strong> · {labels[part.status]}</p><button className="link-button" onClick={()=>edit(part)}>Actualizar</button></div>{part.status==='por_verificar'&&<p className="part-pending">Pendiente hasta marcarla manualmente como solicitada o disponible.</p>}{part.status==='no_disponible'&&<p className="part-pending">No disponible: requiere seguimiento o una nueva decisión.</p>}<dl><div><dt>Costo interno</dt><dd>{part.internalCostCents===null?'Por determinar':money(part.internalCostCents,order.currency)}</dd></div><div><dt>Proveedor / calidad</dt><dd>{[part.supplier,part.quality].filter(Boolean).join(' · ')||'Sin registrar'}</dd></div>{part.note&&<div><dt>Nota</dt><dd>{part.note}</dd></div>}<div><dt>Margen tras costo de pieza</dt><dd>{part.internalCostCents===null?'Por determinar':money(order.totalCents-part.internalCostCents,order.currency)}</dd></div></dl></article>):<p className="muted">No hay una refacción requerida en esta orden.</p>}<small>Estimaciones antes de otros gastos. Datos internos: no aparecen en el ticket.</small></section>;
}

export function PartsView({orders,parts,openOrder,editPart}:{orders:RecordData[];parts:PartRequest[];openOrder:(id:number)=>void;editPart:(id:number)=>void}){
 const [query,setQuery]=useState(''),[tab,setTab]=useState<'pendientes'|'todas'>('pendientes');
 const ordersById=useMemo(()=>new Map(orders.map(order=>[order.id,order])),[orders]);
 const pending=parts.filter(p=>p.status==='por_verificar'||p.status==='no_disponible');
 const shown=(tab==='pendientes'?pending:parts).filter(part=>{
  const order=ordersById.get(part.orderId);
  return [part.name,part.supplier,part.quality,folio(part.orderId),order?.firstName,order?.lastName,order?.brand,order?.model]
   .join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
 });
 const emptyTitle=query?'Sin coincidencias':tab==='todas'?'No hay refacciones registradas':'Sin refacciones pendientes';
 const emptyDescription=query?'Busca por pieza, orden, cliente o equipo.':tab==='todas'?'Las refacciones ligadas a órdenes aparecerán aquí.':'Cuando una orden requiera una pieza, aparecerá aquí hasta que su seguimiento cambie.';

 return <section className="panel parts-view">
  <div className="panel-tools parts-controls">
   <ToggleButtonGroup aria-label="Filtrar refacciones" className="parts-status-filter" selectionMode="single" selectedKeys={new Set([tab])} disallowEmptySelection onSelectionChange={keys=>{const key=String(Array.from(keys)[0]??'pendientes');if(key==='pendientes'||key==='todas')setTab(key);}}>
    <ToggleButton id="pendientes">Pendientes<span>{pending.length}</span></ToggleButton>
    <ToggleButton id="todas">Todas<span>{parts.length}</span></ToggleButton>
   </ToggleButtonGroup>
   <SearchField className="parts-search" value={query} onChange={setQuery} aria-label="Buscar refacciones">
    <Label>Buscar refacción</Label>
    <SearchField.Group><SearchField.SearchIcon/><SearchField.Input placeholder="Pieza, orden, cliente o equipo"/><SearchField.ClearButton/></SearchField.Group>
   </SearchField>
  </div>
  {shown.length?<div className="table-wrap">
   <table><thead><tr><th>Orden / cliente</th><th>Refacción</th><th>Estado</th><th>Costo interno</th><th>Seguimiento</th></tr></thead>
    <tbody>{shown.map(part=>{
     const order=ordersById.get(part.orderId);
     return <tr key={part.id}>
      <td data-label="Orden / cliente"><div className="part-cell-value"><button className="folio" aria-label={`Abrir orden ${folio(part.orderId)}`} onClick={()=>openOrder(part.orderId)}>{folio(part.orderId)}</button><small>{order?`${order.firstName} ${order.lastName} · ${order.brand} ${order.model}`:'Orden'}</small></div></td>
      <td data-label="Refacción"><div className="part-cell-value"><strong>{part.name}</strong><small>{[part.supplier,part.quality].filter(Boolean).join(' · ')||date(part.createdAt)}</small></div></td>
      <td data-label="Estado"><div className="part-cell-value"><span className={'part-status '+part.status}>{labels[part.status]}</span></div></td>
      <td data-label="Costo interno"><div className="part-cell-value">{part.internalCostCents===null?'Por determinar':money(part.internalCostCents,order?.currency||'MXN')}</div></td>
      <td data-label="Seguimiento"><div className="part-cell-value"><button className="sc-button small secondary" aria-label={`Actualizar ${part.name}`} onClick={()=>editPart(part.id)}>Actualizar</button></div></td>
     </tr>;
    })}</tbody>
   </table>
  </div>:<div className="empty"><div className="empty-icon"><PackageSearch size={29}/></div><h3>{emptyTitle}</h3><p>{emptyDescription}</p></div>}
  <div className="panel-foot"><span>{shown.length} de {tab==='pendientes'?pending.length:parts.length} {shown.length===1?'refacción':'refacciones'}</span><span>Costos y proveedores solo para uso interno</span></div>
 </section>;
}

export function PartForm({order,part,mutate,close,saved}:{order:RecordData;part?:PartRequest;mutate:Mutate;close:()=>void;saved:()=>void}){
 const [name,setName]=useState(part?.name||''),[status,setStatus]=useState<PartStatus>(part?.status||'por_verificar'),[internalCost,setInternalCost]=useState(part?.internalCostCents===null||part?.internalCostCents===undefined?'':String(part.internalCostCents/100)),[supplier,setSupplier]=useState(part?.supplier||''),[quality,setQuality]=useState(part?.quality||''),[note,setNote]=useState(part?.note||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await mutate(part?{action:'updatePart',id:part.id,revision:part.revision,name,status,internalCost,supplier,quality,note}:{action:'addPart',id:order.id,revision:order.revision,name});saved();}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}}
 return <form onSubmit={submit}><fieldset disabled={busy} className="form-body"><div className="form-grid"><label className="field wide"><span>Refacción requerida *</span><input required maxLength={150} autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Pantalla para Galaxy A54"/></label>{part&&<><label className="field"><span>Estado de la refacción</span><select value={status} onChange={e=>setStatus(e.target.value as PartStatus)}>{Object.entries(labels).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label><label className="field"><span>Costo interno · {order.currency}</span><input type="number" min="0" step="0.01" max="1000000" required={status==='solicitada'||status==='disponible'} value={internalCost} onChange={e=>setInternalCost(e.target.value)} placeholder="Capturar al resolver"/></label><label className="field"><span>Proveedor</span><input maxLength={120} value={supplier} onChange={e=>setSupplier(e.target.value)}/></label><label className="field"><span>Calidad</span><input maxLength={100} value={quality} onChange={e=>setQuality(e.target.value)} placeholder="Ej. Original / compatible"/></label><label className="field wide"><span>Nota de seguimiento</span><textarea rows={2} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label></>}</div><p className="help">{part?'Solicitada y disponible resuelven el aviso. No disponible permanece para seguimiento.':'Se creará un aviso persistente por verificar. El costo se captura después.'} El costo interno nunca se imprime en tickets.</p>{part&&status!=='por_verificar'&&status!=='no_disponible'&&internalCost!==''&&<p className="help">Margen estimado tras pieza: {money(order.totalCents-Math.round(Number(internalCost)*100),order.currency)} (antes de otros gastos).</p>}{error&&<p role="alert" className="form-error"><AlertCircle size={17}/>{error}</p>}</fieldset><div className="dialog-actions"><button type="button" className="sc-button secondary" disabled={busy} onClick={close}>Cancelar</button><button className="sc-button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<Check size={17}/>}Guardar refacción</button></div></form>;
}
