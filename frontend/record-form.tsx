"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Check, LoaderCircle, Receipt } from "lucide-react";
import {
  type Brand,
  type PaymentMethod,
  type RecordData,
  type Customer,
  type ServiceCatalog,
  type Settings,
  type Supplier,
  money,
  statusLabels,
} from "./types";
import { Field, Method, type Mutation } from "./ui";
import { DraftRecovery, useFormDraft, type WorkshopDraft } from "./use-form-draft";

type QuickOrderDraft = { form: Record<string, string | boolean>; selectedCustomerId: number | null; selectedDeviceId: number | null; requestQuote: boolean; quoteSupplierIds: number[]; requestKey: string };
type TranscriptionFields = Record<string, string>;
type TranscriptionCard = { id: number; status: string; createdAt: string; fields: TranscriptionFields | null; summary: string };
type TranscriptionDraft = { id: number; fields: TranscriptionFields };

function transcriptionFormFields(fields: TranscriptionFields) {
  return {
    firstName: fields.firstName || "",
    lastName: fields.lastName || "",
    phone: fields.phone || "",
    brand: fields.brand || "",
    model: fields.model || "",
    imei: fields.imei || "",
    accessoriesLeft: fields.accessoriesLeft || "",
    physicalCondition: fields.physicalCondition || "",
    problem: fields.problem || "",
    repairType: fields.repairType || "",
    notes: fields.customerQuestions ? `Preguntas del cliente: ${fields.customerQuestions}` : "",
  };
}

export function RecordForm({
  quote,
  record,
  settings,
  brands,
  services,
  paymentMethods,
  suppliers = [],
  customers = [],
  orders,
  assistantDraft,
  transcriptionDraft,
  mutate,
  close,
  saved,
}: {
  quote: boolean;
  record?: RecordData;
  settings: Settings;
  brands: Brand[];
  services: ServiceCatalog[];
  paymentMethods: PaymentMethod[];
  suppliers?: Supplier[];
  customers?: Customer[];
  orders: RecordData[];
  assistantDraft?: Record<string, string>;
  transcriptionDraft?: TranscriptionDraft | null;
  mutate: (p: Mutation) => Promise<{ id: number; transcriptionWarning?: string }>;
  close: () => void;
  saved: (id: number, requestedQuote?: boolean, transcriptionWarning?: string) => void;
}) {
  const [form, setForm] = useState({
    firstName: record?.firstName || transcriptionDraft?.fields.firstName || assistantDraft?.firstName || "",
    lastName: record?.lastName || transcriptionDraft?.fields.lastName || assistantDraft?.lastName || "",
    phone: record?.phone || transcriptionDraft?.fields.phone || assistantDraft?.phone || "",
    brand: record?.brand || transcriptionDraft?.fields.brand || assistantDraft?.brand || "",
    model: record?.model || transcriptionDraft?.fields.model || assistantDraft?.model || "",
    problem: record?.problem || transcriptionDraft?.fields.problem || assistantDraft?.problem || "",
    repairType: record?.repairType || transcriptionDraft?.fields.repairType || assistantDraft?.repairType || "",
    notes: record?.notes || (transcriptionDraft?.fields.customerQuestions ? `Preguntas del cliente: ${transcriptionDraft.fields.customerQuestions}` : assistantDraft?.notes || ""),
    requiredPart: "",
    currency: record?.currency || settings.defaultCurrency,
    service: record ? String(record.serviceCents / 100) : "",
    parts: record ? String(record.partsCents / 100) : "",
    applyReview: !!record?.applyReview,
    status: record?.status || "nueva",
    deposit: "",
    method: "efectivo",
    imei: record?.imei || "",
    unlockCode: record?.unlockCode || "",
    accessoriesLeft: record?.accessoriesLeft || "",
    physicalCondition: record?.physicalCondition || "",
    promisedDate: record?.promisedDate || "",
    technician: record?.technician || "",
    warrantyDays: String(record?.warrantyDays || 0),
    validUntil: record?.validUntil || "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [requestQuote, setRequestQuote] = useState(false),
    [quoteSupplierIds, setQuoteSupplierIds] = useState<number[]>([]),
    [customerSearch, setCustomerSearch] = useState(""),
    [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(record?.customerId ?? null),
    [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(record?.deviceId ?? null),
    [latestTranscription, setLatestTranscription] = useState<TranscriptionCard | null>(null),
    [selectedTranscriptionId, setSelectedTranscriptionId] = useState<number | null>(transcriptionDraft?.id ?? null),
    [transcriptionApplied, setTranscriptionApplied] = useState(!!transcriptionDraft);
  useEffect(() => {
    if (record || transcriptionDraft) return;
    const controller = new AbortController();
    void fetch("/api/assistant/transcriptions", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { items?: TranscriptionCard[]; error?: string };
        if (!response.ok) throw new Error(result.error || "No se pudieron consultar las fichas de conversación.");
        setLatestTranscription(result.items?.find((item) => item.status === "pendiente") || null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron consultar las fichas de conversación.");
      });
    return () => controller.abort();
  }, [record, transcriptionDraft]);
  function chooseService(value: string) {
    set("repairType", value);
    const item = services.find(
      (service) => service.active && service.name === value,
    );
    if (item && !record) {
      set("service", String(item.basePriceCents / 100));
      set("warrantyDays", String(item.warrantyDays));
    }
  }
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (!record && ['brand', 'model', 'imei', 'deviceType'].includes(k)) setSelectedDeviceId(null);
  };
  const draftPayload: QuickOrderDraft = { form: { ...form, unlockCode: "" }, selectedCustomerId, selectedDeviceId, requestQuote, quoteSupplierIds, requestKey };
  const hasDraftContent = Object.entries(form).some(([key, value]) => typeof value === "string" && value.trim() !== "" && !["currency", "status", "method", "warrantyDays"].includes(key)) || Object.entries(form).some(([key, value]) => key === "applyReview" && value === true);
  const draft = useFormDraft<QuickOrderDraft>({ kind: "order", payload: draftPayload, enabled: !quote && !record, hasContent: hasDraftContent, restore: (value) => { setForm({ ...value.form, unlockCode: "" } as typeof form); setSelectedCustomerId(value.selectedCustomerId); setSelectedDeviceId(value.selectedDeviceId ?? null); setRequestQuote(value.requestQuote); setQuoteSupplierIds(value.quoteSupplierIds); setRequestKey(value.requestKey || crypto.randomUUID()); } });
  const sameReview =
      record?.applyReview &&
      form.applyReview &&
      form.currency === record.currency,
    fee = sameReview ? record!.reviewUsdCents : settings.reviewUsdCents,
    rate = sameReview ? record!.exchangeRate : settings.exchangeRate;
  const review = form.applyReview
      ? sameReview
        ? record!.reviewCents
        : form.currency === "USD"
          ? fee
          : rate
            ? Math.round(fee * rate)
            : 0
      : 0,
    missingRate = form.applyReview && form.currency === "MXN" && !rate;
  const total =
      Math.round(Number(form.service || 0) * 100) +
      Math.round(Number(form.parts || 0) * 100) +
      review,
    paid = record?.paidCents || Math.round(Number(form.deposit || 0) * 100),
    brandIsNew =
      !!form.brand.trim() &&
      !brands.some(
        (item) =>
          item.name.trim().toLocaleLowerCase() ===
          form.brand.trim().toLocaleLowerCase(),
      );
  const [brandMessage, setBrandMessage] = useState("");
  function useTranscription() {
    const fields = latestTranscription?.fields;
    if (!latestTranscription || !fields) return;
    const additions = transcriptionFormFields(fields);
    setForm((current) => ({
      ...current,
      ...Object.fromEntries(Object.entries(additions).filter(([, value]) => value)),
      ...(additions.notes ? { notes: [current.notes, additions.notes].filter(Boolean).join("\n") } : {}),
    }));
    setSelectedTranscriptionId(latestTranscription.id);
    setTranscriptionApplied(true);
  }
  async function addBrand() {
    setBusy(true);
    setError("");
    setBrandMessage("");
    try {
      await mutate({
        action: "createBrand",
        name: form.brand.trim(),
        sort: brands.length + 1,
      });
      setBrandMessage(`«${form.brand.trim()}» agregada al catálogo.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar la marca.");
    } finally {
      setBusy(false);
    }
  }
  const phoneDigits = form.phone.replace(/\D/g, ""),
    clientMatches =
      phoneDigits.length >= 3
        ? orders
            .filter(
              (order) =>
                order.id !== record?.id &&
                order.phone.replace(/\D/g, "").startsWith(phoneDigits),
            )
            .slice(0, 5)
        : [];
  const customerQuery = customerSearch.trim().toLocaleLowerCase();
  const customerDigits = customerQuery.replace(/\D/g, "");
  const customerMatches = customerQuery
    ? customers.filter((customer) => `${customer.firstName} ${customer.lastName} ${customer.phone} ${customer.phoneAdditional || ""}`.toLocaleLowerCase().includes(customerQuery) || (customerDigits.length >= 3 && [customer.phone, customer.phoneAdditional || ""].some((phone) => phone.replace(/\D/g, "").includes(customerDigits)))).slice(0, 8)
    : [];
  const previousCustomerDevices = selectedCustomerId ? orders.filter((order) => order.customerId === selectedCustomerId && order.deviceId != null).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id).filter((order, index, rows) => rows.findIndex((candidate) => candidate.deviceId === order.deviceId) === index) : [];
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (
      !quote &&
      !record &&
      requestQuote &&
      (!form.requiredPart.trim() || quoteSupplierIds.length === 0)
    ) {
      setError(
        "Indica la refacción y selecciona al menos un proveedor para solicitar precio.",
      );
      setBusy(false);
      return;
    }
    try {
      const result = await mutate({
        ...form,
        ...(!quote && !record && requestQuote
          ? { requestQuote: true, quoteSupplierIds }
          : {}),
        ...(!quote && !record && selectedCustomerId ? { customerId: selectedCustomerId } : {}),
        ...(!quote && !record && selectedDeviceId ? { deviceId: selectedDeviceId } : {}),
        action: record
          ? quote
            ? "updateQuote"
            : "updateOrder"
          : quote
            ? "createQuote"
            : "createOrder",
        id: record?.id,
        revision: record?.revision,
        requestKey,
        ...(!quote && !record && selectedTranscriptionId ? { transcriptionId: selectedTranscriptionId } : {}),
      });
      if (!quote && !record) void draft.discard().catch(() => undefined);
      saved(result.id, requestQuote, result.transcriptionWarning);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="form-body">
        {!record && (latestTranscription || transcriptionDraft) && <section className="transcription-suggestion" aria-label="Ficha de conversación pendiente">
          <strong>{transcriptionDraft ? 'Datos de conversación seleccionados' : 'Conversación pendiente más reciente'}</strong>
          <p>{transcriptionDraft ? Object.values(transcriptionDraft.fields).filter(Boolean).join(' · ') : latestTranscription?.summary}</p>
          {!transcriptionDraft && latestTranscription?.fields && <button type="button" className="sc-button secondary small" onClick={useTranscription}>Usar datos sugeridos</button>}
          {!transcriptionDraft && latestTranscription && !latestTranscription.fields && <small>Esta ficha aún no tiene interpretación. Ábrela en el chat para reintentar.</small>}
          {(transcriptionApplied || transcriptionDraft) && <small role="status">Revisa y corrige los campos sugeridos por transcripción antes de guardar.</small>}
        </section>}
        <div className="form-section-title">
          <span>01</span>
          <h3>Cliente y equipo</h3>
          <small>* Obligatorios</small>
        </div>
        {!quote && !record && <><DraftRecovery drafts={draft.drafts} onRestore={draft.restoreDraft} onDiscard={(item: WorkshopDraft<QuickOrderDraft>) => { void draft.discard(item.id).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo descartar el borrador.")); }}/>{draft.status === "saving" && <small role="status">Guardando borrador…</small>}{draft.status === "saved" && <small role="status">Borrador guardado automáticamente.</small>}{draft.error && <small role="alert">{draft.error}</small>}</>}
        {!quote && !record && <Field label="Vincular perfil existente (opcional)">
          <input type="search" aria-label="Buscar perfil por nombre o teléfono" placeholder="Buscar por nombre o cualquiera de sus teléfonos" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)}/>
          {selectedCustomerId && <button type="button" className="link-button" onClick={() => { setSelectedCustomerId(null); setSelectedDeviceId(null); setCustomerSearch(""); }}>Quitar perfil vinculado</button>}
          {customerMatches.length > 0 && <div className="client-suggestions" role="list" aria-label="Perfiles coincidentes">{customerMatches.map((customer) => <button type="button" role="listitem" key={customer.id} onClick={() => { setSelectedCustomerId(customer.id); setSelectedDeviceId(null); setForm((current) => ({ ...current, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone })); setCustomerSearch(""); }}><strong>{customer.firstName} {customer.lastName}</strong><small>{[customer.phone, customer.phoneAdditional].filter(Boolean).join(" · ") || "Sin teléfono"}</small></button>)}</div>}
          {selectedCustomerId && !customers.some((customer) => customer.id === selectedCustomerId) && <small>El perfil seleccionado ya no está disponible. Actualiza los datos.</small>}
        </Field>}
        {!quote && !record && selectedCustomerId && <Field label="Equipo anterior del cliente (opcional)"><select aria-label="Elegir un equipo anterior del cliente" value={selectedDeviceId ?? ""} onChange={(event) => { const previous = previousCustomerDevices.find((order) => String(order.deviceId) === event.target.value); setSelectedDeviceId(previous?.deviceId ?? null); if (previous) setForm((current) => ({ ...current, brand: previous.brand, model: previous.model, imei: previous.imei || "", accessoriesLeft: previous.accessoriesLeft || "", physicalCondition: previous.physicalCondition || "" })); }}><option value="">Equipo nuevo (capturar datos manualmente)</option>{previousCustomerDevices.map((order) => <option key={String(order.deviceId)} value={String(order.deviceId)}>{order.brand} {order.model} · folio {order.id}{order.imei ? ` · ${order.imei}` : " · sin serie/IMEI"}</option>)}</select>{selectedDeviceId && <small>Solo se vincula si lo eliges aquí; esta visita conserva su propio folio.</small>}</Field>}
        <div className="form-grid">
          {(
            [
              {
                k: "firstName",
                label: "Nombre *",
                auto: "given-name",
                required: true,
              },
              {
                k: "lastName",
                label: "Apellido *",
                auto: "family-name",
                required: true,
              },
              {
                k: "phone",
                label: "Teléfono (opcional)",
                auto: "tel",
                required: false,
              },
              { k: "brand", label: "Marca *", auto: "off", required: true },
              { k: "model", label: "Modelo *", auto: "off", required: true },
            ] as const
          ).map(({ k, label, auto, required }) => (
            <Field label={label} key={k} wide={k === "model"}>
              <input
                autoFocus={k === "firstName"}
                required={required}
                type={k === "phone" ? "tel" : "text"}
                maxLength={k === "phone" ? 40 : 100}
                autoComplete={auto}
                list={k === "brand" ? "brands" : undefined}
                value={form[k]}
                onChange={(e) => {
                  set(k, e.target.value);
                  if (k === "brand") setBrandMessage("");
                }}
              />
              {k === "brand" && brandIsNew && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => void addBrand()}
                >
                  Agregar «{form.brand.trim()}» al catálogo
                </button>
              )}
              {k === "brand" && brandMessage && (
                <small role="status">{brandMessage}</small>
              )}
            </Field>
          ))}
          {clientMatches.length > 0 && (
            <div
              className="client-suggestions"
              role="group"
              aria-label="Clientes encontrados por teléfono"
            >
              {clientMatches.map((order) => (
                <button
                  type="button"
                  key={order.id}
                  aria-label={`Usar cliente ${order.firstName} ${order.lastName}`}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      firstName: order.firstName,
                      lastName: order.lastName,
                      phone: order.phone,
                    }))
                  }
                >
                  <strong>
                    {order.firstName} {order.lastName}
                  </strong>
                  <small>
                    {order.brand} {order.model}
                    {order.repairType ? ` · ${order.repairType}` : ""}
                  </small>
                  {order.brand.trim().toLocaleLowerCase() ===
                    form.brand.trim().toLocaleLowerCase() &&
                    order.model.trim().toLocaleLowerCase() ===
                      form.model.trim().toLocaleLowerCase() &&
                    form.brand.trim() &&
                    form.model.trim() && (
                      <span>Reincidencia: este equipo ya tiene historial</span>
                    )}
                </button>
              ))}
            </div>
          )}
          <datalist id="brands">
            {brands
              .filter((item) => item.active)
              .map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
          </datalist>
        </div>
        <div className="form-section-title">
          <span>02</span>
          <h3>Reparación</h3>
        </div>
        <div className="form-grid">
          <Field label="Problema reportado" wide>
            <textarea
              rows={2}
              maxLength={3000}
              placeholder="¿Qué le sucede al equipo?"
              value={form.problem}
              onChange={(e) => set("problem", e.target.value)}
            />
          </Field>
          <Field label="Tipo de reparación *">
            <input
              required
              list="repairs"
              maxLength={150}
              placeholder="Ej. Cambio de pantalla"
              value={form.repairType}
              onChange={(e) => chooseService(e.target.value)}
            />
            <datalist id="repairs">
              {services
                .filter((item) => item.active)
                .map((item) => (
                  <option key={item.id}>{item.name}</option>
                ))}
            </datalist>
          </Field>
          {!quote && (
            <Field label="Estado">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {Object.entries(statusLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {!quote && !record && (
            <div className="quick-quote-fields">
              <Field label="Refacción requerida (opcional)" wide>
                <input
                  maxLength={150}
                  placeholder="Ej. Pantalla Samsung A54"
                  value={form.requiredPart}
                  onChange={(e) => set("requiredPart", e.target.value)}
                />
              </Field>
              <label className="field wide">
                <span className="check-field">
                  <input
                    type="checkbox"
                    checked={requestQuote}
                    onChange={(event) => {
                      setRequestQuote(event.target.checked);
                      if (!event.target.checked) setQuoteSupplierIds([]);
                    }}
                  />
                  Solicitar precio a proveedores
                </span>
                <small>
                  La solicitud queda registrada en esta orden; no envía mensajes.
                </small>
              </label>
              {requestQuote && (
                <div className="field wide">
                  <span>Proveedores activos a consultar *</span>
                  <div className="check-list">
                    {suppliers
                      .filter((supplier) => supplier.active && supplier.suppliesParts)
                      .map((supplier) => (
                        <label key={supplier.id}>
                          <input
                            type="checkbox"
                            checked={quoteSupplierIds.includes(supplier.id)}
                            onChange={(event) =>
                              setQuoteSupplierIds((current) =>
                                event.target.checked
                                  ? [...current, supplier.id]
                                  : current.filter((id) => id !== supplier.id),
                              )
                            }
                          />
                          {supplier.name}
                        </label>
                      ))}
                  </div>
                  {!suppliers.some((supplier) => supplier.active && supplier.suppliesParts) && (
                    <small>
                      Clasifica al menos un proveedor activo para refacciones.
                    </small>
                  )}
                </div>
              )}
            </div>
          )}
          <Field label="Notas del taller" wide>
            <textarea
              rows={2}
              maxLength={5000}
              placeholder="Condiciones del equipo, piezas o seguimiento"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
        <details className="record-details">
          <summary>Más detalles del ingreso</summary>
          <div className="form-grid">
            <Field label="IMEI o número de serie">
              <input
                maxLength={40}
                value={form.imei}
                onChange={(e) => set("imei", e.target.value)}
              />
            </Field>
            <Field label="Código de desbloqueo">
              <input
                maxLength={80}
                value={form.unlockCode}
                onChange={(e) => set("unlockCode", e.target.value)}
              />
            </Field>
            <Field label="Accesorios que deja" wide>
              <input
                maxLength={500}
                placeholder="SIM, funda, tapa…"
                value={form.accessoriesLeft}
                onChange={(e) => set("accessoriesLeft", e.target.value)}
              />
            </Field>
            <Field label="Estado físico" wide>
              <textarea
                rows={2}
                maxLength={1000}
                placeholder="Rayones, golpes u otras condiciones"
                value={form.physicalCondition}
                onChange={(e) => set("physicalCondition", e.target.value)}
              />
            </Field>
            <Field label="Fecha prometida">
              <input
                type="date"
                value={form.promisedDate}
                onChange={(e) => set("promisedDate", e.target.value)}
              />
            </Field>
            <Field label="Técnico">
              <input
                maxLength={120}
                value={form.technician}
                onChange={(e) => set("technician", e.target.value)}
              />
            </Field>
            <Field label="Días de garantía">
              <input
                type="number"
                min="0"
                max="3650"
                value={form.warrantyDays}
                onChange={(e) => set("warrantyDays", e.target.value)}
              />
            </Field>
          </div>
        </details>
        <div className="form-section-title">
          <span>03</span>
          <h3>{quote ? "Presupuesto" : "Costos y anticipo"}</h3>
        </div>
        <div className="form-grid">
          <Field label="Moneda">
            <select
              disabled={!!record?.paidCents}
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
            >
              <option value="MXN">Pesos mexicanos · MXN</option>
              <option value="USD">Dólares · USD</option>
            </select>
          </Field>
          {quote && (
            <Field label="Vigencia del presupuesto">
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => set("validUntil", e.target.value)}
              />
            </Field>
          )}
          {(["service", "parts"] as const).map((k) => (
            <Field
              key={k}
              label={
                k === "service"
                  ? record?.legacyOrderNumber
                    ? "Importe anterior sin desglose"
                    : "Servicio / mano de obra"
                  : "Refacciones"
              }
            >
              <input
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={form[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            </Field>
          ))}
          {!quote && !record && (
            <Field label="Anticipo">
              <input
                type="number"
                min="0"
                max={Math.max(0, total) / 100}
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={form.deposit}
                onChange={(e) => set("deposit", e.target.value)}
              />
            </Field>
          )}
          {!quote && !record && Number(form.deposit) > 0 && (
            <Field label="Método del anticipo">
              <Method
                value={form.method}
                onChange={(s) => set("method", s)}
                options={paymentMethods
                  .filter((item) => item.active)
                  .map((item) => ({ key: item.key, label: item.label }))}
              />
            </Field>
          )}
        </div>
        <label className="review-toggle">
          <input
            type="checkbox"
            checked={form.applyReview}
            onChange={(e) => set("applyReview", e.target.checked)}
          />
          <span>
            <strong>Añadir revisión · {money(fee, "USD")}</strong>
            <small>
              {form.currency === "MXN"
                ? rate
                  ? `Tipo de cambio: ${rate} MXN por USD`
                  : "Configura el tipo de cambio para cobrarla en pesos."
                : "Se cobra en la misma moneda."}
            </small>
          </span>
          <strong>{money(review, form.currency)}</strong>
        </label>
        <div className="form-totals">
          <div>
            <span>Total {quote ? "del presupuesto" : "de la orden"}</span>
            <strong>{money(total, form.currency)}</strong>
          </div>
          {!quote && (
            <div>
              <span>
                {record
                  ? "Adeudo después de pagos"
                  : "Adeudo después del anticipo"}
              </span>
              <strong>{money(total - paid, form.currency)}</strong>
            </div>
          )}
        </div>
        {record?.legacyOrderNumber && (
          <p className="help">
            Orden importada del sistema anterior, folio{" "}
            {record.legacyOrderNumber}. El importe original se dejó en servicio
            porque no existe desglose; puedes distribuirlo entre servicio y
            refacciones sin cambiar el total. Los teléfonos incompletos se
            conservan hasta que los corrijas.
          </p>
        )}
        {record && !!record.paidCents && (
          <p className="help">
            Cobrado: {money(record.paidCents, record.currency)}. Los pagos
            adicionales se registran desde la orden.
          </p>
        )}
        {total <= 0 && (
          <p className="help">
            Captura un importe de servicio, refacción o revisión mayor que cero.
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            <AlertCircle size={17} />
            {error}
          </p>
        )}
      </fieldset>
      <div className="dialog-actions">
        <button
          type="button"
          disabled={busy}
          className="sc-button secondary"
          onClick={close}
        >
          Cancelar
        </button>
        <button
          className="sc-button primary"
          disabled={
            busy ||
            missingRate ||
            total <= 0 ||
            total < paid ||
            (!quote && !record && requestQuote &&
              (!form.requiredPart.trim() || quoteSupplierIds.length === 0))
          }
        >
          {busy ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Check size={17} />
          )}{" "}
          {record
            ? "Guardar cambios"
            : quote
              ? "Crear presupuesto"
              : "Crear orden"}
        </button>
      </div>
    </form>
  );
}

export function PaymentForm({
  order,
  paymentMethods,
  mutate,
  close,
  saved,
}: {
  order: RecordData;
  paymentMethods: PaymentMethod[];
  mutate: (p: Mutation) => Promise<{ id: number }>;
  close: () => void;
  saved: () => void;
}) {
  const [amount, setAmount] = useState(""),
    [method, setMethod] = useState("efectivo"),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const requestKey = useRef(crypto.randomUUID());
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await mutate({
        action: "payment",
        id: order.id,
        requestKey: requestKey.current,
        amount,
        method,
        notes,
      });
      saved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="form-body">
        <div className="pay-balance">
          <span>Adeudo actual</span>
          <strong>{money(order.dueCents, order.currency)}</strong>
        </div>
        <div className="form-grid">
          <Field label={`Importe del pago · ${order.currency}`}>
            <input
              autoFocus
              required
              type="number"
              min="0.01"
              max={order.dueCents / 100}
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Método de pago">
            <Method
              value={method}
              onChange={setMethod}
              options={paymentMethods
                .filter((item) => item.active)
                .map((item) => ({ key: item.key, label: item.label }))}
            />
          </Field>
          <Field label="Nota del pago" wide>
            <textarea
              maxLength={1000}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referencia o detalle del cobro"
            />
          </Field>
        </div>
        <button
          type="button"
          className="link-button"
          onClick={() => setAmount(String(order.dueCents / 100))}
        >
          Cobrar el saldo completo
        </button>
        <div className="form-totals">
          <div>
            <span>Adeudo después del pago</span>
            <strong>
              {money(
                order.dueCents - Math.round(Number(amount || 0) * 100),
                order.currency,
              )}
            </strong>
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </fieldset>
      <div className="dialog-actions">
        <button
          type="button"
          className="sc-button secondary"
          disabled={busy}
          onClick={close}
        >
          Cancelar
        </button>
        <button className="sc-button primary" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <Receipt size={17} />
          )}
          Registrar pago
        </button>
      </div>
    </form>
  );
}
