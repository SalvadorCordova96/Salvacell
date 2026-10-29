'use client';

import { AlertCircle, Coins, TrendingUp, Wallet } from 'lucide-react';
import { type BootData, type Currency, money } from './types';

const monthLabel = (value: string) => new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', month: 'short', year: '2-digit' }).format(new Date(value + 'T12:00:00Z'));

export function SummaryView({ data }: { data: BootData }) {
  const currencies = (['MXN', 'USD'] as Currency[]).filter(currency => data.orders.some(order => order.currency === currency));
  if (!data.orders.length) return <section className="panel summary-empty"><Coins size={30}/><h2>Aún no hay movimiento</h2><p>Cuando registres órdenes, aquí verás ingresos, adeudos y costos conocidos.</p></section>;

  return <div className="summary-page">{currencies.map(currency => {
    const orders = data.orders.filter(order => order.currency === currency);
    const orderIds = new Set(orders.map(order => order.id));
    const parts = data.partRequests.filter(part => orderIds.has(part.orderId));
    const repairs = data.orderRepairs.filter(repair => orderIds.has(repair.orderId));
    const resolutions = (data.orderResolutions || []).filter(entry => orderIds.has(entry.orderId) && entry.currency === currency);
    const refunds = resolutions.filter(entry => entry.kind === 'refund');
    const refunded = refunds.reduce((sum, entry) => sum + entry.amountCents, 0);

    let knownCost = 0;
    let knownCostEntries = 0;
    let unknownCostEntries = 0;
    const costsByOrder = new Map<number, number>();
    for (const order of orders) {
      const orderRepairs = repairs.filter(repair => repair.orderId === order.id);
      const orderParts = parts.filter(part => part.orderId === order.id);
      if (orderRepairs.length) {
        for (const repair of orderRepairs) {
          if (repair.partCostCents !== null) {
            knownCost += repair.partCostCents;
            knownCostEntries += 1;
            costsByOrder.set(order.id, (costsByOrder.get(order.id) || 0) + repair.partCostCents);
            continue;
          }
          const linked = orderParts.filter(part => part.repairId === repair.id);
          const linkedKnown = linked.filter(part => part.internalCostCents !== null);
          if (linkedKnown.length) {
            for (const part of linkedKnown) {
              const amount = part.internalCostCents || 0;
              knownCost += amount;
              knownCostEntries += 1;
              costsByOrder.set(order.id, (costsByOrder.get(order.id) || 0) + amount);
            }
          } else if (repair.partName || linked.length) unknownCostEntries += 1;
        }
      } else {
        for (const part of orderParts) {
          if (part.internalCostCents === null) unknownCostEntries += 1;
          else {
            knownCost += part.internalCostCents;
            knownCostEntries += 1;
            costsByOrder.set(order.id, (costsByOrder.get(order.id) || 0) + part.internalCostCents);
          }
        }
      }
    }

    const billed = orders.filter(order => order.status !== 'cancelada').reduce((sum, order) => sum + order.totalCents, 0);
    const grossPaid = orders.reduce((sum, order) => sum + order.paidCents, 0);
    const netCollected = grossPaid - refunded;
    const due = orders.filter(order => order.status !== 'cancelada').reduce((sum, order) => sum + order.dueCents, 0);
    const months = new Map<string, { billed: number; collected: number; cost: number }>();
    for (const order of orders) {
      const key = (order.legacyOrderDate || order.createdAt.slice(0, 10)).slice(0, 7);
      const row = months.get(key) || { billed: 0, collected: 0, cost: 0 };
      const canceled = order.status === 'cancelada';
      if (!canceled) row.billed += order.totalCents;
      row.collected += order.paidCents;
      row.cost += costsByOrder.get(order.id) || 0;
      row.collected -= refunds.filter(entry => entry.orderId === order.id).reduce((sum, entry) => sum + entry.amountCents, 0);
      months.set(key, row);
    }
    const rows = [...months.entries()].sort(([a], [b]) => a.localeCompare(b));
    const maximum = Math.max(1, ...rows.flatMap(([, row]) => [row.billed, row.collected, row.cost]));

    return <section key={currency} className="summary-currency">
      <header className="summary-title"><div><p className="eyebrow">RESULTADOS · {currency}</p><h2>Movimiento del taller</h2></div><span>{orders.length} órdenes</span></header>
      <div className="summary-cards">
        <article><span><Coins size={18}/>Total registrado</span><strong>{money(billed, currency)}</strong><small>Órdenes activas; se excluyen las canceladas</small></article>
        <article><span><Wallet size={18}/>Ingreso neto cobrado</span><strong>{money(netCollected, currency)}</strong><small>Adeudo activo: {money(due, currency)} · Devoluciones: {money(refunded, currency)}</small></article>
        <article><span><TrendingUp size={18}/>Resultado aproximado</span><strong>{money(netCollected - knownCost, currency)}</strong><small>Cobrado neto menos costos de refacción conocidos</small></article>
        <article><span>Costo de refacción conocido</span><strong>{money(knownCost, currency)}</strong><small>{knownCostEntries} costos registrados; {unknownCostEntries} desconocidos</small></article>
      </div>
      {unknownCostEntries > 0 && <div className="summary-warning"><AlertCircle size={18}/><span>Hay {unknownCostEntries} costos de refacción sin documentar. No se cuentan como cero; el resultado es aproximado.</span></div>}
      <section className="panel summary-chart"><div className="section-heading"><div><h2>Movimiento por mes</h2><span>Facturado, cobrado neto de devoluciones y costo conocido</span></div></div>
        <div className="chart-legend"><span className="billed">Registrado</span><span className="collected">Cobrado neto</span><span className="cost">Costo conocido</span></div>
        <div className="chart-table">{rows.map(([month, row]) => <div className="chart-row" key={month}><strong>{monthLabel(month + '-01')}</strong><div className="chart-bars"><span className="chart-bar billed" style={{ width: `${Math.max(row.billed ? 3 : 0, row.billed / maximum * 100)}%` }} title={`Registrado ${money(row.billed, currency)}`}/><span className="chart-bar collected" style={{ width: `${Math.max(row.collected ? 3 : 0, row.collected / maximum * 100)}%` }} title={`Cobrado neto ${money(row.collected, currency)}`}/><span className="chart-bar cost" style={{ width: `${Math.max(row.cost ? 3 : 0, row.cost / maximum * 100)}%` }} title={`Costo conocido ${money(row.cost, currency)}`}/></div><span>{money(row.collected, currency)} neto</span></div>)}</div>
      </section>
    </section>;
  })}</div>;
}
