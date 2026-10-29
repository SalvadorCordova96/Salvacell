'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, ChevronDown, Clock3, FileText, MessageCircle, Mic, Pause, Play, Plus, Send, Sparkles, Trash2, X } from 'lucide-react';
import type { View } from './ui';

export type OperatorChatDraft = Record<string, string>;
export type OperatorChatAction =
  | { type: 'navigate'; view: View }
  | { type: 'open_order'; orderId: number }
  | { type: 'open_customer'; customerId: number }
  | { type: 'draft_order' | 'draft_customer' | 'draft_product'; draft: OperatorChatDraft };

type ChatMessage = { role: 'user' | 'assistant'; content: string; action?: OperatorChatAction };
type TranscriptionFields = Record<string, string>;
type TranscriptionCard = { id: number; status: string; createdAt: string; expiresAt: string; fields: TranscriptionFields | null; summary: string };
type RecognitionResultItem = { transcript: string };
type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<RecognitionResultItem>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => BrowserRecognition;
type RecognitionWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

function createBrowserRecognition(): BrowserRecognition | null {
  const api = window as RecognitionWindow;
  const Constructor = api.SpeechRecognition || api.webkitSpeechRecognition;
  if (!Constructor) return null;
  const recognition = new Constructor();
  recognition.lang = 'es-MX';
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

export function OperatorChat({ onAction, onUseTranscription, canUseTranscriptions, canCreateOrder, canCreateQuote }: { onAction: (action: OperatorChatAction) => void; onUseTranscription: (id: number, fields: TranscriptionFields, quote: boolean) => void; canUseTranscriptions: boolean; canCreateOrder: boolean; canCreateQuote: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState('');
  const [transcriptionCards, setTranscriptionCards] = useState<TranscriptionCard[]>([]);
  const [revealedTranscripts, setRevealedTranscripts] = useState<Record<number, string>>({});
  const [customerInformed, setCustomerInformed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [transcriptText, setTranscriptText] = useState('');
  const [transcriptionBusy, setTranscriptionBusy] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState('');
  const [expandedTranscript, setExpandedTranscript] = useState<number | null>(null);
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const transcriptRef = useRef('');
  const recognitionBaseRef = useRef('');
  const durationRef = useRef(0);
  const endingRef = useRef<(() => void) | null>(null);
  const captureStartedRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [messages, busy, open]);
  useEffect(() => {
    if (!open || !canUseTranscriptions) return;
    const controller = new AbortController();
    void fetch('/api/assistant/transcriptions', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json() as { enabled?: boolean; privacyNotice?: string; items?: TranscriptionCard[]; error?: string };
        if (!response.ok) throw new Error(result.error || 'No se pudieron consultar las fichas de conversación.');
        setTranscriptionEnabled(!!result.enabled);
        setPrivacyNotice(result.privacyNotice || '');
        setTranscriptionCards(result.items || []);
      })
      .catch(cause => { if (!controller.signal.aborted) setTranscriptionError(cause instanceof Error ? cause.message : 'No se pudieron consultar las fichas de conversación.'); });
    return () => controller.abort();
  }, [open, canUseTranscriptions]);

  async function refreshTranscriptions() {
    const response = await fetch('/api/assistant/transcriptions', { cache: 'no-store' });
    const result = await response.json() as { enabled?: boolean; privacyNotice?: string; items?: TranscriptionCard[]; error?: string };
    if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el historial de fichas.');
    setTranscriptionEnabled(!!result.enabled);
    setPrivacyNotice(result.privacyNotice || '');
    setTranscriptionCards(result.items || []);
  }

  function addRecognitionCallbacks(recognition: BrowserRecognition) {
    recognition.onresult = event => {
      let text = '';
      for (let index = 0; index < event.results.length; index += 1) {
        const phrase = event.results[index]?.[0]?.transcript?.trim();
        if (phrase) text += `${text ? ' ' : ''}${phrase}`;
      }
      const bounded = `${recognitionBaseRef.current}${recognitionBaseRef.current && text ? ' ' : ''}${text}`.slice(0, 12_000);
      transcriptRef.current = bounded;
      setTranscriptText(bounded);
      if (text.length > 12_000) {
        setTranscriptionError('Se alcanzó el límite de 12 000 caracteres; finaliza la captura o continúa con notas manuales.');
        recognition.stop();
      }
    };
    recognition.onerror = event => {
      setRecording(false);
      setPaused(false);
      setTranscriptionError(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'El micrófono fue denegado. Puedes escribir o pegar notas manualmente.'
        : event.error === 'network'
          ? 'Se perdió la conexión del servicio de reconocimiento. Conservamos el texto reconocido; puedes reintentar o completar notas manualmente.'
          : `Falló el reconocimiento (${event.error}). Conservamos el texto reconocido para que puedas completarlo manualmente.`);
    };
    recognition.onend = () => {
      setRecording(false);
      endingRef.current?.();
      endingRef.current = null;
    };
    recognitionRef.current = recognition;
  }

  async function startTranscription() {
    setTranscriptionError('');
    const recognition = createBrowserRecognition();
    if (!recognition) {
      setTranscriptionError('Este navegador no ofrece reconocimiento de voz. Escribe o pega las notas manualmente.');
      return;
    }
    try {
      const response = await fetch('/api/assistant/transcriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudo iniciar la captura.');
      addRecognitionCallbacks(recognition);
      recognition.start();
      captureStartedRef.current = true;
      durationRef.current = 0;
      setDurationSeconds(0);
      setPaused(false);
      setRecording(true);
    } catch (cause) {
      setTranscriptionError(cause instanceof Error ? cause.message : 'No se pudo iniciar la captura.');
    }
  }

  function pauseTranscription() {
    if (!recording || !recognitionRef.current) return;
    recognitionBaseRef.current = transcriptRef.current;
    setPaused(true);
    setRecording(false);
    recognitionRef.current.stop();
  }

  function resumeTranscription() {
    if (!paused) return;
    setTranscriptionError('');
    const recognition = createBrowserRecognition();
    if (!recognition) {
      setPaused(false);
      setTranscriptionError('Este navegador dejó de ofrecer reconocimiento de voz. Puedes completar las notas manualmente.');
      return;
    }
    try {
      addRecognitionCallbacks(recognition);
      recognitionBaseRef.current = transcriptRef.current;
      recognition.start();
      setPaused(false);
      setRecording(true);
    } catch (cause) {
      setTranscriptionError(cause instanceof Error ? cause.message : 'No se pudo reanudar la captura.');
    }
  }

  useEffect(() => {
    if (!recording || paused) return;
    const timer = window.setInterval(() => {
      const next = Math.min(600, durationRef.current + 1);
      durationRef.current = next;
      setDurationSeconds(next);
      if (next >= 600) {
        setTranscriptionError('Se alcanzó el límite de 10 minutos; finaliza la captura o continúa con notas manuales.');
        recognitionRef.current?.stop();
        setRecording(false);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording, paused]);

  async function finishTranscription() {
    setTranscriptionBusy(true);
    setTranscriptionError('');
    try {
      if (recording && recognitionRef.current) {
        const ended = new Promise<void>(resolve => { endingRef.current = resolve; });
        recognitionRef.current.stop();
        setRecording(false);
        await Promise.race([ended, new Promise<void>(resolve => window.setTimeout(resolve, 1500))]);
      }
      const transcript = transcriptRef.current.trim();
      if (!transcript) throw new Error('No hay texto reconocido. Escribe o pega notas antes de finalizar.');
      const response = await fetch('/api/assistant/transcriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', transcript }),
      });
      const result = await response.json() as { id?: number; interpretationPending?: boolean; error?: string };
      if (!response.ok) {
        if (result.id) await refreshTranscriptions();
        throw new Error(result.error || 'No se pudo guardar la ficha.');
      }
      transcriptRef.current = '';
      recognitionBaseRef.current = '';
      setTranscriptText('');
      setCustomerInformed(false);
      setPaused(false);
      captureStartedRef.current = false;
      await refreshTranscriptions();
      setTranscriptionError('Ficha preparada. Revisa las sugerencias en el formulario antes de guardar.');
    } catch (cause) {
      setTranscriptionError(cause instanceof Error ? cause.message : 'No se pudo finalizar la transcripción.');
    } finally {
      setTranscriptionBusy(false);
    }
  }

  async function discardTranscription() {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (captureStartedRef.current) {
      try {
        const response = await fetch('/api/assistant/transcriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'discardCapture' }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || 'No se pudo registrar el descarte.');
      } catch (cause) {
        setTranscriptionError(cause instanceof Error ? cause.message : 'No se pudo registrar el descarte.');
        return;
      }
    }
    captureStartedRef.current = false;
    transcriptRef.current = '';
    recognitionBaseRef.current = '';
    setTranscriptText('');
    setRecording(false);
    setPaused(false);
    setDurationSeconds(0);
    setCustomerInformed(false);
    setTranscriptionError('Captura descartada.');
  }

  async function retryTranscription(id: number) {
    setTranscriptionBusy(true);
    setTranscriptionError('');
    try {
      const response = await fetch('/api/assistant/transcriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', id }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudo reintentar la interpretación.');
      await refreshTranscriptions();
    } catch (cause) {
      setTranscriptionError(cause instanceof Error ? cause.message : 'No se pudo reintentar la interpretación.');
      await refreshTranscriptions().catch(() => undefined);
    } finally {
      setTranscriptionBusy(false);
    }
  }

  async function discardFicha(id: number) {
    try {
      const response = await fetch('/api/assistant/transcriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discard', id }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudo descartar la ficha.');
      await refreshTranscriptions();
    } catch (cause) {
      setTranscriptionError(cause instanceof Error ? cause.message : 'No se pudo descartar la ficha.');
    }
  }

  async function revealTranscription(id: number) {
    try {
      const response = await fetch(`/api/assistant/transcriptions?id=${id}`, { cache: 'no-store' });
      const result = await response.json() as { transcript?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudo consultar el detalle.');
      setExpandedTranscript(current => current === id ? null : id);
      const transcript = result.transcript || '';
      setRevealedTranscripts(current => ({ ...current, [id]: transcript }));
    } catch (cause) {
      setTranscriptionError(cause instanceof Error ? cause.message : 'No se pudo consultar el detalle.');
    }
  }

  function toggleChat() {
    if (open && (recording || paused || transcriptText.trim() || captureStartedRef.current)) {
      setTranscriptionError('Finaliza, guarda o descarta la captura antes de cerrar el chat para no perder texto ni ocultar el micrófono activo.');
      return;
    }
    setOpen(value => !value);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages(current => [...current, { role: 'user', content: message }]);
    setText('');
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ message, history }),
      });
      const result = await response.json() as { reply?: string; action?: OperatorChatAction; error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudo consultar al asistente.');
      if (!result.reply) throw new Error('El asistente no devolvió una respuesta.');
      setMessages(current => [...current, { role: 'assistant', content: result.reply!, action: result.action }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar al asistente.');
    } finally {
      setBusy(false);
    }
  }

  function executeAction(index: number, action: OperatorChatAction) {
    if (recording || paused || transcriptText.trim() || captureStartedRef.current) {
      setTranscriptionError('Finaliza, guarda o descarta la captura antes de ejecutar otra acción.');
      return;
    }
    onAction(action);
    setMessages(current => current.map((message, currentIndex) => currentIndex === index ? { ...message, action: undefined } : message));
    setOpen(false);
  }

  const speechApi = typeof window === 'undefined' ? null : window as RecognitionWindow;
  const recognitionSupported = !!(speechApi?.SpeechRecognition || speechApi?.webkitSpeechRecognition);

  return <>
    {open && <section className="operator-chat" aria-label="Asistente de Salvacel">
      <header className="operator-chat-head">
        <div className="operator-chat-brand"><span className="operator-chat-icon">{recording ? <Mic size={18}/> : <Bot size={18}/>}</span><span><strong>Asistente Salvacel</strong><small>{recording ? `Micrófono activo · ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}` : 'Con acceso según tu cuenta · no guarda por sí solo'}</small></span></div>
        <div className="operator-chat-head-actions">
          <button type="button" className="operator-chat-icon-button" aria-label="Nueva conversación" title="Nueva conversación" onClick={() => { setMessages([]); setError(''); }}><Plus size={17}/></button>
          <button type="button" className="operator-chat-icon-button" aria-label="Minimizar chat" onClick={toggleChat}><ChevronDown size={18}/></button>
        </div>
      </header>
      <div className="operator-chat-messages" aria-live="polite">
        {!messages.length && <div className="operator-chat-welcome"><Sparkles size={20}/><strong>¿Qué necesitas hacer?</strong><p>Puedo consultar datos autorizados, abrir secciones y preparar formularios visibles. Para guardar, tendrás que indicarlo expresamente y confirmar en el formulario.</p><div className="operator-chat-examples"><span>“Busca la orden ORD-000123”</span><span>“Abre una orden para un Samsung A15 con pantalla rota”</span></div></div>}
        {messages.map((message, index) => <article key={`${index}-${message.role}`} className={`operator-chat-message ${message.role}`}>
          <p>{message.content}</p>
          {message.action && <button type="button" className="sc-button secondary small operator-chat-action" onClick={() => executeAction(index, message.action!)}>{message.action.type === 'navigate' ? `Abrir ${message.action.view}` : message.action.type === 'open_order' ? 'Abrir orden' : message.action.type === 'open_customer' ? 'Abrir perfil del cliente' : message.action.type === 'draft_product' ? 'Preparar accesorio' : message.action.type === 'draft_customer' ? 'Preparar cliente' : 'Abrir formulario de recepción'}<ChevronDown size={14}/></button>}
        </article>)}
        {busy && <div className="operator-chat-thinking" role="status"><span/>Consultando información autorizada…</div>}
        {error && <p className="operator-chat-error" role="alert">{error}</p>}
        {canUseTranscriptions && <section className="operator-transcription" aria-label="Preparar datos de una conversación">
          <strong><Mic size={15}/> Transcribir conversación</strong>
          {!transcriptionEnabled
            ? <p>Captura deshabilitada. Para habilitarla hace falta aprobar el aviso de privacidad y configurar el acceso al asistente.</p>
            : <>
              <p className="operator-transcription-notice">El reconocimiento del navegador podría enviar audio a su propio servicio; no equivale a OpenAI/OpenClaw y Salvacel no almacena audio. {privacyNotice}</p>
              <label className="operator-transcription-confirm"><input type="checkbox" checked={customerInformed} disabled={recording || paused} onChange={event => setCustomerInformed(event.target.checked)}/>Confirmo que el cliente recibió el aviso aprobado antes de enviar voz o notas para interpretar.</label>
              {!recording && !paused && recognitionSupported && <button type="button" className="sc-button secondary small" disabled={!customerInformed || transcriptionBusy} onClick={() => void startTranscription()}><Mic size={15}/>Iniciar transcripción</button>}
              {!recording && !paused && !recognitionSupported && <small>Este navegador no ofrece reconocimiento de voz; puedes escribir o pegar notas manualmente.</small>}
              {recording && <div className="operator-transcription-controls"><span role="status" aria-live="polite"><Mic size={14}/> Micrófono activo · {Math.floor(durationSeconds / 60)}:{String(durationSeconds % 60).padStart(2, '0')}</span><button type="button" className="sc-button secondary small" onClick={pauseTranscription}><Pause size={14}/>Pausar</button><button type="button" className="sc-button primary small" disabled={transcriptionBusy} onClick={() => void finishTranscription()}><FileText size={14}/>Finalizar</button><button type="button" className="sc-button secondary small" onClick={() => void discardTranscription()}><Trash2 size={14}/>Descartar</button></div>}
              {paused && <div className="operator-transcription-controls"><span role="status">Captura pausada · {Math.floor(durationSeconds / 60)}:{String(durationSeconds % 60).padStart(2, '0')}</span><button type="button" className="sc-button secondary small" disabled={!customerInformed} onClick={resumeTranscription}><Play size={14}/>Reanudar</button><button type="button" className="sc-button primary small" disabled={transcriptionBusy} onClick={() => void finishTranscription()}><FileText size={14}/>Finalizar</button><button type="button" className="sc-button secondary small" onClick={() => void discardTranscription()}><Trash2 size={14}/>Descartar</button></div>}
              <label className="operator-transcription-input">Texto reconocido o notas manuales<textarea aria-label="Texto reconocido o notas manuales" maxLength={12000} rows={3} disabled={recording || paused || transcriptionBusy} value={transcriptText} onChange={event => { const value = event.target.value; transcriptRef.current = value; setTranscriptText(value); }}/></label>
              {!recording && !paused && transcriptText.trim() && <div className="operator-transcription-controls"><span>{transcriptText.length}/12 000 caracteres</span><button type="button" className="sc-button primary small" disabled={!customerInformed || transcriptionBusy} onClick={() => void finishTranscription()}>{transcriptionBusy ? 'Interpretando…' : 'Guardar notas e interpretar'}</button><button type="button" className="sc-button secondary small" onClick={() => void discardTranscription()}><Trash2 size={14}/>Descartar</button></div>}
            </>}
          {transcriptionError && <p className="operator-chat-error" role="alert">{transcriptionError}</p>}
        </section>}
        {canUseTranscriptions && <section className="operator-transcription-history" aria-label="Historial de fichas de conversación">
          <strong><Clock3 size={15}/> Historial de conversación</strong>
          {!transcriptionCards.length && <small>No hay fichas en el historial de este operador.</small>}
          {transcriptionCards.map(card => <article className="operator-transcription-card" key={card.id}>
            <div><strong>{card.status === 'pendiente' ? 'Pendiente' : card.status === 'usada' ? 'Usada' : card.status === 'caducada' ? 'Caducada' : 'Descartada'}</strong><small>{new Date(card.createdAt).toLocaleString('es-MX')}</small></div>
            {card.status === 'pendiente' && <p>{card.summary}</p>}
            {card.status === 'pendiente' && card.fields && <dl>{Object.entries(card.fields).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
            {card.status === 'pendiente' && !card.fields && <p>Transcripción conservada sin interpretar; puedes reintentarla.</p>}
            {card.status === 'pendiente' && <div className="operator-transcription-controls">
              {card.fields && canCreateOrder && <button type="button" className="sc-button secondary small" onClick={() => onUseTranscription(card.id, card.fields!, false)}>Usar en nueva orden</button>}
              {card.fields && canCreateQuote && <button type="button" className="sc-button secondary small" onClick={() => onUseTranscription(card.id, card.fields!, true)}>Usar en nuevo presupuesto</button>}
              {!card.fields && <button type="button" className="sc-button secondary small" disabled={transcriptionBusy} onClick={() => void retryTranscription(card.id)}>Reintentar interpretación</button>}
              <button type="button" className="sc-button secondary small" onClick={() => void revealTranscription(card.id)}>{expandedTranscript === card.id ? 'Actualizar texto' : 'Ver transcripción'}</button>
              <button type="button" className="sc-button secondary small" onClick={() => void discardFicha(card.id)}>Descartar ficha</button>
            </div>}
            {expandedTranscript === card.id && revealedTranscripts[card.id] && <details open><summary>Transcripción completa</summary><p>{revealedTranscripts[card.id]}</p></details>}
          </article>)}
        </section>}
        <div ref={endRef}/>
      </div>
      <form className="operator-chat-compose" onSubmit={submit}>
        <textarea aria-label="Mensaje para el asistente" placeholder="Escribe tu pregunta o instrucción…" rows={2} maxLength={2000} value={text} disabled={busy} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}/>
        <button type="submit" className="operator-chat-send" aria-label="Enviar mensaje" disabled={busy || !text.trim()}><Send size={17}/></button>
      </form>
      <footer className="operator-chat-foot">El historial desaparece al cerrar sesión o recargar.</footer>
    </section>}
    <button type="button" className={`operator-chat-launcher${open ? ' is-open' : ''}`} onClick={toggleChat} aria-expanded={open} aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de Salvacel'}>
      {open ? <X size={20}/> : <><MessageCircle size={19}/><span>Asistente</span></>}
    </button>
  </>;
}
