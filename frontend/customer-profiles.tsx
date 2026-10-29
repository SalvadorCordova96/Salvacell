'use client';

import { useMemo, useState } from 'react';
import { Wrench, ShoppingBag, ChevronRight } from 'lucide-react';
import { Description, Label, ListBox, SearchField, Tabs } from '@heroui/react';
import { date, folio, money, type OrderRepair } from './types';

export type CustomerProfileRecord = {
  id: number; firstName: string; lastName: string; phone: string; phoneAdditional?: string; notes?: string; revision?: number;
  createdAt?: string; updatedAt?: string;
};
export type CustomerOrderRecord = {
  id: number; customerId?: number | null; firstName: string; lastName: string; phone: string;
  brand: string; model: string; deviceType?: string; repairType: string; problem: string;
  status?: string; currency: 'MXN' | 'USD'; totalCents: number; paidCents: number; dueCents: number;
  createdAt: string;
};
export type CustomerSaleRecord = {
  id: number; customerId?: number | null; createdAt: string; totalCents: number;
  currency: 'MXN' | 'USD'; voidedAt?: string | null; items: { productName: string; quantity: number }[];
};

/** Customer directory and unified profile/history. POS purchases appear only when linked to a profile. */
export function CustomerProfiles({ customers, orders, sales, orderRepairs = [], openOrder, onNewReception, updateCustomer, initialSelectedCustomerId }: {
  customers: CustomerProfileRecord[];
  orders: CustomerOrderRecord[];
  sales?: CustomerSaleRecord[];
  orderRepairs?: OrderRepair[];
  openOrder?: (orderId: number) => void;
  onNewReception?: (customerId: number) => void;
  updateCustomer?: (payload: Record<string, unknown>) => Promise<void>;
  initialSelectedCustomerId?: number | null;
}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedCustomerId ?? customers[0]?.id ?? null);
  const [historyTab, setHistoryTab] = useState('repairs');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [draft, setDraft] = useState({ firstName: '', lastName: '', phone: '', phoneAdditional: '', notes: '' });
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const digits = q.replace(/\D/g, '');
    return customers.filter(customer => !q || `${customer.firstName} ${customer.lastName} ${customer.phone} ${customer.phoneAdditional || ''}`.toLocaleLowerCase().includes(q) || digits.length >= 3 && [customer.phone, customer.phoneAdditional || ''].some(phone => phone.replace(/\D/g, '').includes(digits)));
  }, [customers, query]);
  const orderCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const order of orders) {
      if (order.customerId != null) counts.set(order.customerId, (counts.get(order.customerId) ?? 0) + 1);
    }
    return counts;
  }, [orders]);
  const selected = customers.find(customer => customer.id === selectedId) ?? filtered[0];
  const historyOrders = selected ? orders.filter(order => order.customerId === selected.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const historySales = selected ? (sales ?? []).filter(sale => sale.customerId === selected.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];

  return <div className="customer-profiles">
    <section className="panel">
      <div className="section-heading"><div><h2>Clientes</h2><span className="muted">Perfiles e historial vinculado</span></div><span>{customers.length}</span></div>
      <SearchField className="customer-search" value={query} onChange={setQuery} aria-label="Buscar clientes">
        <Label className="sr-only">Buscar clientes</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Nombre, apellido o teléfono" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {filtered.length ? <ListBox
        aria-label="Perfiles de clientes"
        className="customer-list"
        selectedKeys={selected ? new Set([selected.id]) : new Set()}
        selectionMode="single"
        onSelectionChange={keys => {
          const nextId = Array.from(keys)[0];
          if (nextId !== undefined && Number.isSafeInteger(Number(nextId))) setSelectedId(Number(nextId));
        }}
      >
        {filtered.map(customer => {
          const count = orderCounts.get(customer.id) ?? 0;
          return <ListBox.Item className="customer-option" key={customer.id} id={customer.id} textValue={`${customer.firstName} ${customer.lastName}`}>
            <span className="client-avatar">{customer.firstName.slice(0, 1)}{customer.lastName.slice(0, 1)}</span>
            <span className="customer-option-copy"><Label>{customer.firstName} {customer.lastName}</Label><Description>{[customer.phone, customer.phoneAdditional].filter(Boolean).join(' · ') || 'Sin teléfono'} · {count} {count === 1 ? 'equipo' : 'equipos'}</Description></span>
            <ListBox.ItemIndicator><ChevronRight size={17}/></ListBox.ItemIndicator>
          </ListBox.Item>;
        })}
      </ListBox> : <p className="help customer-list-empty">{query ? 'No hay perfiles que coincidan.' : 'Los perfiles creados al recibir equipos aparecerán aquí.'}</p>}
    </section>
    {selected && <section className="panel customer-profile-detail">
      <div className="section-heading"><div><p className="eyebrow">PERFIL DEL CLIENTE</p><h2>{selected.firstName} {selected.lastName}</h2><span className="muted">{[selected.phone, selected.phoneAdditional].filter(Boolean).join(' · ') || 'Sin teléfono registrado'}</span></div><div className="row-actions">{updateCustomer && <button className="sc-button secondary small" type="button" onClick={() => { setDraft({ firstName: selected.firstName, lastName: selected.lastName, phone: selected.phone, phoneAdditional: selected.phoneAdditional || '', notes: selected.notes || '' }); setSaveError(''); setEditing(value => !value); }}> {editing ? 'Cerrar edición' : 'Editar perfil'}</button>}{onNewReception && <button className="sc-button primary small" onClick={() => onNewReception(selected.id)}><Wrench size={16}/>Nueva recepción</button>}</div></div>
      {editing && <form className="customer-profile-edit" onSubmit={async event => { event.preventDefault(); if (!updateCustomer || selected.revision === undefined) return; setSaving(true); setSaveError(''); try { await updateCustomer({ action: 'updateCustomer', id: selected.id, revision: selected.revision, customer: draft }); setEditing(false); } catch (error) { setSaveError(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.'); } finally { setSaving(false); } }}>
        <div className="form-grid"><label className="field"><span>Nombre *</span><input required maxLength={100} value={draft.firstName} onChange={event => setDraft(current => ({ ...current, firstName: event.target.value }))}/></label><label className="field"><span>Apellido *</span><input required maxLength={100} value={draft.lastName} onChange={event => setDraft(current => ({ ...current, lastName: event.target.value }))}/></label><label className="field"><span>Teléfono principal</span><input type="tel" maxLength={40} value={draft.phone} onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))}/></label><label className="field"><span>Teléfono adicional</span><input type="tel" maxLength={40} value={draft.phoneAdditional} onChange={event => setDraft(current => ({ ...current, phoneAdditional: event.target.value }))}/></label><label className="field"><span>Notas</span><input maxLength={2000} value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))}/></label></div>
        {saveError && <p role="alert" className="error-message">{saveError}</p>}<div className="row-actions"><button className="sc-button primary small" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar perfil'}</button></div>
      </form>}
      {selected.notes && <p className="help">{selected.notes}</p>}
      <Tabs className="customer-history-tabs" selectedKey={historyTab} onSelectionChange={key => setHistoryTab(String(key))}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Historial del cliente">
            <Tabs.Tab id="repairs"><Wrench size={15}/>Reparaciones <span>{historyOrders.length}</span><Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="sales"><ShoppingBag size={15}/>Compras <span>{historySales.length}</span><Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="repairs">
          {historyOrders.length ? <div className="customer-history">{historyOrders.map(order => {
            const works = orderRepairs.filter(repair => repair.orderId === order.id).map(repair => repair.repairType).filter(Boolean);
            const workLabel = works.length ? works.join(' · ') : order.repairType || order.problem || 'Trabajo sin descripción';
            return <button type="button" className="customer-history-row" key={order.id} onClick={() => openOrder?.(order.id)} disabled={!openOrder}>
              <span><strong>{folio(order.id)} · {order.brand} {order.model}</strong><small>{workLabel} · {date(order.createdAt)}</small></span><span className="customer-history-money"><strong>{money(order.totalCents, order.currency)}</strong><small>{order.status === 'cancelada' ? 'Cancelada' : order.dueCents > 0 ? `Adeudo ${money(order.dueCents, order.currency)}` : 'Liquidada'}</small></span>
            </button>;
          })}</div> : <p className="help customer-history-empty">Aún no hay órdenes vinculadas a este perfil.</p>}
        </Tabs.Panel>
        <Tabs.Panel id="sales">
          {historySales.length ? <div className="customer-history">{historySales.map(sale => <article className="customer-history-row" key={sale.id}><span><strong>Venta · {date(sale.createdAt, true)}{sale.voidedAt ? ' · Anulada' : ''}</strong><small>{sale.items.map(item => `${item.quantity}× ${item.productName}`).join(', ') || 'Venta sin artículos detallados'}</small></span><strong>{money(sale.totalCents, sale.currency)}</strong></article>)}</div> : <p className="help customer-history-empty">Las ventas anónimas no se atribuyen a ningún perfil. Las ventas vinculadas aparecerán aquí.</p>}
        </Tabs.Panel>
      </Tabs>
    </section>}
  </div>;
}
