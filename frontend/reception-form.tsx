'use client';

import { useState, type FormEvent, type Key } from 'react';
import { Accordion, Button, ComboBox, Input, ListBox } from '@heroui/react';
import { AlertCircle, Check, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { date, folio, type Currency, type RecordData } from './types';
import { DraftRecovery, useFormDraft, type WorkshopDraft } from './use-form-draft';

export type ReceptionCustomer = { id: number; firstName: string; lastName: string; phone: string; phoneAdditional?: string; notes?: string };
export type ReceptionSupplier = { id: number; name: string; active: number; suppliesParts: number; suppliesAccessories: number };
export type ReceptionPaymentMethod = { key: string; label: string; active: number };
export type ReceptionFormResult = { id: number; customerId: number; receptionId: number; orderIds: number[] };
type RepairDraft = { uiKey: string; repairType: string; problem: string; diagnosis: string; solution: string; notes: string; service: string; parts: string; review: string; partName: string; partCost: string; supplierId: string; requestQuote: boolean; quoteSupplierIds: number[] };
type DeviceDraft = { uiKey: string; selectedHistoryDeviceId?: number | null; deviceType: string; brand: string; model: string; currency: Currency; notes: string; imei: string; accessoriesLeft: string; physicalCondition: string; promisedDate: string; technician: string; warrantyDays: string; deposit: string; method: string; repairs: RepairDraft[] };
type ReceptionPayload = {
  action: 'createReception'; requestKey: string; customerId?: number; customer?: { firstName: string; lastName: string; phone: string; phoneAdditional: string; notes: string }; notes: string;
  devices: Array<Omit<DeviceDraft, 'uiKey' | 'selectedHistoryDeviceId' | 'repairs' | 'deposit' | 'warrantyDays'> & { deposit: number; warrantyDays: number; repairs: Array<Omit<RepairDraft, 'uiKey' | 'service' | 'parts' | 'review' | 'partCost' | 'supplierId'> & { serviceCents: number; partsCents: number; reviewCents: number; partCostCents: number | null; supplierId: number | null; supplierName: string }> }>;
};
type ReceptionDraft = { customerId: number | ''; customer: { firstName: string; lastName: string; phone: string; phoneAdditional: string; notes: string }; receptionNotes: string; devices: DeviceDraft[]; requestKey: string };
const newRepair = (): RepairDraft => ({ uiKey: crypto.randomUUID(), repairType: '', problem: '', diagnosis: '', solution: '', notes: '', service: '', parts: '', review: '', partName: '', partCost: '', supplierId: '', requestQuote: false, quoteSupplierIds: [] });
const newDevice = (currency: Currency, method: string): DeviceDraft => ({ uiKey: crypto.randomUUID(), selectedHistoryDeviceId: null, deviceType: 'movil', brand: '', model: '', currency, notes: '', imei: '', accessoriesLeft: '', physicalCondition: '', promisedDate: '', technician: '', warrantyDays: '0', deposit: '', method, repairs: [newRepair()] });
const cents = (value: string) => Math.round((Number(value) || 0) * 100);
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
const newCustomerKey = '__create_customer__';

/** Branched intake: one customer per reception, multiple equipment orders, multiple work lines per equipment. */
export function ReceptionForm({ customers, suppliers = [], paymentMethods = [], previousOrders = [], defaultCurrency = 'MXN', mutate, close, saved, initialCustomerId, assistantDraft }: {
  customers: ReceptionCustomer[]; suppliers?: ReceptionSupplier[]; paymentMethods?: ReceptionPaymentMethod[]; previousOrders?: RecordData[]; defaultCurrency?: Currency;
  mutate: (payload: Record<string, unknown>) => Promise<ReceptionFormResult>; close: () => void;
  saved: (result: ReceptionFormResult) => void; initialCustomerId?: number; assistantDraft?: Record<string, string>;
}) {
  const [customerId, setCustomerId] = useState<number | ''>(initialCustomerId ?? '');
  const [customer, setCustomer] = useState({ firstName: assistantDraft?.firstName || '', lastName: assistantDraft?.lastName || '', phone: assistantDraft?.phone || '', phoneAdditional: assistantDraft?.phoneAdditional || '', notes: assistantDraft?.customerNotes || '' });
  const initialCustomer = customers.find(item => item.id === initialCustomerId);
  const [customerSearch, setCustomerSearch] = useState(initialCustomer ? `${initialCustomer.firstName} ${initialCustomer.lastName}`.trim() : '');
  const [receptionNotes, setReceptionNotes] = useState('');
  const [devices, setDevices] = useState<DeviceDraft[]>(() => {
    const device = newDevice(defaultCurrency, paymentMethods.find(item => item.active)?.key || 'efectivo');
    if (assistantDraft) {
      device.deviceType = assistantDraft.deviceType || device.deviceType;
      device.brand = assistantDraft.brand || '';
      device.model = assistantDraft.model || '';
      device.imei = assistantDraft.imei || '';
      device.accessoriesLeft = assistantDraft.accessoriesLeft || '';
      device.physicalCondition = assistantDraft.physicalCondition || '';
      device.notes = assistantDraft.deviceNotes || '';
      device.promisedDate = assistantDraft.promisedDate || '';
      device.technician = assistantDraft.technician || '';
      device.warrantyDays = assistantDraft.warrantyDays || '0';
      Object.assign(device.repairs[0], {
        repairType: assistantDraft.repairType || '', problem: assistantDraft.problem || '',
        diagnosis: assistantDraft.diagnosis || '', solution: assistantDraft.solution || '', notes: assistantDraft.repairNotes || '',
      });
    }
    return [device];
  });
  const [expandedDeviceKeys, setExpandedDeviceKeys] = useState<Set<string>>(() => new Set([devices[0].uiKey]));
  const [expandedRepairKeys, setExpandedRepairKeys] = useState<Set<string>>(() => new Set([devices[0].repairs[0].uiKey]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const draftPayload: ReceptionDraft = { customerId, customer, receptionNotes, devices, requestKey };
  const hasDraftContent = !!(customer.firstName.trim() || customer.lastName.trim() || customer.phone.trim() || customer.phoneAdditional.trim() || customer.notes.trim() || receptionNotes.trim()) || devices.some(device => device.brand.trim() || device.model.trim() || device.notes.trim() || device.imei.trim() || device.accessoriesLeft.trim() || device.physicalCondition.trim() || device.promisedDate.trim() || device.technician.trim() || device.deposit.trim() || device.repairs.some(repair => repair.repairType.trim() || repair.problem.trim() || repair.diagnosis.trim() || repair.solution.trim() || repair.notes.trim() || repair.service.trim() || repair.parts.trim() || repair.review.trim() || repair.partName.trim() || repair.partCost.trim()));
  const draft = useFormDraft<ReceptionDraft>({ kind: 'reception', payload: draftPayload, enabled: !assistantDraft, hasContent: hasDraftContent, restore: value => { setCustomerId(value.customerId); setCustomer(value.customer); setCustomerSearch(value.customerId ? `${customers.find(item => item.id === value.customerId)?.firstName || ''} ${customers.find(item => item.id === value.customerId)?.lastName || ''}`.trim() : value.customer.firstName); setReceptionNotes(value.receptionNotes); setDevices(value.devices); setExpandedDeviceKeys(new Set(value.devices.map(device => device.uiKey))); setExpandedRepairKeys(new Set(value.devices.flatMap(device => device.repairs.map(repair => repair.uiKey)))); setRequestKey(value.requestKey || crypto.randomUUID()); } });
  const selectedCustomer = customers.find(item => item.id === customerId);
  const normalizedCustomerSearch = normalizeSearch(customerSearch);
  const numericCustomerSearch = customerSearch.replace(/\D/g, '');
  const customerMatches = customers.filter(item => !normalizedCustomerSearch || normalizeSearch(`${item.firstName} ${item.lastName} ${item.phone} ${item.phoneAdditional || ''}`).includes(normalizedCustomerSearch) || numericCustomerSearch.length >= 3 && [item.phone, item.phoneAdditional || ''].some(phone => phone.replace(/\D/g, '').includes(numericCustomerSearch))).sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'es-MX'));
  const previousCustomerOrders = selectedCustomer ? previousOrders.filter(order => order.customerId === selectedCustomer.id && order.deviceId != null).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id).filter((order, index, orders) => orders.findIndex(candidate => candidate.deviceId === order.deviceId) === index) : [];
  const updateDevice = (index: number, patch: Partial<DeviceDraft>) => setDevices(current => current.map((device, i) => {
    if (i !== index) return device;
    const changesIdentity = ['deviceType', 'brand', 'model', 'imei'].some(key => key in patch && patch[key as keyof DeviceDraft] !== device[key as keyof DeviceDraft]);
    return { ...device, ...patch, ...(changesIdentity && !('selectedHistoryDeviceId' in patch) ? { selectedHistoryDeviceId: null } : {}) };
  }));
  const clearPreviouslySelectedDevices = () => setDevices(current => current.map(device => device.selectedHistoryDeviceId ? { ...device, selectedHistoryDeviceId: null, deviceType: 'movil', brand: '', model: '', imei: '', accessoriesLeft: '', physicalCondition: '' } : device));
  const chooseCustomer = (key: Key | null) => {
    if (key === newCustomerKey) {
      const fullName = customerSearch.trim();
      const nameParts = fullName.replace(/\s+/g, ' ').split(' ').filter(Boolean);
      const containsLetters = /\p{L}/u.test(fullName);
      setCustomerId('');
      clearPreviouslySelectedDevices();
      setCustomer({ firstName: containsLetters ? nameParts[0] : '', lastName: containsLetters ? nameParts.slice(1).join(' ') : '', phone: containsLetters ? '' : fullName, phoneAdditional: '', notes: '' });
      return;
    }
    const found = customers.find(item => String(item.id) === String(key));
    if (!found) return;
    if (customerId !== found.id) clearPreviouslySelectedDevices();
    setCustomerId(found.id);
    setCustomerSearch(`${found.firstName} ${found.lastName}`.trim());
  };
  const changeCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    if (selectedCustomer && normalizeSearch(value) !== normalizeSearch(`${selectedCustomer.firstName} ${selectedCustomer.lastName}`)) {
      setCustomerId('');
      clearPreviouslySelectedDevices();
    }
  };
  const selectPreviousDevice = (deviceIndex: number, deviceId: string) => {
    const previous = previousCustomerOrders.find(order => String(order.deviceId) === deviceId);
    if (!previous) {
      updateDevice(deviceIndex, { selectedHistoryDeviceId: null, deviceType: 'movil', brand: '', model: '', imei: '', accessoriesLeft: '', physicalCondition: '' });
      return;
    }
    updateDevice(deviceIndex, { selectedHistoryDeviceId: previous.deviceId, deviceType: previous.deviceType || 'movil', brand: previous.brand, model: previous.model, imei: previous.imei || '', accessoriesLeft: previous.accessoriesLeft || '', physicalCondition: previous.physicalCondition || '' });
  };
  const updateRepair = (deviceIndex: number, repairIndex: number, patch: Partial<RepairDraft>) => setDevices(current => current.map((device, i) => i === deviceIndex ? { ...device, repairs: device.repairs.map((repair, j) => j === repairIndex ? { ...repair, ...patch } : repair) } : device));
  const addDevice = () => {
    const device = newDevice(defaultCurrency, paymentMethods.find(item => item.active)?.key || 'efectivo');
    setDevices(current => [...current, device]);
    setExpandedDeviceKeys(new Set([device.uiKey]));
    setExpandedRepairKeys(new Set([device.repairs[0].uiKey]));
  };
  const removeDevice = (deviceIndex: number) => {
    const removed = devices[deviceIndex];
    const remaining = devices.filter((_, index) => index !== deviceIndex);
    setDevices(remaining);
    setExpandedDeviceKeys(current => {
      const next = new Set([...current].filter(key => key !== removed.uiKey));
      if (!next.size && remaining[0]) next.add(remaining[0].uiKey);
      return next;
    });
    setExpandedRepairKeys(current => new Set([...current].filter(key => !removed.repairs.some(repair => repair.uiKey === key))));
  };
  const addRepair = (deviceIndex: number) => {
    const repair = newRepair();
    updateDevice(deviceIndex, { repairs: [...devices[deviceIndex].repairs, repair] });
    setExpandedDeviceKeys(current => new Set([...current, devices[deviceIndex].uiKey]));
    setExpandedRepairKeys(current => {
      const next = new Set([...current].filter(key => !devices[deviceIndex].repairs.some(item => item.uiKey === key)));
      next.add(repair.uiKey);
      return next;
    });
  };
  const removeRepair = (deviceIndex: number, repairIndex: number) => {
    const device = devices[deviceIndex];
    const removed = device.repairs[repairIndex];
    const remaining = device.repairs.filter((_, index) => index !== repairIndex);
    updateDevice(deviceIndex, { repairs: remaining });
    setExpandedRepairKeys(current => {
      const next = new Set([...current].filter(key => key !== removed.uiKey));
      if (current.has(removed.uiKey) && remaining[0]) next.add(remaining[Math.min(repairIndex, remaining.length - 1)].uiKey);
      return next;
    });
  };
  const orderTotal = (device: DeviceDraft) => device.repairs.reduce((sum, repair) => sum + cents(repair.service) + cents(repair.parts) + cents(repair.review), 0);
  const totalsByCurrency = devices.reduce<Record<Currency, number>>((totals, device) => ({ ...totals, [device.currency]: totals[device.currency] + orderTotal(device) }), { MXN: 0, USD: 0 });
  const zeroTotalDeviceIndex = devices.findIndex(device => orderTotal(device) <= 0);
  const excessiveDepositDeviceIndex = devices.findIndex(device => cents(device.deposit) > orderTotal(device));
  const submitHint = zeroTotalDeviceIndex >= 0
    ? `Captura un importe mayor que cero en el equipo ${zeroTotalDeviceIndex + 1} para habilitar el registro.`
    : excessiveDepositDeviceIndex >= 0
      ? `El anticipo del equipo ${excessiveDepositDeviceIndex + 1} supera su total. Ajústalo para continuar.`
      : '';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = event.currentTarget;
    const incompleteDeviceIndex = devices.findIndex(device => !device.brand.trim() || !device.model.trim() || device.repairs.some(repair => !repair.repairType.trim()));
    if (incompleteDeviceIndex >= 0) {
      const device = devices[incompleteDeviceIndex];
      const incompleteRepair = device.repairs.find(repair => !repair.repairType.trim());
      const field = !device.brand.trim() ? 'brand' : !device.model.trim() ? 'model' : 'repairType';
      setExpandedDeviceKeys(new Set([device.uiKey]));
      setExpandedRepairKeys(new Set([incompleteRepair?.uiKey ?? device.repairs[0].uiKey]));
      setError('Completa la marca, el modelo y el tipo de reparación marcados con *.');
      window.setTimeout(() => {
        const scope = incompleteRepair ? `[data-repair-key="${incompleteRepair.uiKey}"]` : `[data-device-key="${device.uiKey}"]`;
        const control = form.querySelector<HTMLElement>(`${scope} [data-reception-field="${field}"]`);
        control?.focus();
        control?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }
    const incompleteQuote = devices.flatMap((device, deviceIndex) => device.repairs.map((repair, repairIndex) => ({ device, deviceIndex, repair, repairIndex }))).find(item => item.repair.requestQuote && (!item.repair.partName.trim() || item.repair.quoteSupplierIds.length === 0));
    if (incompleteQuote) {
      setExpandedDeviceKeys(new Set([incompleteQuote.device.uiKey]));
      setExpandedRepairKeys(new Set([incompleteQuote.repair.uiKey]));
      setError('Para solicitar precio, indica la refacción y selecciona al menos un proveedor.');
      window.setTimeout(() => {
        const control = form.querySelector<HTMLElement>(`[data-repair-key="${incompleteQuote.repair.uiKey}"] [data-reception-field="partName"]`);
        control?.focus();
        control?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }
    setBusy(true);
    const payload: ReceptionPayload = {
      action: 'createReception', requestKey, notes: receptionNotes,
        ...(customerId ? { customerId: Number(customerId) } : { customer }),
      devices: devices.map(device => {
        const { uiKey: deviceUiKey, selectedHistoryDeviceId, ...deviceData } = device;
        void deviceUiKey;
        return {
        ...deviceData, deviceId: selectedHistoryDeviceId || null, deposit: cents(device.deposit), warrantyDays: Number(device.warrantyDays) || 0,
        repairs: device.repairs.map(repair => {
          const { uiKey: repairUiKey, ...repairData } = repair;
          void repairUiKey;
          const supplier = suppliers.find(item => item.id === Number(repair.supplierId));
          return { ...repairData, serviceCents: cents(repair.service), partsCents: cents(repair.parts), reviewCents: cents(repair.review), partCostCents: repair.partCost === '' ? null : cents(repair.partCost), supplierId: supplier?.id ?? null, supplierName: supplier?.name ?? '' };
        }),
      };}),
    };
    try { saved(await mutate(payload as unknown as Record<string, unknown>)); void draft.discard().catch(() => undefined); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo registrar la recepción.'); }
    finally { setBusy(false); }
  }

  return <form className="panel reception-form" onSubmit={event => void submit(event)} noValidate>
    <fieldset disabled={busy}>
      <div className="section-heading"><div><p className="eyebrow">NUEVA RECEPCIÓN</p><h2>Cliente y equipos</h2><span className="muted">Se guardará una orden independiente por cada equipo.</span></div></div>
      <DraftRecovery drafts={draft.drafts} onRestore={draft.restoreDraft} onDiscard={(item: WorkshopDraft<ReceptionDraft>) => { void draft.discard(item.id).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo descartar el borrador.')); }}/>{draft.status === 'saving' && <small role="status">Guardando borrador…</small>}{draft.status === 'saved' && <small role="status">Borrador guardado automáticamente.</small>}{draft.error && <small role="alert">{draft.error}</small>}
      <section className="reception-section"><div className="form-section-title"><span>01</span><h3>Cliente</h3><small>Captura una vez para toda la recepción</small></div>
        <label className="field"><span>Buscar o elegir cliente</span><ComboBox className="reception-customer-combobox" fullWidth allowsEmptyCollection defaultFilter={() => true} selectedKey={customerId ? String(customerId) : null} inputValue={customerSearch} onInputChange={changeCustomerSearch} onSelectionChange={chooseCustomer} menuTrigger="focus">
          <ComboBox.InputGroup><Input aria-label="Buscar cliente por nombre o teléfono" placeholder="Escribe un nombre o teléfono"/><ComboBox.Trigger/></ComboBox.InputGroup>
          <ComboBox.Popover><ListBox>
            {customerMatches.map(item => {
              const name = `${item.firstName} ${item.lastName}`.trim();
              const phones = [item.phone, item.phoneAdditional].filter(Boolean).join(' · ');
              return <ListBox.Item key={item.id} id={String(item.id)} textValue={name}>{name}<small>{phones || 'Sin teléfono registrado'}</small><ListBox.ItemIndicator/></ListBox.Item>;
            })}
            <ListBox.Item id={newCustomerKey} textValue={`Crear perfil nuevo ${customerSearch}`}><strong>Crear perfil nuevo</strong>{customerSearch.trim() ? <small>Usar “{customerSearch.trim()}” como nombre inicial</small> : <small>Registrar un cliente que aún no aparece</small>}<ListBox.ItemIndicator/></ListBox.Item>
          </ListBox></ComboBox.Popover>
        </ComboBox></label>
        <p className="help">La lista se filtra mientras escribes. Elige un perfil para cargarlo; si no aparece, selecciona “Crear perfil nuevo”.</p>
        {selectedCustomer ? <div className="notice"><strong>{selectedCustomer.firstName} {selectedCustomer.lastName}</strong><span>{[selectedCustomer.phone, selectedCustomer.phoneAdditional].filter(Boolean).join(' · ') || 'Sin teléfono'}</span><button type="button" className="link-button" onClick={() => { setCustomerId(''); setCustomerSearch(''); clearPreviouslySelectedDevices(); }}>Usar otro cliente</button></div> : <>
          <div className="form-grid">
          <label className="field"><span>Nombre *</span><input autoFocus required maxLength={100} value={customer.firstName} onChange={event => setCustomer({ ...customer, firstName: event.target.value })}/></label>
          <label className="field"><span>Apellido *</span><input required maxLength={100} value={customer.lastName} onChange={event => setCustomer({ ...customer, lastName: event.target.value })}/></label>
          <label className="field"><span>Teléfono opcional</span><input type="tel" maxLength={40} value={customer.phone} onChange={event => setCustomer({ ...customer, phone: event.target.value })}/></label>
          <label className="field"><span>Teléfono adicional (opcional)</span><input type="tel" maxLength={40} value={customer.phoneAdditional} onChange={event => setCustomer({ ...customer, phoneAdditional: event.target.value })}/></label>
          <label className="field"><span>Notas del cliente</span><input maxLength={2000} value={customer.notes} onChange={event => setCustomer({ ...customer, notes: event.target.value })}/></label>
          </div>
        </>}
      </section>

      <section className="reception-section"><div className="form-section-title"><span>02</span><h3>Equipos y trabajos</h3><Button type="button" className="reception-action-button" size="sm" variant="secondary" isDisabled={devices.length >= 8} onPress={addDevice}><Plus size={16}/>Agregar equipo</Button></div>
        <p className="help">Cada equipo tendrá su propio folio, estado, saldo y garantía. Dentro de cada equipo puedes agregar varios trabajos.</p>
        <Accordion className="reception-devices-accordion" allowsMultipleExpanded expandedKeys={expandedDeviceKeys} onExpandedChange={keys => setExpandedDeviceKeys(new Set([...keys].map(String)))}>
          {devices.map((device, deviceIndex) => <Accordion.Item className="reception-device" data-device-key={device.uiKey} id={device.uiKey} key={device.uiKey}>
            <Accordion.Heading><Accordion.Trigger><span className="reception-device-summary"><strong>Equipo {deviceIndex + 1} · {device.brand || 'Marca pendiente'} {device.model || 'Modelo pendiente'}</strong><small>{device.repairs.length} {device.repairs.length === 1 ? 'trabajo' : 'trabajos'} · {device.currency}</small></span><Accordion.Indicator /></Accordion.Trigger></Accordion.Heading>
            <Accordion.Panel><Accordion.Body>
              <div className="reception-device-body">
                <div className="section-heading"><h4>Datos del equipo</h4>{devices.length > 1 && <Button type="button" className="reception-remove-button" size="sm" variant="tertiary" onPress={() => removeDevice(deviceIndex)}><Trash2 size={15}/>Quitar equipo</Button>}</div>
                {selectedCustomer && <label className="field"><span>Equipo registrado del cliente (opcional)</span><select aria-label={`Elegir un equipo anterior para el equipo ${deviceIndex + 1}`} value={device.selectedHistoryDeviceId ?? ''} onChange={event => selectPreviousDevice(deviceIndex, event.target.value)}><option value="">Equipo nuevo (capturar datos manualmente)</option>{previousCustomerOrders.map(order => <option key={String(order.deviceId)} value={String(order.deviceId)}>{order.brand} {order.model} · última orden {folio(order.id)} · {date(order.createdAt)}{order.imei ? ` · ${order.imei}` : ' · sin serie/IMEI'}</option>)}</select>{device.selectedHistoryDeviceId && <small>Se vinculará al mismo equipo; esta visita genera una orden nueva. La falla y el diagnóstico se capturan de nuevo.</small>}{!previousCustomerOrders.length && <small>Este cliente aún no tiene equipos registrados.</small>}</label>}
                <div className="form-grid">
                  <label className="field"><span>Tipo de dispositivo *</span><select value={device.deviceType} onChange={event => updateDevice(deviceIndex, { deviceType: event.target.value })}><option value="movil">Móvil</option><option value="tablet">Tablet</option><option value="laptop">Laptop</option><option value="otro">Otro</option></select></label>
                  <label className="field"><span>Marca *</span><input data-reception-field="brand" required maxLength={80} value={device.brand} onChange={event => updateDevice(deviceIndex, { brand: event.target.value })}/></label>
                  <label className="field"><span>Modelo *</span><input data-reception-field="model" required maxLength={100} value={device.model} onChange={event => updateDevice(deviceIndex, { model: event.target.value })}/></label>
                  <label className="field"><span>Moneda</span><select value={device.currency} onChange={event => updateDevice(deviceIndex, { currency: event.target.value as Currency })}><option value="MXN">MXN</option><option value="USD">USD</option></select></label>
                  <label className="field"><span>IMEI / número de serie</span><input maxLength={40} value={device.imei} onChange={event => updateDevice(deviceIndex, { imei: event.target.value })}/></label>
                  <label className="field"><span>Accesorios recibidos</span><input maxLength={500} value={device.accessoriesLeft} onChange={event => updateDevice(deviceIndex, { accessoriesLeft: event.target.value })}/></label>
                  <label className="field"><span>Fecha prometida</span><input type="date" value={device.promisedDate} onChange={event => updateDevice(deviceIndex, { promisedDate: event.target.value })}/></label>
                  <label className="field"><span>Técnico</span><input maxLength={120} value={device.technician} onChange={event => updateDevice(deviceIndex, { technician: event.target.value })}/></label>
                  <label className="field"><span>Días de garantía</span><input type="number" min="0" max="3650" value={device.warrantyDays} onChange={event => updateDevice(deviceIndex, { warrantyDays: event.target.value })}/></label>
                  <label className="field wide"><span>Condición física / notas del equipo</span><textarea rows={2} maxLength={5000} value={device.physicalCondition || device.notes} onChange={event => updateDevice(deviceIndex, { physicalCondition: event.target.value, notes: event.target.value })}/></label>
                </div>
                <div className="section-heading reception-work-heading"><h4>Trabajos para este equipo</h4><Button type="button" className="reception-action-button" size="sm" variant="secondary" isDisabled={device.repairs.length >= 20} onPress={() => addRepair(deviceIndex)}><Plus size={15}/>Agregar trabajo</Button></div>
                <Accordion className="reception-repairs" allowsMultipleExpanded expandedKeys={new Set([...expandedRepairKeys].filter(key => device.repairs.some(repair => repair.uiKey === key)))} onExpandedChange={keys => setExpandedRepairKeys(current => new Set([...([...current].filter(key => !device.repairs.some(repair => repair.uiKey === key))), ...[...keys].map(String)]))}>
                  {device.repairs.map((repair, repairIndex) => <Accordion.Item className="reception-repair" data-repair-key={repair.uiKey} id={repair.uiKey} key={repair.uiKey}>
                    <Accordion.Heading><Accordion.Trigger><span className="reception-repair-summary"><strong>Trabajo {repairIndex + 1} · {repair.repairType || 'Tipo de reparación pendiente'}</strong><small>{repair.requestQuote ? `Cotización solicitada · ${repair.quoteSupplierIds.length} proveedor(es)` : 'Sin solicitud de cotización'}</small></span><Accordion.Indicator /></Accordion.Trigger></Accordion.Heading>
                    <Accordion.Panel><Accordion.Body>
                      <div className="section-heading reception-repair-actions"><span>Detalle del trabajo</span>{device.repairs.length > 1 && <Button type="button" className="reception-remove-button" size="sm" variant="tertiary" onPress={() => removeRepair(deviceIndex, repairIndex)}><Trash2 size={15}/>Quitar trabajo</Button>}</div>
                      <div className="form-grid">
                        <label className="field"><span>Tipo de reparación *</span><input data-reception-field="repairType" required maxLength={150} value={repair.repairType} onChange={event => updateRepair(deviceIndex, repairIndex, { repairType: event.target.value })} placeholder="Ej. Cambio de pantalla"/></label>
                        <label className="field"><span>Problema reportado</span><input maxLength={3000} value={repair.problem} onChange={event => updateRepair(deviceIndex, repairIndex, { problem: event.target.value })}/></label>
                        <label className="field"><span>Diagnóstico</span><input maxLength={3000} value={repair.diagnosis} onChange={event => updateRepair(deviceIndex, repairIndex, { diagnosis: event.target.value })}/></label>
                        <label className="field"><span>Solución / trabajo</span><input maxLength={3000} value={repair.solution} onChange={event => updateRepair(deviceIndex, repairIndex, { solution: event.target.value })}/></label>
                        <label className="field"><span>Servicio / mano de obra</span><input type="number" min="0" step="0.01" inputMode="decimal" value={repair.service} onChange={event => updateRepair(deviceIndex, repairIndex, { service: event.target.value })}/></label>
                        <label className="field"><span>Cobro por refacción</span><input type="number" min="0" step="0.01" inputMode="decimal" value={repair.parts} onChange={event => updateRepair(deviceIndex, repairIndex, { parts: event.target.value })}/></label>
                        <label className="field"><span>Revisión (opcional)</span><input type="number" min="0" step="0.01" inputMode="decimal" value={repair.review} onChange={event => updateRepair(deviceIndex, repairIndex, { review: event.target.value })}/></label>
                        <label className="field"><span>Refacción a solicitar</span><input data-reception-field="partName" maxLength={150} value={repair.partName} onChange={event => updateRepair(deviceIndex, repairIndex, { partName: event.target.value })} placeholder="Nombre / descripción de la pieza"/></label>
                        <label className="field"><span className="check-field"><input type="checkbox" checked={repair.requestQuote} onChange={event => updateRepair(deviceIndex, repairIndex, { requestQuote: event.target.checked })}/>Solicitar cotización para esta reparación</span><small>Solo prepara la solicitud; no envía mensajes.</small></label>
                        {repair.requestQuote && <div className="field wide"><span>Proveedores a consultar *</span><div className="check-list">{suppliers.filter(item => item.active && item.suppliesParts).map(item => <label key={item.id}><input type="checkbox" checked={repair.quoteSupplierIds.includes(item.id)} onChange={event => updateRepair(deviceIndex, repairIndex, { quoteSupplierIds: event.target.checked ? [...repair.quoteSupplierIds, item.id] : repair.quoteSupplierIds.filter(id => id !== item.id) })}/>{item.name}</label>)}</div>{!suppliers.some(item => item.active && item.suppliesParts) && <small>Clasifica al menos un proveedor activo para refacciones.</small>}</div>}
                        <label className="field"><span>Costo interno de la pieza (opcional)</span><input type="number" min="0" step="0.01" inputMode="decimal" value={repair.partCost} onChange={event => updateRepair(deviceIndex, repairIndex, { partCost: event.target.value })}/></label>
                        <label className="field"><span>Proveedor (opcional, manual)</span><select value={repair.supplierId} onChange={event => updateRepair(deviceIndex, repairIndex, { supplierId: event.target.value })}><option value="">Sin proveedor seleccionado</option>{suppliers.filter(item => item.active && item.suppliesParts).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                        <label className="field wide"><span>Notas del trabajo</span><textarea rows={2} maxLength={3000} value={repair.notes} onChange={event => updateRepair(deviceIndex, repairIndex, { notes: event.target.value })}/></label>
                      </div>
                    </Accordion.Body></Accordion.Panel>
                  </Accordion.Item>)}
                </Accordion>
                <div className="form-grid reception-device-footer"><label className="field"><span>Anticipo de este equipo</span><input type="number" min="0" max={orderTotal(device) / 100} step="0.01" inputMode="decimal" value={device.deposit} onChange={event => updateDevice(deviceIndex, { deposit: event.target.value })}/></label><label className="field"><span>Método del anticipo</span><select value={device.method} onChange={event => updateDevice(deviceIndex, { method: event.target.value })}>{paymentMethods.filter(item => item.active).map(item => <option key={item.key} value={item.key}>{item.label}</option>)}{!paymentMethods.length && <option value="efectivo">Efectivo</option>}</select></label><div className="form-totals"><div><span>Total del equipo</span><strong>{(orderTotal(device) / 100).toLocaleString('es-MX', { style: 'currency', currency: device.currency })} {device.currency}</strong></div></div></div>
              </div>
            </Accordion.Body></Accordion.Panel>
          </Accordion.Item>)}
        </Accordion>
      </section>
      <section className="reception-section"><div className="form-section-title"><span>03</span><h3>Notas de recepción</h3></div><label className="field"><span>Nota compartida (opcional)</span><textarea rows={2} maxLength={2000} value={receptionNotes} onChange={event => setReceptionNotes(event.target.value)} placeholder="Información común a todos los equipos de esta visita"/></label></section>
      <div className="form-totals"><div><span>Totales de la recepción</span><strong>{(['MXN', 'USD'] as const).filter(currency => totalsByCurrency[currency] > 0).map(currency => `${(totalsByCurrency[currency] / 100).toLocaleString('es-MX', { style: 'currency', currency })} ${currency}`).join(' · ') || 'Captura los importes por equipo'}</strong></div></div>
      {submitHint && <p className="help reception-submit-hint" role="status">{submitHint}</p>}
      {error && <p className="form-error" role="alert"><AlertCircle size={17}/>{error}</p>}
    </fieldset>
    <div className="dialog-actions"><button type="button" className="sc-button secondary" disabled={busy} onClick={close}>Cancelar</button><button className="sc-button primary" disabled={busy || zeroTotalDeviceIndex >= 0 || excessiveDepositDeviceIndex >= 0}>{busy ? <LoaderCircle size={17} className="spin"/> : <Check size={17}/>} Registrar {devices.length} {devices.length === 1 ? 'equipo' : 'equipos'}</button></div>
  </form>;
}
