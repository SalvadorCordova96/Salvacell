'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, Clock3, PackageSearch, X } from 'lucide-react';
import styles from './order-operations-ribbon.module.css';

export type RibbonOrderStatus = 'nueva' | 'proceso' | 'esperando_refaccion' | 'terminada' | 'entregada' | 'cancelada';
export type RibbonQuote = {
  id: number;
  supplierName: string;
  costCents: number;
  currency: string;
  availability: string;
  quality?: string;
  warranty?: string;
  quotedAt?: string;
};
export type RibbonPartRequest = {
  id: number;
  name: string;
  status: string;
  note?: string;
  quotes?: RibbonQuote[];
};
export type RibbonOrder = {
  id: number;
  folio: string;
  customerName: string;
  device: string;
  status: RibbonOrderStatus;
  promisedDate: string | null;
  createdAt: string;
  progressLabel?: string;
  pendingTasks?: string[];
  partRequests?: RibbonPartRequest[];
};
export type RibbonUrgencyThresholds = {
  /** Inclusive day count for the stronger upcoming-delivery warning. */
  nearDays: number;
  /** Inclusive day count for the earlier upcoming-delivery warning. */
  soonDays: number;
};
export type RibbonStatusAction = 'terminada';
export type RibbonNotice = {
  id: 'backup';
  title: string;
  detail: string;
  actionLabel: string;
  severity: 'warning' | 'info';
};

export type OrderOperationsRibbonProps = {
  orders: RibbonOrder[];
  notices?: RibbonNotice[];
  /** Both thresholds are required; choose values appropriate for the workshop. */
  urgencyThresholds: RibbonUrgencyThresholds;
  /** Optional date source for deterministic rendering/tests. */
  now?: Date;
  timezone?: string;
  onRequestPart?: (orderId: number) => void | Promise<void>;
  onRegisterQuote?: (orderId: number, partRequestId: number) => void | Promise<void>;
  onChooseQuote?: (orderId: number, partRequestId: number, quoteId: number) => void | Promise<void>;
  onSetStatus?: (orderId: number, status: RibbonStatusAction) => void | Promise<void>;
  onOpenOrder?: (orderId: number) => void;
  onOpenNotice?: (noticeId: RibbonNotice['id']) => void;
};

type Urgency = { key: 'overdue' | 'near' | 'soon' | 'on-time' | 'undated'; label: string; rank: number; days: number | null };

const statusLabels: Record<RibbonOrderStatus, string> = {
  nueva: 'Nueva',
  proceso: 'En reparación',
  esperando_refaccion: 'Esperando refacción',
  terminada: 'Lista para entregar',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
};

function dateOnly(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function urgencyFor(order: RibbonOrder, thresholds: RibbonUrgencyThresholds, now: Date): Urgency {
  const promised = order.promisedDate ? dateOnly(order.promisedDate) : null;
  if (!promised) return { key: 'undated', label: 'Sin fecha prometida', rank: 4, days: null };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.ceil((promised.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { key: 'overdue', label: `Vencida hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`, rank: 0, days };
  if (days <= thresholds.nearDays) return { key: 'near', label: days === 0 ? 'Entrega para hoy' : `Entrega próxima · ${days} ${days === 1 ? 'día' : 'días'}`, rank: 1, days };
  if (days <= thresholds.soonDays) return { key: 'soon', label: `Se acerca · ${days} días`, rank: 2, days };
  return { key: 'on-time', label: `En plazo · ${days} días`, rank: 3, days };
}

function formatDate(value: string | null, timezone?: string) {
  if (!value) return 'Sin fecha prometida';
  const date = dateOnly(value);
  return date ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', ...(timezone ? { timeZone: timezone } : {}) }).format(date) : 'Fecha no válida';
}

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: /^[A-Z]{3}$/.test(currency) ? currency : 'MXN' }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function partStatusLabel(status: string) {
  const labels: Record<string, string> = {
    por_verificar: 'Por verificar', solicitada: 'Solicitada', disponible: 'Disponible', no_disponible: 'No disponible',
  };
  return labels[status] || status.replaceAll('_', ' ');
}

function quoteAvailabilityLabel(availability: string) {
  const labels: Record<string, string> = {
    por_confirmar: 'Por confirmar', disponible: 'Disponible', agotada: 'Agotada', bajo_pedido: 'Sobre pedido',
  };
  return labels[availability] || availability.replaceAll('_', ' ');
}

export function OrderOperationsRibbon({
  orders,
  notices = [],
  urgencyThresholds,
  now,
  timezone,
  onRequestPart,
  onRegisterQuote,
  onChooseQuote,
  onSetStatus,
  onOpenOrder,
  onOpenNotice,
}: OrderOperationsRibbonProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const referenceNow = useMemo(() => now ?? new Date(), [now]);
  const activeOrders = useMemo(() => orders
    .filter(order => !['entregada', 'cancelada'].includes(order.status))
    .map(order => ({ order, urgency: urgencyFor(order, urgencyThresholds, referenceNow) }))
    .sort((a, b) => a.urgency.rank - b.urgency.rank
      || (a.urgency.days ?? Number.MAX_SAFE_INTEGER) - (b.urgency.days ?? Number.MAX_SAFE_INTEGER)
      || a.order.createdAt.localeCompare(b.order.createdAt)), [orders, urgencyThresholds, referenceNow]);
  const selected = activeOrders.find(item => item.order.id === selectedId);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  return <>
    <section
      className={styles.ribbon}
      aria-label="Avisos del taller"
    >
      <div className={styles.track} role="list" aria-label="Órdenes activas y alertas">
        <div className={styles.trackHeading} role="listitem"><Bell size={17}/><strong>Avisos del taller</strong><span>{notices.length + activeOrders.length}</span></div>
        {notices.map(notice => {
          const Icon = AlertTriangle;
          return <div key={notice.id} role="listitem" className={styles.noticeItem}>
            <button type="button" className={`${styles.noticeCard} ${notice.severity === 'warning' ? styles.noticeWarning : styles.noticeInfo}`} onClick={() => onOpenNotice?.(notice.id)}>
              <span className={styles.noticeIcon}><Icon size={16}/></span>
              <span className={styles.noticeCopy}><strong>{notice.title}</strong><small>{notice.detail}</small></span>
              <span className={styles.noticeAction}>{notice.actionLabel}</span>
            </button>
          </div>;
        })}
        {activeOrders.length ? activeOrders.map(({ order, urgency }) => {
          const pendingCount = (order.pendingTasks?.length ?? 0) + (order.partRequests?.filter(part => part.status !== 'disponible').length ?? 0);
          const isSelected = order.id === selectedId;
          return <div key={order.id} role="listitem" className={styles.orderItem}>
            <button
              type="button"
              className={`${styles.card} ${styles[urgency.key]}${isSelected ? ` ${styles.selected}` : ''}`}
              aria-expanded={isSelected}
              aria-controls="order-operations-detail"
              onClick={() => setSelectedId(isSelected ? null : order.id)}
            >
              <span className={styles.cardTop}><strong>{order.folio}</strong><span className={`${styles.urgency} ${styles[urgency.key]}`}>{urgency.label}</span></span>
              <span className={styles.device}>{order.device}</span>
              <span className={styles.cardBottom}><span>{statusLabels[order.status]}</span>{pendingCount > 0 && <span className={styles.pendingCount}>{pendingCount} pendiente{pendingCount === 1 ? '' : 's'}</span>}</span>
            </button>
          </div>;
        }) : null}
        {!notices.length && !activeOrders.length && <div className={styles.empty}>Sin avisos pendientes. Aquí aparecerán órdenes y alertas del taller.</div>}
      </div>
      {selected && <aside id="order-operations-detail" className={styles.detail} aria-label={`Detalle de ${selected.order.folio}`}>
        <header className={styles.detailHeader}>
          <div><span className={styles.eyebrow}>Orden seleccionada · {selected.order.folio}</span><h2>{selected.order.device}</h2><p>{selected.order.customerName} · {statusLabels[selected.order.status]}</p></div>
          <button type="button" className={styles.close} onClick={() => setSelectedId(null)} aria-label="Cerrar detalle"><X size={19}/></button>
        </header>
        <div className={styles.detailBody}>
          <div className={styles.infoGrid}>
            <div><span>Fecha prometida</span><strong>{formatDate(selected.order.promisedDate, timezone)}</strong></div>
            <div><span>Prioridad</span><strong className={`${styles.urgency} ${styles[selected.urgency.key]}`}>{selected.urgency.label}</strong></div>
            <div><span>Avance</span><strong>{selected.order.progressLabel || statusLabels[selected.order.status]}</strong></div>
          </div>
          {!!selected.order.pendingTasks?.length && <section className={styles.section} aria-labelledby="ribbon-pending-title"><h3 id="ribbon-pending-title"><Clock3 size={16}/> Pendientes</h3><ul>{selected.order.pendingTasks.map((task, index) => <li key={`${task}-${index}`}>{task}</li>)}</ul></section>}
          <section className={styles.section} aria-labelledby="ribbon-parts-title"><h3 id="ribbon-parts-title"><PackageSearch size={16}/> Refacciones y cotizaciones</h3>
            {selected.order.partRequests?.length ? selected.order.partRequests.map(part => <div key={part.id} className={styles.part}>
              <div className={styles.partHeading}><strong>{part.name}</strong><span className={styles.tag}>{partStatusLabel(part.status)}</span></div>
              {part.note && <p>{part.note}</p>}
              {!!part.quotes?.length ? <div className={styles.quotes}>{part.quotes.map(quote => <article key={quote.id} className={styles.quote}>
                <div><strong>{quote.supplierName}</strong><span>{quoteAvailabilityLabel(quote.availability)}{quote.quality ? ` · ${quote.quality}` : ''}</span></div>
                <strong className={styles.price}>{formatMoney(quote.costCents, quote.currency)}</strong>
                {quote.warranty && <small>Garantía: {quote.warranty}</small>}
                {onChooseQuote && quote.availability !== 'agotada' && <button type="button" className={styles.actionLink} onClick={() => void onChooseQuote(selected.order.id, part.id, quote.id)}>Usar esta cotización</button>}
              </article>)}</div> : <p className={styles.muted}>Aún no hay cotizaciones registradas.</p>}
              {onRegisterQuote && <button type="button" className={styles.secondaryAction} onClick={() => void onRegisterQuote(selected.order.id, part.id)}>Registrar cotización</button>}
            </div>) : <p className={styles.muted}>No hay refacciones vinculadas a esta orden.</p>}
          </section>
        </div>
        <footer className={styles.actions}>
          {onRequestPart && <button type="button" className={styles.secondaryAction} onClick={() => void onRequestPart(selected.order.id)}>Solicitar refacción</button>}
          {onOpenOrder && <button type="button" className={styles.secondaryAction} onClick={() => onOpenOrder(selected.order.id)}>Ver orden completa</button>}
          {onSetStatus && selected.order.status !== 'terminada' && <button type="button" className={styles.primaryAction} onClick={() => void onSetStatus(selected.order.id, 'terminada')}>Marcar lista para entregar</button>}
        </footer>
      </aside>}
    </section>
    {selected && <button className={styles.scrim} aria-label="Cerrar detalle de orden" onClick={() => setSelectedId(null)} tabIndex={-1}/>}
  </>;
}
