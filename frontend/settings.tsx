'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Accordion, Button, ToggleButton, ToggleButtonGroup } from '@heroui/react';
import { Check, ImagePlus, LoaderCircle, Settings as SettingsIcon, ShieldCheck, Trash2 } from 'lucide-react';
import { type Currency, type RecordData, type Settings } from './types';
import { type UiPrefs } from '@/lib/prefs';
import { Field, type Mutation, type Theme } from './ui';
import { ThermalTicket } from './tickets';

export function InterfacePreferences({ prefs, setPrefs }: { prefs: UiPrefs; setPrefs: (value: UiPrefs) => void }) {
  return <section className="panel settings-panel interface-preferences">
    <div className="section-heading"><div><h2>Preferencias de interfaz</h2><p>Se guardan solo en este navegador.</p></div><SettingsIcon size={20} /></div>
    <div className="form-grid preference-grid">
      <Field label="Vista inicial"><select value={prefs.initialView} onChange={event => setPrefs({ ...prefs, initialView: event.target.value as UiPrefs['initialView'] })}><option value="home">Inicio</option><option value="summary">Resumen</option><option value="orders">Órdenes</option><option value="payments">Cobros</option><option value="pos">Punto de venta</option></select></Field>
      <Field label="Filtro de órdenes"><select value={prefs.orderFilter} onChange={event => setPrefs({ ...prefs, orderFilter: event.target.value as UiPrefs['orderFilter'] })}><option value="nueva">Nuevas</option><option value="proceso">En proceso</option><option value="terminada">Terminadas</option><option value="todas">Todas</option></select></Field>
      <Field label="Densidad"><select value={prefs.density} onChange={event => setPrefs({ ...prefs, density: event.target.value as UiPrefs['density'] })}><option value="comfortable">Cómoda</option><option value="compact">Compacta</option></select></Field>
      <Field label="Tamaño de letra"><select value={prefs.fontSize} onChange={event => setPrefs({ ...prefs, fontSize: event.target.value as UiPrefs['fontSize'] })}><option value="normal">Normal</option><option value="large">Grande</option></select></Field>
    </div>
    <fieldset className="module-preferences"><legend>Módulos que puedes ocultar</legend>{([['suppliers', 'Proveedores'], ['data', 'Datos']] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={!prefs.hideModules[key]} onChange={event => setPrefs({ ...prefs, hideModules: { ...prefs.hideModules, [key]: !event.target.checked } })} /><span>{label}</span></label>)}<p className="preference-note">Punto de venta permanece disponible desde el menú en todo momento.</p></fieldset>
  </section>;
}

const previewOrder: RecordData = {
  id: 1, createdAt: '2030-01-01T12:00:00.000Z', updatedAt: '2030-01-01T12:00:00.000Z',
  firstName: 'Cliente', lastName: 'de ejemplo', phone: '686 000 0000', brand: 'Apple', model: 'iPhone 13',
  problem: 'Pantalla estrellada', repairType: 'Cambio de pantalla', notes: '', currency: 'MXN',
  serviceCents: 120000, partsCents: 0, reviewCents: 0, reviewUsdCents: 500, applyReview: 0,
  exchangeRate: null, revision: 0, totalCents: 120000, paidCents: 30000, depositCents: 30000,
  dueCents: 90000, imei: 'IMEI-DE-EJEMPLO', unlockCode: '', accessoriesLeft: 'Funda y SIM',
  physicalCondition: 'Rayón leve en una esquina', promisedDate: '2030-01-03', technician: 'Técnico',
  warrantyDays: 0, deliveredAt: null, cancelReason: '',
};

type SettingsSection = 'business' | 'tickets' | 'tariffs' | 'inventory';

export function SettingsForm({ settings, mutate, notify, theme, setTheme }: { settings: Settings; mutate: (p: Mutation) => Promise<{ id: number }>; notify: (s: string) => void; theme: Theme; setTheme: (v: Theme) => void }) {
  const previousSettings = useRef(settings);
  const [name, setName] = useState(settings.workshopName);
  const [currency, setCurrency] = useState(settings.defaultCurrency);
  const [review, setReview] = useState(String(settings.reviewUsdCents / 100));
  const [rate, setRate] = useState(settings.exchangeRate === null ? '' : String(settings.exchangeRate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [logo, setLogo] = useState(settings.logoDataUrl);
  const [logoChanged, setLogoChanged] = useState(false);
  const [phone, setPhone] = useState(settings.phone);
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp);
  const [address, setAddress] = useState(settings.address);
  const [city, setCity] = useState(settings.city);
  const [timezoneValue, setTimezoneValue] = useState(settings.timezone);
  const [orderNote, setOrderNote] = useState(settings.ticketOrderNote);
  const [paymentNote, setPaymentNote] = useState(settings.ticketPaymentNote);
  const [saleNote, setSaleNote] = useState(settings.ticketSaleNote);
  const [paper, setPaper] = useState(String(settings.ticketPaperMm));
  const [lowStock, setLowStock] = useState(String(settings.lowStockThreshold));
  const [staleDays, setStaleDays] = useState(String(settings.quoteStaleDays));
  const [quoteWait, setQuoteWait] = useState(String(settings.quoteResponseWaitMinutes ?? 20));
  const [orderPrefix, setOrderPrefix] = useState(settings.folioPrefixOrder);
  const [quotePrefix, setQuotePrefix] = useState(settings.folioPrefixQuote);
  const [salePrefix, setSalePrefix] = useState(settings.folioPrefixSale);

  useEffect(() => {
    const previous = previousSettings.current;
    if (previous.revision === settings.revision) return;
    if (name === previous.workshopName) setName(settings.workshopName);
    if (currency === previous.defaultCurrency) setCurrency(settings.defaultCurrency);
    if (review === String(previous.reviewUsdCents / 100)) setReview(String(settings.reviewUsdCents / 100));
    if (rate === (previous.exchangeRate === null ? '' : String(previous.exchangeRate))) setRate(settings.exchangeRate === null ? '' : String(settings.exchangeRate));
    if (!logoChanged && logo === previous.logoDataUrl) setLogo(settings.logoDataUrl);
    if (phone === previous.phone) setPhone(settings.phone);
    if (whatsapp === previous.whatsapp) setWhatsapp(settings.whatsapp);
    if (address === previous.address) setAddress(settings.address);
    if (city === previous.city) setCity(settings.city);
    if (timezoneValue === previous.timezone) setTimezoneValue(settings.timezone);
    if (orderNote === previous.ticketOrderNote) setOrderNote(settings.ticketOrderNote);
    if (paymentNote === previous.ticketPaymentNote) setPaymentNote(settings.ticketPaymentNote);
    if (saleNote === previous.ticketSaleNote) setSaleNote(settings.ticketSaleNote);
    if (Number(paper) === previous.ticketPaperMm) setPaper(String(settings.ticketPaperMm));
    if (Number(lowStock) === previous.lowStockThreshold) setLowStock(String(settings.lowStockThreshold));
    if (Number(staleDays) === previous.quoteStaleDays) setStaleDays(String(settings.quoteStaleDays));
    if (Number(quoteWait) === previous.quoteResponseWaitMinutes) setQuoteWait(String(settings.quoteResponseWaitMinutes ?? 20));
    if (orderPrefix === previous.folioPrefixOrder) setOrderPrefix(settings.folioPrefixOrder);
    if (quotePrefix === previous.folioPrefixQuote) setQuotePrefix(settings.folioPrefixQuote);
    if (salePrefix === previous.folioPrefixSale) setSalePrefix(settings.folioPrefixSale);
    previousSettings.current = settings;
  }, [settings, name, currency, review, rate, logo, logoChanged, phone, whatsapp, address, city, timezoneValue, orderNote, paymentNote, saleNote, paper, lowStock, staleDays, quoteWait, orderPrefix, quotePrefix, salePrefix]);

  const dirty: Record<SettingsSection, boolean> = {
    business: name !== settings.workshopName || phone !== settings.phone || whatsapp !== settings.whatsapp || address !== settings.address || city !== settings.city || timezoneValue !== settings.timezone || logoChanged,
    tickets: orderNote !== settings.ticketOrderNote || paymentNote !== settings.ticketPaymentNote || saleNote !== settings.ticketSaleNote || Number(paper) !== settings.ticketPaperMm,
    tariffs: currency !== settings.defaultCurrency || Number(review) !== settings.reviewUsdCents / 100 || rate !== (settings.exchangeRate === null ? '' : String(settings.exchangeRate)) || orderPrefix !== settings.folioPrefixOrder || quotePrefix !== settings.folioPrefixQuote || salePrefix !== settings.folioPrefixSale,
    inventory: Number(lowStock) !== settings.lowStockThreshold || Number(staleDays) !== settings.quoteStaleDays || Number(quoteWait) !== (settings.quoteResponseWaitMinutes ?? 20),
  };

  async function chooseLogo(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Elige un logotipo PNG, JPG o WebP.'); return; }
    if (file.size > 350000) { setError('La imagen no puede superar 350 KB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') { setLogo(reader.result); setLogoChanged(true); setError(''); } };
    reader.onerror = () => setError('No se pudo leer la imagen. Intenta otra vez.');
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const section = submitter instanceof HTMLButtonElement && submitter.value in dirty ? submitter.value as SettingsSection : 'business';
    const sectionElement = [...event.currentTarget.querySelectorAll<HTMLElement>('.settings-card')].find(element => element.id === section);
    const invalidControl = sectionElement?.querySelector(':invalid') as unknown as { reportValidity?: () => boolean } | null;
    if (invalidControl?.reportValidity) { invalidControl.reportValidity(); return; }
    const common: Mutation = {
      action: 'settings', revision: settings.revision,
      workshopName: settings.workshopName, defaultCurrency: settings.defaultCurrency,
      reviewUsd: settings.reviewUsdCents / 100, exchangeRate: settings.exchangeRate ?? '',
      phone: settings.phone, whatsapp: settings.whatsapp, address: settings.address, city: settings.city,
      timezone: settings.timezone, ticketOrderNote: settings.ticketOrderNote,
      ticketPaymentNote: settings.ticketPaymentNote, ticketSaleNote: settings.ticketSaleNote,
      ticketPaperMm: settings.ticketPaperMm, lowStockThreshold: settings.lowStockThreshold,
      quoteStaleDays: settings.quoteStaleDays, folioPrefixOrder: settings.folioPrefixOrder,
      folioPrefixQuote: settings.folioPrefixQuote, folioPrefixSale: settings.folioPrefixSale,
    };
    const changes: Record<SettingsSection, Mutation> = {
      business: { workshopName: name, phone, whatsapp, address, city, timezone: timezoneValue, ...(logoChanged ? { logoDataUrl: logo } : {}) },
      tickets: { ticketOrderNote: orderNote, ticketPaymentNote: paymentNote, ticketSaleNote: saleNote, ticketPaperMm: Number(paper) },
      tariffs: { defaultCurrency: currency, reviewUsd: review, exchangeRate: rate, folioPrefixOrder: orderPrefix, folioPrefixQuote: quotePrefix, folioPrefixSale: salePrefix },
      inventory: { lowStockThreshold: Number(lowStock), quoteStaleDays: Number(staleDays), quoteResponseWaitMinutes: Number(quoteWait) },
    };
    setBusy(true);
    setError('');
    try {
      await mutate({ ...common, ...changes[section] });
      if (section === 'business') setLogoChanged(false);
      notify('Sección guardada');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar. Conservamos los datos; intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  const saveButton = (section: SettingsSection) => <div className="settings-save-row"><span className={dirty[section] ? 'settings-dirty' : 'settings-saved'}>{dirty[section] ? 'Cambios sin guardar' : 'Sin cambios pendientes'}</span><Button variant="primary" size="sm" type="submit" name="section" value={section} isDisabled={busy || !dirty[section]}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}Guardar sección</Button></div>;
  const previewSettings: Settings = { ...settings, phone, city, timezone: timezoneValue, ticketPaperMm: Number(paper) === 80 ? 80 : 58, ticketOrderNote: orderNote };

  return <form className="panel settings-panel" onSubmit={submit} noValidate>
    <fieldset disabled={busy}>
      <div className="section-heading"><div><h2>Configuraciones del taller</h2><p>Abre solo el grupo que necesitas. Cada sección se guarda por separado.</p></div><SettingsIcon size={20} /></div>
      <div className="settings-content">
        <p className="settings-required-note">* Campo obligatorio.</p>
        <Accordion className="settings-accordion" variant="surface" allowsMultipleExpanded defaultExpandedKeys={['business']}>
        <Accordion.Item id="business"><Accordion.Heading><Accordion.Trigger><span className="settings-accordion-title">Datos del negocio<small>Nombre, contacto, ubicación y logotipo</small></span><Accordion.Indicator /></Accordion.Trigger></Accordion.Heading><Accordion.Panel><Accordion.Body><section id="business" className="settings-card">
          <div className="form-grid">
            <Field label="Nombre del taller *"><input required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></Field>
            <Field label="Teléfono"><input maxLength={40} value={phone} onChange={event => setPhone(event.target.value)} /></Field>
            <Field label="WhatsApp"><input maxLength={40} value={whatsapp} onChange={event => setWhatsapp(event.target.value)} /></Field>
            <Field label="Ciudad"><input maxLength={100} value={city} onChange={event => setCity(event.target.value)} /></Field>
            <Field label="Dirección" wide><input maxLength={180} value={address} onChange={event => setAddress(event.target.value)} /></Field>
            <div className="field wide"><span id="business-timezone-label">Zona horaria</span><input aria-labelledby="business-timezone-label" aria-describedby="business-timezone-help" maxLength={80} value={timezoneValue} onChange={event => setTimezoneValue(event.target.value)} /><small id="business-timezone-help" className="field-hint">Usa una zona IANA, por ejemplo America/Tijuana. Define las fechas y horas que aparecen en órdenes, caja y tickets.</small></div>
          </div>
          <div className="logo-settings"><div><h3>Logotipo del taller</h3><p>Se usa en la aplicación y en los tickets impresos.</p></div><div className="logo-editor"><div className="logo-preview"><img src={logo || '/salvacel-logo.png'} alt="Vista previa del logotipo" /></div><div className="logo-actions"><label className="sc-button secondary logo-upload"><ImagePlus size={17} />{logoChanged ? 'Cambiar imagen' : 'Subir logotipo'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => void chooseLogo(event.target.files?.[0])} /></label>{(logo || settings.logoDataUrl) && <button type="button" className="sc-button text-button" onClick={() => { setLogo(null); setLogoChanged(true); setError(''); }}><Trash2 size={16} />Usar logo original</button>}<span>PNG, JPG o WebP · máximo 350 KB</span></div></div></div>
          {saveButton('business')}
        </section></Accordion.Body></Accordion.Panel></Accordion.Item>
        <Accordion.Item id="tickets"><Accordion.Heading><Accordion.Trigger><span className="settings-accordion-title">Tickets<small>Formato, notas y vista previa del comprobante</small></span><Accordion.Indicator /></Accordion.Trigger></Accordion.Heading><Accordion.Panel><Accordion.Body><section id="tickets" className="settings-card">
          <div className="form-grid"><Field label="Papel"><select value={paper} onChange={event => setPaper(event.target.value)}><option value="58">58 mm</option><option value="80">80 mm</option></select></Field><Field label="Nota de orden"><textarea rows={2} maxLength={300} value={orderNote} onChange={event => setOrderNote(event.target.value)} /></Field><Field label="Nota de pago"><textarea rows={2} maxLength={300} value={paymentNote} onChange={event => setPaymentNote(event.target.value)} /></Field><Field label="Nota de venta"><textarea rows={2} maxLength={300} value={saleNote} onChange={event => setSaleNote(event.target.value)} /></Field></div>
          <div className="ticket-preview"><div className="ticket-preview-heading">Vista previa en vivo</div><ThermalTicket item={{ type: 'order', order: previewOrder }} settings={previewSettings} logo={logo || '/salvacel-logo.png'} workshop={name || 'Nombre del taller'} preview /></div>
          {saveButton('tickets')}
        </section></Accordion.Body></Accordion.Panel></Accordion.Item>
        <Accordion.Item id="tariffs"><Accordion.Heading><Accordion.Trigger><span className="settings-accordion-title">Moneda y folios<small>Importes de nuevas órdenes y formato de identificadores</small></span><Accordion.Indicator /></Accordion.Trigger></Accordion.Heading><Accordion.Panel><Accordion.Body><section id="tariffs" className="settings-card">
          <div className="settings-subgroup"><div className="settings-subgroup-heading"><h3>Moneda y revisión</h3><p>Valores iniciales para órdenes nuevas.</p></div><div className="form-grid"><Field label="Moneda inicial de nuevas órdenes"><select aria-describedby="default-currency-help" value={currency} onChange={event => setCurrency(event.target.value as Currency)}><option value="MXN">Pesos mexicanos · MXN</option><option value="USD">Dólares · USD</option></select><small id="default-currency-help" className="field-hint">Solo define el valor inicial de órdenes nuevas; no cambia órdenes existentes ni convierte importes guardados.</small></Field><Field label="Tarifa base de revisión · USD *"><input required type="number" min="0" max="1000000" step="0.01" value={review} onChange={event => setReview(event.target.value)} /></Field><div className="field wide"><span id="review-exchange-label">Tipo de cambio · MXN por USD</span><input aria-labelledby="review-exchange-label" aria-describedby="review-exchange-help" type="number" min="0.0001" max="1000" step="0.0001" placeholder="Introduce el tipo de cambio que usas" value={rate} onChange={event => setRate(event.target.value)} /><small id="review-exchange-help" className="field-hint">Convierte la tarifa de revisión de USD a MXN cuando la orden se cobra en pesos. Ejemplo: 17 significa 17 MXN por cada USD.</small></div></div></div>
          <div className="settings-subgroup"><div className="settings-subgroup-heading"><h3>Prefijos de folio</h3><p>Identifican órdenes, presupuestos y ventas en sus comprobantes.</p></div><div className="form-grid"><Field label="Prefijo de órdenes"><input maxLength={4} value={orderPrefix} onChange={event => setOrderPrefix(event.target.value.toUpperCase())} /></Field><Field label="Prefijo de presupuestos"><input maxLength={4} value={quotePrefix} onChange={event => setQuotePrefix(event.target.value.toUpperCase())} /></Field><Field label="Prefijo de ventas"><input maxLength={4} value={salePrefix} onChange={event => setSalePrefix(event.target.value.toUpperCase())} /></Field></div><p className="help">Cambiar un prefijo solo afecta la presentación; los folios existentes no se renumeran.</p></div>{saveButton('tariffs')}
        </section></Accordion.Body></Accordion.Panel></Accordion.Item>
        <Accordion.Item id="inventory"><Accordion.Heading><Accordion.Trigger><span className="settings-accordion-title">Inventario y presupuestos<small>Umbral de stock y tiempos de seguimiento</small></span><Accordion.Indicator /></Accordion.Trigger></Accordion.Heading><Accordion.Panel><Accordion.Body><section id="inventory" className="settings-card">
          <div className="form-grid"><Field label="Umbral de inventario bajo"><input type="number" min="0" max="1000" value={lowStock} onChange={event => setLowStock(event.target.value)} /></Field><Field label="Días para presupuesto vencido"><input type="number" min="1" max="3650" value={staleDays} onChange={event => setStaleDays(event.target.value)} /></Field><Field label="Ventana de respuesta de proveedores (minutos)"><input type="number" min="1" max="1440" value={quoteWait} onChange={event => setQuoteWait(event.target.value)} /></Field></div>
          {saveButton('inventory')}
        </section></Accordion.Body></Accordion.Panel></Accordion.Item>
        <Accordion.Item id="appearance"><Accordion.Heading><Accordion.Trigger><span className="settings-accordion-title">Interfaz<small>Tema visual y preferencias del espacio de trabajo</small></span><Accordion.Indicator /></Accordion.Trigger></Accordion.Heading><Accordion.Panel><Accordion.Body><section id="appearance" className="settings-card"><p className="help">Elige un tema o sigue el del dispositivo. Las preferencias locales se guardan al cambiarlas.</p><ToggleButtonGroup aria-label="Tema de color" className="theme-toggle" selectionMode="single" disallowEmptySelection selectedKeys={new Set([theme])} onSelectionChange={keys => { const selected = String([...keys][0] ?? ''); if (selected === 'system' || selected === 'light' || selected === 'dark') setTheme(selected); }}>{([{ value: 'system', label: 'Sistema' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }] as const).map(option => <ToggleButton key={option.value} id={option.value} size="sm">{option.label}</ToggleButton>)}</ToggleButtonGroup></section></Accordion.Body></Accordion.Panel></Accordion.Item>
        </Accordion>
        <div className="notice"><ShieldCheck size={20} /><span>Acceso privado. Los datos del taller se guardan al confirmar cada operación.</span></div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </fieldset>
  </form>;
}
