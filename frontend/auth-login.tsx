'use client';

import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';

export function AuthLogin({ setupRequired, onLogin }: { setupRequired: boolean; onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try { await onLogin(username, password); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.'); }
    finally { setBusy(false); }
  }

  return <main className="lock-screen"><section className="lock-card">
    <ShieldCheck size={34} aria-hidden="true" />
    <p className="eyebrow">ACCESO PRIVADO</p>
    <h1>{setupRequired ? 'Configura el primer acceso' : 'Iniciar sesión'}</h1>
    {setupRequired ? <>
      <p>El administrador inicial se crea una sola vez desde la consola local; no existe registro público.</p>
      <pre className="auth-command">docker compose exec -it salvacel node scripts/bootstrap-admin.mjs</pre>
      <p>Cuando termine, vuelve a cargar esta página e inicia sesión con esa cuenta.</p>
    </> : <>
      <p>Usa tu cuenta individual del taller.</p>
      <form className="auth-login-form" onSubmit={submit}>
        <label>Usuario<input autoFocus autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} maxLength={40} required /></label>
        <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} maxLength={256} required /></label>
        <button className="sc-button primary" disabled={busy || !username || !password}><KeyRound size={16} />{busy ? 'Validando…' : 'Entrar'}</button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </>}
  </section></main>;
}
