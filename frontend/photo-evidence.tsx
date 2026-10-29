'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, Check, Clipboard, Image as ImageIcon, LoaderCircle, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';
import { Field, Modal } from './ui';
import styles from './photo-evidence.module.css';

type Photo = { id: number; original_name: string; content_type: string; size_bytes: number; sha256: string; created_at: string };
type Token = { qr: string; mobileUrl: string; tokenHash: string; expiresAt: string; maxUploads: number; order: { brand: string; model: string } };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
  return result;
}

function localDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function formatBytes(value: number) { return `${(value / 1024 / 1024).toFixed(1)} MB`; }

export function PhotoEvidence({ orderId }: { orderId: number }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [token, setToken] = useState<Token | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [photoToRemove, setPhotoToRemove] = useState<Photo | null>(null);
  const [removeReason, setRemoveReason] = useState('Foto retirada por personal autorizado.');
  const [removeError, setRemoveError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const result = await api<{ photos: Photo[] }>(`/api/photos?orderId=${orderId}`);
      setPhotos(result.photos);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las fotos.'); }
  }, [orderId]);

  useEffect(() => { const frame = window.requestAnimationFrame(() => { void refresh(); }); return () => window.cancelAnimationFrame(frame); }, [refresh]);

  async function createQr() {
    setBusy(true); setError(''); setToken(null);
    try { setToken(await api<Token>('/api/photos/tokens', { method: 'POST', body: JSON.stringify({ orderId }) })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo crear el QR.'); }
    finally { setBusy(false); }
  }

  async function revokeQr() {
    if (!token) return;
    setBusy(true); setError('');
    try { await api('/api/photos/tokens', { method: 'DELETE', body: JSON.stringify({ tokenHash: token.tokenHash }) }); setToken(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cancelar el QR.'); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    if (!token) return;
    try { await navigator.clipboard.writeText(token.mobileUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError('No se pudo copiar el enlace en este navegador.'); }
  }

  async function removePhoto() {
    if (!photoToRemove) return;
    setBusy(true); setError(''); setRemoveError('');
    try {
      await api(`/api/photos/${photoToRemove.id}`, { method: 'DELETE', body: JSON.stringify({ reason: removeReason.trim() || undefined }) });
      setPhotoToRemove(null);
      setRemoveReason('Foto retirada por personal autorizado.');
      await refresh();
    }
    catch (issue) { setRemoveError(issue instanceof Error ? issue.message : 'No se pudo retirar la foto.'); }
    finally { setBusy(false); }
  }

  return <section className={styles.section} aria-labelledby={`photo-title-${orderId}`}>
    <div className={styles.heading}>
      <div><h3 id={`photo-title-${orderId}`}>Evidencia fotográfica</h3><p>Fotos ligadas a esta orden, visibles solo con acceso al taller.</p></div>
      <button type="button" className="sc-button secondary small" onClick={() => void refresh()} disabled={busy} aria-label="Actualizar fotos"><RefreshCw size={15}/></button>
    </div>
    <div className={styles.actions}>
      {!token ? <button type="button" className="sc-button secondary" disabled={busy} onClick={() => void createQr()}>{busy ? <LoaderCircle size={16} className="spin"/> : <Camera size={16}/>}Generar QR temporal</button> : <button type="button" className="sc-button secondary" disabled={busy} onClick={() => void revokeQr()}><X size={16}/>Cancelar QR</button>}
      <span className={styles.security}><ShieldCheck size={15}/>Un uso · vence en 10 minutos</span>
    </div>
    {token && <div className={styles.qrCard}>
      <img src={token.qr} alt="Código QR temporal para subir fotos de esta orden" width="192" height="192" />
      <div><strong>Escanéalo con el celular del taller</strong><p>El enlace solo permite subir hasta {token.maxUploads} fotos a {token.order.brand} {token.order.model}. No abre la aplicación ni muestra datos del cliente.</p><small>Vence: {localDate(token.expiresAt)}</small><button type="button" className="link-button" onClick={() => void copyLink()}>{copied ? <Check size={15}/> : <Clipboard size={15}/>} {copied ? 'Enlace copiado' : 'Copiar enlace'}</button></div>
    </div>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {photos.length ? <><div className={styles.grid}>{photos.map(photo => <article className={styles.photo} key={photo.id}>
      <a href={`/api/photos/${photo.id}`} target="_blank" rel="noreferrer" aria-label={`Abrir foto ${photo.original_name}`}><img src={`/api/photos/${photo.id}?variant=thumbnail`} alt={photo.original_name} loading="lazy"/><span><ImageIcon size={14}/>{photo.original_name}</span></a>
      <small>{localDate(photo.created_at)} · {formatBytes(photo.size_bytes)}</small><small className={styles.hash}>SHA-256 {photo.sha256.slice(0, 16)}…</small>
      <button type="button" className="link-button" disabled={busy} onClick={() => { setRemoveReason('Foto retirada por personal autorizado.'); setRemoveError(''); setPhotoToRemove(photo); }}><Trash2 size={14}/>Retirar</button>
    </article>)}</div><p className={styles.retention}>El límite local es de 5 GiB por defecto. Retirar una foto la oculta y deja bitácora; no libera espacio automáticamente.</p></> : <div className={styles.empty}><ImageIcon size={20}/><span>No hay fotos en esta orden.</span></div>}
    {photoToRemove && <Modal title="Retirar foto del expediente" eyebrow="EVIDENCIA FOTOGRÁFICA" close={() => { if (!busy) setPhotoToRemove(null); }}><form onSubmit={event => { event.preventDefault(); void removePhoto(); }}><div className="form-body"><p style={{ overflowWrap: 'anywhere' }}><strong>{photoToRemove.original_name}</strong></p><p>La foto dejará de mostrarse en esta orden y se registrará el motivo. Esta acción no libera espacio de almacenamiento.</p><Field label="Motivo para la bitácora (opcional)"><textarea rows={3} maxLength={500} value={removeReason} onChange={event => setRemoveReason(event.target.value)} /></Field>{removeError && <p className="form-error" role="alert">{removeError}</p>}</div><div className="dialog-actions"><button type="button" className="sc-button secondary" disabled={busy} onClick={() => setPhotoToRemove(null)}>Conservar foto</button><button type="submit" className="sc-button danger" disabled={busy}>{busy ? 'Retirando…' : 'Confirmar retiro'}</button></div></form></Modal>}
  </section>;
}
