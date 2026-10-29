'use client';

import { AlertTriangle, ArrowUpRight, Boxes, CalendarClock, CheckCircle2, ClipboardList, Coins, PackageSearch, Phone, ShoppingBag, Wallet } from 'lucide-react';
import { type BootData, folio, money, orderDate } from './types';

export function HomeView({ data, openView, openOrder }: { data: BootData; openView: (view: 'orders' | 'payments' | 'parts' | 'pos') => void; openOrder: (id: number) => void }) {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const localDate = (value: string) => new Intl.DateTimeFormat('en-CA', { timeZone: data.settings.timezone }).format(new Date(value));
  const today = localDate(new Date().toISOString());
  const ready = data.orders.filter(order => order.status === 'terminada');
  const overdue = data.orders.filter(order => order.promisedDate && new Date(order.promisedDate + 'T23:59:59').getTime() < now && !['entregada', 'cancelada'].includes(order.status || ''));
  const overdueDebt = data.orders.filter(order => order.dueCents > 0 && now - new Date(order.createdAt).getTime() > data.settings.overdueDays * 86400000);
  const pendingParts = data.partRequests.filter(part => part.status === 'por_verificar' || part.status === 'no_disponible');
  const lowStock = data.products.filter(product => product.active && product.stock !== null && product.stock <= data.settings.lowStockThreshold);
  const todayPayments = data.payments.filter(payment => localDate(payment.createdAt) === today && !payment.voidedAt && payment.kind !== 'ajuste_historico');
  const todaySales = data.sales.filter(sale => localDate(sale.createdAt) === today && !sale.voidedAt);
  const todayOrders = data.orders.filter(order => localDate(order.createdAt) === today);
  const urgent = data.orders
    .filter(order => !['entregada', 'cancelada'].includes(order.status || ''))
    .sort((a, b) => {
      const overdueA = overdue.includes(a), overdueB = overdue.includes(b);
      if (overdueA !== overdueB) return overdueA ? -1 : 1;
      const dateA = a.promisedDate || '9999-12-31', dateB = b.promisedDate || '9999-12-31';
      return dateA.localeCompare(dateB) || (a.createdAt || '').localeCompare(b.createdAt || '');
    }).slice(0, 8);
  return <div className="home-page">
    <section className="home-workbench" aria-label="Accesos directos">
      <div className="home-workbench-title"><p className="eyebrow">ACCESOS DIRECTOS</p><h2>Operación de mostrador</h2></div>
      <div className="home-actions">
        <button className="home-action home-action-primary" onClick={() => openView('pos')}><span className="home-action-icon"><ShoppingBag size={20}/></span><span><strong>Punto de venta</strong><small>Registrar una venta de accesorios</small></span><ArrowUpRight className="home-action-arrow" size={18}/></button>
        <button className="home-action" onClick={() => openView('orders')}><span className="home-action-icon"><ClipboardList size={20}/></span><span><strong>Órdenes</strong><small>Buscar y actualizar reparaciones</small></span><ArrowUpRight className="home-action-arrow" size={18}/></button>
      </div>
    </section>

    <div className="home-cards">
      <button className="home-card home-card-ready" onClick={() => openView('orders')}><CheckCircle2/><span>Listos para entregar</span><strong>{ready.length}</strong><small>{money(ready.filter(o => o.currency === 'MXN').reduce((sum, o) => sum + o.dueCents, 0), 'MXN')} · {money(ready.filter(o => o.currency === 'USD').reduce((sum, o) => sum + o.dueCents, 0), 'USD')}</small></button>
      <button className="home-card home-card-overdue" onClick={() => openView('orders')}><CalendarClock/><span>Entregas vencidas</span><strong>{overdue.length}</strong><small>Revisa las fechas prometidas</small></button>
      <button className="home-card home-card-parts" onClick={() => openView('parts')}><PackageSearch/><span>Refacciones pendientes</span><strong>{pendingParts.length}</strong><small>Por verificar o no disponibles</small></button>
      <button className="home-card home-card-debt" onClick={() => openView('payments')}><AlertTriangle/><span>Adeudos con antigüedad</span><strong>{overdueDebt.length}</strong><small>Más de {data.settings.overdueDays} días</small></button>
      <button className="home-card home-card-stock" onClick={() => openView('pos')}><Boxes/><span>Stock bajo</span><strong>{lowStock.length}</strong><small>Umbral: {data.settings.lowStockThreshold} unidades</small></button>
    </div>

    <section className="panel home-today"><div className="section-heading"><div><h2>Hoy</h2><p>Movimientos registrados en la fecha local · {todayOrders.length} órdenes nuevas.</p></div><Wallet size={20}/></div><div className="home-totals">
      <div><span><Coins size={15}/>Cobros de órdenes</span><strong>{money(todayPayments.filter(p => p.currency === 'MXN').reduce((sum, p) => sum + p.amountCents, 0), 'MXN')}</strong><small>{todayPayments.length} movimientos · {money(todayPayments.filter(p => p.currency === 'USD').reduce((sum, p) => sum + p.amountCents, 0), 'USD')}</small></div>
      <div><span><Coins size={15}/>Ventas de accesorios</span><strong>{money(todaySales.filter(s => s.currency === 'MXN').reduce((sum, s) => sum + Math.max(0, s.totalCents - s.orderPaymentCents), 0), 'MXN')}</strong><small>{todaySales.length} ventas · {money(todaySales.filter(s => s.currency === 'USD').reduce((sum, s) => sum + Math.max(0, s.totalCents - s.orderPaymentCents), 0), 'USD')}</small></div>
    </div></section>

    <section className="panel home-urgent"><div className="section-heading"><div><h2>Para hoy</h2><p>Vencidas primero, luego por fecha prometida y antigüedad.</p></div><AlertTriangle size={20}/></div>
      {urgent.length ? <div className="home-order-list">{urgent.map(order => <article key={order.id}><button className="folio" onClick={() => openOrder(order.id)}>{folio(order.id)}</button><div><strong>{order.firstName} {order.lastName}</strong><small>{order.brand} {order.model} · {orderDate(order)}</small></div><b>{money(order.dueCents, order.currency)}</b><div className="home-contact">{order.phone.replace(/\D/g, '').length >= 10 && <a href={'tel:' + order.phone.replace(/[^+\d]/g, '')} aria-label={`Llamar a ${order.firstName}`}><Phone size={16}/></a>}</div></article>)}</div> : <div className="home-empty"><CheckCircle2 size={25}/><p>No hay pendientes urgentes.</p></div>}
    </section>
  </div>;
}
