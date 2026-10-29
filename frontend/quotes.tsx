'use client';

import {ToggleButton,ToggleButtonGroup} from '@heroui/react';
import {ArrowRight,ChevronRight,FileText} from 'lucide-react';
import type {ReactNode} from 'react';
import {folio,money,orderDate,type RecordData} from './types';
import {Empty} from './ui';

export function QuotesView({visibleQuotes,quoteFilter,setQuoteFilter,search,query,open,create,openConvertedOrder}:{visibleQuotes:RecordData[];quoteFilter:string;setQuoteFilter:(value:string)=>void;search:(label:string,placeholder:string)=>ReactNode;query:string;open:(record:RecordData,quote?:boolean)=>void;create:()=>void;openConvertedOrder:(id:number)=>void}) {
 return <section className="panel quotes-panel" aria-label="Lista de presupuestos">
  <div className="panel-tools quotes-tools">
   <ToggleButtonGroup className="quotes-filter" selectionMode="single" disallowEmptySelection selectedKeys={[quoteFilter]} onSelectionChange={keys=>{const selected=[...keys][0];if(selected)setQuoteFilter(String(selected));}} aria-label="Filtrar presupuestos">
    <ToggleButton id="pendientes" size="sm">Pendientes</ToggleButton>
    <ToggleButton id="convertidos" size="sm">Convertidos</ToggleButton>
    <ToggleButton id="todos" size="sm">Todos</ToggleButton>
   </ToggleButtonGroup>
   {search('Buscar presupuestos','Folio, cliente, teléfono o equipo')}
  </div>
  {visibleQuotes.length>0?<>
   <div className="table-wrap quotes-desktop-table">
    <table>
     <thead><tr><th>Presupuesto / fecha</th><th>Cliente</th><th>Equipo / reparación</th><th>Estado</th><th className="numeric">Importe</th><th/></tr></thead>
     <tbody>{visibleQuotes.map(quote=>{
      const converted=Boolean(quote.convertedOrderId);
      return <tr key={quote.id}>
       <td><button type="button" className="folio" onClick={()=>open(quote,true)}>{folio(quote.id,true)}</button><small>{orderDate(quote)}</small></td>
       <td><strong>{quote.firstName} {quote.lastName}</strong><small>{quote.phone||'Sin teléfono registrado'}</small></td>
       <td><strong>{quote.brand} {quote.model}</strong><small>{quote.repairType||quote.problem||'Sin reparación especificada'}</small></td>
       <td><span className={`sc-badge ${converted?'terminada':'warning'}`}>{converted?'Convertido':'Pendiente'}</span>{quote.validUntil&&<small>Vigencia: {new Date(`${quote.validUntil}T12:00:00`).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}</small>}</td>
       <td className="numeric"><strong>{money(quote.totalCents,quote.currency)}</strong></td>
       <td className="quotes-row-actions"><button type="button" className="row-button" aria-label={`Abrir ${folio(quote.id,true)}`} onClick={()=>open(quote,true)}><ChevronRight size={18}/></button>{quote.convertedOrderId&&<button type="button" className="quote-order-link" onClick={()=>openConvertedOrder(quote.convertedOrderId!)}>Orden {folio(quote.convertedOrderId)} <ArrowRight size={13}/></button>}</td>
      </tr>;
     })}</tbody>
    </table>
   </div>
   <div className="quotes-mobile-list" aria-label="Presupuestos">
    {visibleQuotes.map(quote=>{
     const converted=Boolean(quote.convertedOrderId);
     return <article className="quote-mobile-row" key={quote.id}>
      <button type="button" className="quote-mobile-open" onClick={()=>open(quote,true)} aria-label={`Abrir ${folio(quote.id,true)} · ${quote.brand} ${quote.model}`}>
       <span className="quote-mobile-icon"><FileText size={17}/></span>
       <span className="quote-mobile-main"><strong>{folio(quote.id,true)} · {quote.brand} {quote.model}</strong><small>{quote.firstName} {quote.lastName} · {quote.repairType||quote.problem||'Presupuesto'}</small></span>
       <span className={`sc-badge ${converted?'terminada':'warning'}`}>{converted?'Convertido':'Pendiente'}</span>
      </button>
      <div className="quote-mobile-meta"><span>{orderDate(quote)}</span><strong>{money(quote.totalCents,quote.currency)}</strong></div>
      {converted&&quote.convertedOrderId&&<button type="button" className="quote-order-link" onClick={()=>openConvertedOrder(quote.convertedOrderId!)}>Abrir orden {folio(quote.convertedOrderId)} <ArrowRight size={14}/></button>}
     </article>;
    })}
   </div>
  </>:<Empty icon={FileText} title={query?'No hay coincidencias':'Aún no hay presupuestos'} description={query?'Prueba con otro folio, cliente o equipo.':'Crea un presupuesto para registrar el equipo, la reparación y el importe acordado.'} action={!query?<button type="button" className="sc-button primary" onClick={create}>Nuevo presupuesto</button>:undefined}/>}
  {visibleQuotes.length>0&&<div className="panel-foot quotes-foot"><span>{visibleQuotes.length} {visibleQuotes.length===1?'presupuesto visible':'presupuestos visibles'}</span></div>}
 </section>;
}
