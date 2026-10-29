'use client';
import {useEffect,useMemo,useState} from 'react';
import {ChevronDown,ChevronRight,Database,Download,Search} from 'lucide-react';
import {Button,Label,ListBox,Select,ToggleButton} from '@heroui/react';
import {type BootData,folio,saleFolio,money,date,orderDate,paymentDate,statusLabels} from './types';
import {availabilityLabel,methodLabel,normalize,partStatusLabel,paymentLabel} from '@/lib/format';
import {Modal} from './ui';

type Tab='orders'|'quotes'|'products'|'sales'|'payments'|'parts'|'suppliers'|'partQuotes'|'priceRequests';
type Row={key:string;values:Record<string,string>;sort:Record<string,string|number>;orderId?:number};
type Column={key:string;label:string};
type Dataset={label:string;columns:Column[];rows:Row[];defaults:string[]};
const names:Record<Tab,string>={orders:'Órdenes',quotes:'Presupuestos',products:'Productos',sales:'Ventas',payments:'Pagos',parts:'Refacciones',suppliers:'Proveedores',partQuotes:'Precios de piezas',priceRequests:'Solicitudes'};
const formatRow=(key:string,values:Record<string,string>,sort:Record<string,string|number>={},orderId?:number):Row=>({key,values,sort,orderId});
function build(data:BootData):Record<Tab,Dataset>{
 const columns=(pairs:[string,string][])=>pairs.map(([key,label])=>({key,label}));
 return {
  orders:{label:'Órdenes',columns:columns([['folio','Folio'],['legacy','Folio anterior'],['date','Fecha'],['client','Cliente'],['phone','Teléfono'],['device','Equipo'],['status','Estado'],['total','Total'],['paid','Cobrado'],['due','Adeudo'],['problem','Problema'],['repair','Reparación']]),defaults:['folio','legacy','date','client','device','status','due'],rows:data.orders.map(o=>formatRow(`o:${o.id}`,{folio:folio(o.id),legacy:o.legacyOrderNumber||'—',date:orderDate(o,true),client:`${o.firstName} ${o.lastName}`,phone:o.phone,device:`${o.brand} ${o.model}`,status:statusLabels[o.status||'nueva'],total:money(o.totalCents,o.currency),paid:money(o.paidCents,o.currency),due:money(o.dueCents,o.currency),problem:o.problem||'—',repair:o.repairType||'—'},{folio:o.id,legacy:o.legacyOrderNumber||'',date:o.createdAt,total:o.totalCents,paid:o.paidCents,due:o.dueCents},o.id))},
  quotes:{label:'Presupuestos',columns:columns([['folio','Folio'],['date','Fecha'],['client','Cliente'],['phone','Teléfono'],['device','Equipo'],['repair','Reparación'],['total','Total'],['conversion','Orden creada']]),defaults:['folio','date','client','device','total','conversion'],rows:data.quotes.map(q=>formatRow(`q:${q.id}`,{folio:folio(q.id,true),date:date(q.createdAt,true),client:`${q.firstName} ${q.lastName}`,phone:q.phone,device:`${q.brand} ${q.model}`,repair:q.repairType||'—',total:money(q.totalCents,q.currency),conversion:q.convertedOrderId?folio(q.convertedOrderId):'Pendiente'},{folio:q.id,date:q.createdAt,total:q.totalCents},q.convertedOrderId||undefined))},
  products:{label:'Productos e inventario',columns:columns([['id','ID interno'],['sku','Código'],['name','Producto'],['category','Categoría'],['glassCompatibility','Compatibilidad'],['price','Precio de venta'],['cost','Costo de compra'],['currency','Moneda'],['stock','Existencia'],['minimumStock','Stock mínimo'],['suppliers','Proveedores'],['active','Estado'],['createdAt','Creado'],['updatedAt','Actualizado']]),defaults:['id','sku','name','category','glassCompatibility','price','cost','currency','stock','minimumStock','suppliers','active'],rows:data.products.map(p=>formatRow(`p:${p.id}`,{id:String(p.id),sku:p.sku||'—',name:p.name,category:p.category||'—',glassCompatibility:p.glassCompatibility||'—',price:money(p.priceCents,p.currency),cost:money(p.costCents,p.currency),currency:p.currency,stock:p.stock===null?'Pendiente de conteo':String(p.stock),minimumStock:p.minimumStock===null?'No definido':String(p.minimumStock),suppliers:p.supplierIds.map(id=>data.suppliers.find(supplier=>supplier.id===id)?.name).filter(Boolean).join(' · ')||'Sin proveedor asignado',active:p.active?'Activo':'Inactivo',createdAt:date(p.createdAt,true),updatedAt:date(p.updatedAt,true)},{id:p.id,price:p.priceCents??-1,stock:p.stock??-1,minimumStock:p.minimumStock??-1}))},
  sales:{label:'Ventas',columns:columns([['folio','Folio'],['date','Fecha'],['items','Accesorios'],['order','Orden'],['orderPayment','Pago de orden'],['total','Total'],['method','Método']]),defaults:['folio','date','items','order','total','method'],rows:data.sales.map(s=>formatRow(`s:${s.id}`,{folio:saleFolio(s.id),date:date(s.createdAt,true),items:s.items.map(i=>`${i.quantity}× ${i.productName}`).join(', ')||'—',order:s.orderId?folio(s.orderId):'—',orderPayment:s.orderId?money(s.orderPaymentCents,s.currency):'—',total:money(s.totalCents,s.currency),method:methodLabel(s.method)},{folio:s.id,date:s.createdAt,orderPayment:s.orderPaymentCents,total:s.totalCents},s.orderId||undefined))},
  payments:{label:'Pagos y anticipos',columns:columns([['id','ID'],['date','Fecha'],['order','Orden'],['client','Cliente'],['kind','Concepto'],['amount','Importe'],['method','Método'],['notes','Nota']]),defaults:['id','date','order','client','kind','amount','method'],rows:data.payments.map(p=>formatRow(`a:${p.id}`,{id:String(p.id),date:paymentDate(p,true),order:folio(p.orderId),client:`${p.firstName} ${p.lastName}`,kind:paymentLabel(p.kind),amount:money(p.amountCents,p.currency),method:methodLabel(p.method),notes:p.notes||'—'},{id:p.id,date:p.createdAt,amount:p.amountCents},p.orderId))},
  parts:{label:'Refacciones',columns:columns([['id','ID'],['order','Orden'],['name','Pieza'],['status','Estado'],['cost','Costo interno'],['supplier','Proveedor'],['quality','Calidad'],['date','Actualizada']]),defaults:['order','name','status','cost','supplier','date'],rows:data.partRequests.map(p=>{const order=data.orders.find(o=>o.id===p.orderId);return formatRow(`r:${p.id}`,{id:String(p.id),order:folio(p.orderId),name:p.name,status:partStatusLabel(p.status),cost:p.internalCostCents===null?'Por determinar':money(p.internalCostCents,order?.currency||'MXN'),supplier:p.supplier||'—',quality:p.quality||'—',date:date(p.updatedAt,true)},{id:p.id,cost:p.internalCostCents??-1,date:p.updatedAt},p.orderId);})},
  suppliers:{label:'Proveedores',columns:columns([['id','ID'],['name','Proveedor'],['phone','Teléfono'],['notes','Notas'],['active','Estado']]),defaults:['id','name','phone','active'],rows:data.suppliers.map(s=>formatRow(`sp:${s.id}`,{id:String(s.id),name:s.name,phone:s.phone||'—',notes:s.notes||'—',active:s.active?'Activo':'Inactivo'},{id:s.id,name:s.name}))},
  partQuotes:{label:'Precios de piezas',columns:columns([['id','ID'],['date','Fecha'],['device','Equipo'],['part','Pieza'],['supplier','Proveedor'],['quality','Calidad'],['availability','Disponibilidad'],['cost','Costo'],['offered','Precio ofrecido']]),defaults:['date','device','part','supplier','cost','offered'],rows:data.partQuotes.map(q=>formatRow(`pq:${q.id}`,{id:String(q.id),date:date(q.quotedAt,true),device:`${q.brand} ${q.model}`,part:q.partName,supplier:q.supplierName,quality:q.quality||'—',availability:availabilityLabel(q.availability),cost:money(q.costCents,q.currency),offered:q.clientPriceCents===null?'—':money(q.clientPriceCents,q.currency)},{id:q.id,date:q.quotedAt,cost:q.costCents,offered:q.clientPriceCents??-1},q.partRequestId?data.partRequests.find(p=>p.id===q.partRequestId)?.orderId:undefined))},
  priceRequests:{label:'Solicitudes de precio',columns:columns([['id','ID'],['date','Fecha'],['device','Equipo'],['part','Pieza'],['status','Estado'],['notes','Notas']]),defaults:['id','date','device','part','status'],rows:data.priceRequests.map(r=>formatRow(`pr:${r.id}`,{id:String(r.id),date:date(r.createdAt,true),device:`${r.brand} ${r.model}`,part:r.partName,status:r.status,notes:r.notes||'—'},{id:r.id,date:r.createdAt},r.partRequestId?data.partRequests.find(p=>p.id===r.partRequestId)?.orderId:undefined))},
 };
}

type AuditEntry={id:number;entity:string;entityId:number;action:string;detail:string;createdAt:string};
type StockEntry={id:number;productId:number;productName:string|null;sku:string|null;delta:number;reason:string;note:string;createdAt:string};
function AuditPanel(){
 const [state,setState]=useState<{auditLog:AuditEntry[];stockMovements:StockEntry[]}|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;void fetch('/api/taller?audit=1',{cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error('No se pudo cargar la bitácora.');return response.json() as Promise<{auditLog:AuditEntry[];stockMovements:StockEntry[]}>;}).then(value=>{if(live)setState(value);}).catch(reason=>{if(live)setError(reason instanceof Error?reason.message:'No se pudo cargar la bitácora.');});return()=>{live=false;};},[]);
 if(error)return <section className="panel audit-panel"><p className="form-error">{error}</p></section>;
 if(!state)return <section className="panel audit-panel"><p className="muted">Cargando bitácora…</p></section>;
 return <section className="panel audit-panel"><div className="section-heading"><div><h2>Bitácora y movimientos de inventario</h2><p>Últimos 500 movimientos registrados por el servidor.</p></div></div><div className="audit-columns"><div><h3>Inventario</h3>{state.stockMovements.length?<div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Ajuste</th><th>Motivo</th></tr></thead><tbody>{state.stockMovements.map(item=><tr key={`stock-${item.id}`}><td>{date(item.createdAt,true)}</td><td>{item.productName||item.sku||`Producto ${item.productId}`}<small>{item.note||'—'}</small></td><td className={item.delta<0?'due':'paid'}>{item.delta>0?'+':''}{item.delta}</td><td>{item.reason}</td></tr>)}</tbody></table></div>:<p className="muted">Sin movimientos de inventario.</p>}</div><div><h3>Auditoría</h3>{state.auditLog.length?<div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Entidad</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>{state.auditLog.map(item=><tr key={`audit-${item.id}`}><td>{date(item.createdAt,true)}</td><td>{item.entity} · {item.entityId}</td><td>{item.action}</td><td>{item.detail||'—'}</td></tr>)}</tbody></table></div>:<p className="muted">Sin eventos de auditoría.</p>}</div></div></section>;
}

export function DataView({data,openOrder}:{data:BootData;openOrder:(id:number)=>void}){
 const datasets=useMemo(()=>build(data),[data]);
 const [tab,setTab]=useState<Tab>('orders'),[query,setQuery]=useState(''),[sort,setSort]=useState('date'),[descending,setDescending]=useState(true),[selected,setSelected]=useState<string|null>(null),[columnPicker,setColumnPicker]=useState(false),[visible,setVisible]=useState<Partial<Record<Tab,string[]>>>({}),[auditOpen,setAuditOpen]=useState(false);
 const dataset=datasets[tab],activeColumns=dataset.columns.filter(c=>(visible[tab]||dataset.defaults).includes(c.key));
 const rows=dataset.rows.filter(row=>normalize(Object.values(row.values).join(' ')).includes(normalize(query.trim()))).toSorted((a,b)=>{const left=a.sort[sort]??a.values[sort]??'',right=b.sort[sort]??b.values[sort]??'';const compare=typeof left==='number'&&typeof right==='number'?left-right:String(left).localeCompare(String(right),'es',{numeric:true});return descending?-compare:compare;});
 const active=dataset.rows.find(r=>r.key===selected);
 function changeTab(next:Tab){setTab(next);setQuery('');setSelected(null);setSort(next==='products'||next==='suppliers'?'name':next==='orders'||next==='quotes'||next==='sales'||next==='payments'||next==='parts'||next==='partQuotes'||next==='priceRequests'?'date':'id');setDescending(true);setColumnPicker(false);}
 function chooseSort(key:string){if(sort===key)setDescending(v=>!v);else{setSort(key);setDescending(false);}}
 function toggleColumn(key:string){const current=visible[tab]||dataset.defaults;if(current.includes(key)&&current.length===1)return;setVisible(v=>({...v,[tab]:current.includes(key)?current.filter(c=>c!==key):[...current,key]}));}
 function exportCsv(){const escape=(value:string)=>`"${value.replace(/"/g,'""')}"`;const csv='\ufeff'+[activeColumns.map(c=>c.label),...rows.map(row=>activeColumns.map(c=>row.values[c.key]??''))].map(row=>row.map(escape).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`salvacel-${tab}.csv`;link.click();URL.revokeObjectURL(url);}
 function exportCompleteCatalog(){const headers=['ID interno','Código/SKU','Producto','Categoría','Compatibilidad','Precio de venta','Costo de compra','Moneda','Existencia','Stock mínimo','IDs de proveedores','Proveedores','Activo','Revisión','Creado','Actualizado'];const rows=data.products.map(product=>[String(product.id),product.sku,product.name,product.category,product.glassCompatibility,product.priceCents===null?'':(product.priceCents/100).toFixed(2),product.costCents===null?'':(product.costCents/100).toFixed(2),product.currency,product.stock===null?'':String(product.stock),product.minimumStock===null?'':String(product.minimumStock),product.supplierIds.join('|'),product.supplierIds.map(id=>data.suppliers.find(supplier=>supplier.id===id)?.name).filter(Boolean).join(' | '),product.active?'Sí':'No',String(product.revision),product.createdAt,product.updatedAt]);const escape=(value:string)=>`"${value.replace(/"/g,'""')}"`;const csv='\ufeff'+[headers,...rows].map(row=>row.map(escape).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`salvacel-catalogo-accesorios-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url);}
 return (
  <section className="panel data-explorer">
   <div className="data-nav">
    <Select aria-label="Conjunto de datos" className="data-table-select" value={tab} onChange={value=>{if(typeof value==='string'&&value in names)changeTab(value as Tab);}}>
     <Label>Conjunto de datos</Label><Select.Trigger><Select.Value/><Select.Indicator/></Select.Trigger>
     <Select.Popover><ListBox>{(Object.keys(names) as Tab[]).map(k=><ListBox.Item key={k} id={k} textValue={names[k]}>{names[k]} <span className="data-option-count">{datasets[k].rows.length}</span><ListBox.ItemIndicator/></ListBox.Item>)}</ListBox></Select.Popover>
    </Select>
    <ToggleButton isSelected={auditOpen} onChange={setAuditOpen} aria-label="Mostrar bitácora">Bitácora</ToggleButton>
   </div>
   <div className="data-tools">
    <div className="search"><Search size={17}/><input aria-label={`Buscar en ${dataset.label}`} placeholder={`Buscar en ${dataset.label.toLowerCase()}`} value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="data-columns">
     {tab==='products'&&<Button variant="secondary" size="sm" onPress={exportCompleteCatalog}><Download size={15}/>Descargar catálogo completo</Button>}
     <Button variant="secondary" size="sm" onPress={exportCsv}><Download size={15}/>Exportar CSV</Button>
     <Button variant="secondary" size="sm" aria-expanded={columnPicker} onPress={()=>setColumnPicker(v=>!v)}>Columnas <ChevronDown size={15}/></Button>
     {columnPicker&&<div className="data-column-menu">{dataset.columns.map(c=><label key={c.key}><input type="checkbox" checked={activeColumns.some(a=>a.key===c.key)} onChange={()=>toggleColumn(c.key)}/>{c.label}</label>)}</div>}
    </div>
   </div>
   {tab==='products'&&<p className="data-export-note">La descarga completa incluye todos los productos, precios, existencias y proveedores vinculados; no cambia el catálogo.</p>}
   <div className="table-wrap">
    <table>
     <thead><tr>{activeColumns.map(c=><th key={c.key}><button className="data-sort" onClick={()=>chooseSort(c.key)} aria-label={`Ordenar por ${c.label}`}>{c.label}{sort===c.key?(descending?' ↓':' ↑'):''}</button></th>)}<th aria-label="Abrir ficha"/></tr></thead>
     <tbody>{rows.map(row=><tr key={row.key}>{activeColumns.map(c=><td key={c.key}>{row.values[c.key]}</td>)}<td><button className="row-button" aria-label={`Abrir ficha ${row.values[activeColumns[0]?.key]||row.key}`} onClick={()=>setSelected(row.key)}><ChevronRight size={17}/></button></td></tr>)}</tbody>
    </table>
    {!rows.length&&<div className="data-empty"><Database size={28}/><p>{query?'No hay coincidencias.':'Esta tabla todavía no tiene registros.'}</p></div>}
   </div>
   <div className="panel-foot">{rows.length} registros <span>Identificadores estables por tabla</span></div>
   {active&&<Modal sheet title={active.values.folio||active.values.name||active.values.order||active.key} eyebrow={dataset.label.toUpperCase()} close={()=>setSelected(null)}>
    <dl className="data-sheet-fields">{dataset.columns.map(c=><div key={c.key}><dt>{c.label}</dt><dd>{active.values[c.key]}</dd></div>)}</dl>
    {active.orderId&&<button className="sc-button primary data-sheet-action" onClick={()=>{setSelected(null);openOrder(active.orderId!);}}>Abrir {folio(active.orderId)}</button>}
   </Modal>}
   {auditOpen&&<AuditPanel/>}
  </section>
 );
}
