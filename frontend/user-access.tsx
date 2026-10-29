'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Accordion } from '@heroui/react';
import { Check, ChevronDown, KeyRound, LoaderCircle, Plus, ShieldCheck, UserRound, UserRoundX } from 'lucide-react';
import { Field, Modal } from './ui';

type Permission =
  | 'workshop.read' | 'customers.read' | 'customers.write' | 'orders.read' | 'orders.write'
  | 'orders.sensitive' | 'repairs.write' | 'quotes.write' | 'parts.write' | 'warranties.write'
  | 'payments.write' | 'pos.write' | 'cash.write' | 'procurement.read' | 'procurement.write'
  | 'suppliers.read' | 'inventory.write' | 'settings.write' | 'backup.manage' | 'users.manage' | 'admin.manage';

type Role = { id: number; key: string; name: string; permissions: Permission[] | string; active: number | boolean };
type User = { id: number; username: string; display_name: string; active: number | boolean; created_at: string; last_login_at: string | null; role_key: string; role_name: string };
type AccessData = { users: User[]; roles: Role[] };

const permissionLabels: { key: Permission; label: string; group: string }[] = [
  { key: 'workshop.read', label: 'Inicio y operación', group: 'Taller' },
  { key: 'orders.read', label: 'Consultar órdenes', group: 'Taller' },
  { key: 'orders.write', label: 'Crear y cambiar órdenes', group: 'Taller' },
  { key: 'orders.sensitive', label: 'Ver información sensible de órdenes', group: 'Taller' },
  { key: 'repairs.write', label: 'Editar reparaciones y fotos', group: 'Taller' },
  { key: 'customers.read', label: 'Consultar clientes', group: 'Clientes' },
  { key: 'customers.write', label: 'Editar clientes', group: 'Clientes' },
  { key: 'quotes.write', label: 'Crear y editar presupuestos', group: 'Clientes' },
  { key: 'suppliers.read', label: 'Consultar proveedores', group: 'Proveedores' },
  { key: 'procurement.read', label: 'Consultar compras', group: 'Proveedores' },
  { key: 'procurement.write', label: 'Administrar compras y pagos a proveedor', group: 'Proveedores' },
  { key: 'parts.write', label: 'Administrar refacciones', group: 'Proveedores' },
  { key: 'payments.write', label: 'Cobros de reparaciones', group: 'Cobros y control' },
  { key: 'pos.write', label: 'Ventas y tickets', group: 'Cobros y control' },
  { key: 'cash.write', label: 'Caja y egresos', group: 'Cobros y control' },
  { key: 'inventory.write', label: 'Editar catálogo y existencias', group: 'Cobros y control' },
  { key: 'warranties.write', label: 'Administrar garantías', group: 'Cobros y control' },
  { key: 'settings.write', label: 'Cambiar configuraciones', group: 'Administración' },
  { key: 'backup.manage', label: 'Respaldar y restaurar datos', group: 'Administración' },
  { key: 'users.manage', label: 'Crear y administrar cuentas', group: 'Administración' },
  { key: 'admin.manage', label: 'Cambiar roles y restablecer contraseñas', group: 'Administración' },
];

function asPermissions(value: Role['permissions']): Permission[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) as unknown : value;
    return Array.isArray(parsed) ? parsed.filter((permission): permission is Permission => typeof permission === 'string') : [];
  } catch { return []; }
}

function isActive(value: number | boolean) { return value === true || value === 1; }

export function UserAccess({ actorId, actorPermissions, canAdminManage, notify }: {
  actorId: number;
  actorPermissions: string[];
  canAdminManage: boolean;
  notify: (message: string) => void;
}) {
  const [data, setData] = useState<AccessData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirmation, setResetPasswordConfirmation] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [roleDrafts, setRoleDrafts] = useState<Record<string, Permission[]>>({});

  const loading = data === null && error === '';
  const allowedPermissions = useMemo(() => new Set(actorPermissions), [actorPermissions]);
  const assignableRoles = useMemo(
    () => (data?.roles ?? []).filter(role => isActive(role.active) &&
      (canAdminManage || (role.key !== 'administrador' && asPermissions(role.permissions).every(permission => allowedPermissions.has(permission))))),
    [data, canAdminManage, allowedPermissions],
  );

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/users', { cache: 'no-store' });
      const result = await response.json() as AccessData & { error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudieron cargar las cuentas.');
      setError('');
      setData(result);
      setRoleDrafts(Object.fromEntries(result.roles.map(role => [role.key, asPermissions(role.permissions)])));
      const allowed = new Set(actorPermissions);
      const allowedRoles = result.roles.filter(role => isActive(role.active) &&
        (canAdminManage || (role.key !== 'administrador' && asPermissions(role.permissions).every(permission => allowed.has(permission)))));
      setRoleKey(current => allowedRoles.some(role => role.key === current) ? current :
        allowedRoles.find(role => role.key !== 'administrador')?.key || allowedRoles[0]?.key || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las cuentas.');
    }
  }, [actorPermissions, canAdminManage]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(payload: Record<string, unknown>, success: string, onFailure?: (message: string) => void) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el cambio.');
      notify(success);
      await load();
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo guardar el cambio.';
      setError(message);
      onFailure?.(message);
      return false;
    } finally { setBusy(false); }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roleKey) return;
    const saved = await save({ action: 'create', username, displayName, password, roleKey }, 'Cuenta creada.');
    if (saved) { setUsername(''); setDisplayName(''); setPassword(''); }
  }

  async function updateUser(user: User, active = isActive(user.active), nextRole = user.role_key) {
    await save({ action: 'update', id: user.id, displayName: user.display_name, roleKey: nextRole, active }, active ? 'Cuenta actualizada.' : 'Cuenta desactivada.');
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordResetUser || busy) return;
    if (resetPasswordValue.length < 12) { setResetPasswordError('La contraseña debe tener al menos 12 caracteres.'); return; }
    if (resetPasswordValue !== resetPasswordConfirmation) { setResetPasswordError('Las contraseñas no coinciden.'); return; }
    setResetPasswordError('');
    const saved = await save({ action: 'resetPassword', id: passwordResetUser.id, password: resetPasswordValue }, 'Contraseña restablecida; se revocaron sus sesiones anteriores.', setResetPasswordError);
    if (saved) { setPasswordResetUser(null); setResetPasswordValue(''); setResetPasswordConfirmation(''); }
  }

  async function saveRole(role: Role) {
    const permissions = roleDrafts[role.key] ?? asPermissions(role.permissions);
    await save({ action: 'updateRole', roleKey: role.key, name: role.name, permissions }, `Permisos de ${role.name} actualizados.`);
  }

  const groups = [...new Set(permissionLabels.map(item => item.group))];

  return <section className="panel settings-panel user-access-panel">
    <div className="section-heading"><div><h2>Usuarios y permisos</h2><p>Cuentas individuales; cada cambio se valida y registra en el servidor.</p></div><ShieldCheck size={20} aria-hidden="true" /></div>
    {loading && !data ? <p role="status"><LoaderCircle size={16} className="spin" /> Cargando cuentas…</p> : <>
      <form className="form-grid user-create-form" onSubmit={createUser}>
        <label className="field"><span>Nombre de usuario *</span><input autoComplete="off" required minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]{3,40}" value={username} onChange={event => setUsername(event.target.value)} /></label>
        <label className="field"><span>Nombre visible *</span><input required maxLength={80} value={displayName} onChange={event => setDisplayName(event.target.value)} /></label>
        <label className="field"><span>Contraseña inicial *</span><input type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label className="field"><span>Rol permitido *</span><select required value={roleKey} onChange={event => setRoleKey(event.target.value)}><option value="" disabled>Selecciona un rol</option>{assignableRoles.map(role => <option key={role.key} value={role.key}>{role.name}</option>)}</select></label>
        <div className="user-create-submit"><button className="sc-button primary" disabled={busy || !assignableRoles.length}><Plus size={16} /> Crear cuenta</button></div>
      </form>

      <div className="user-access-list">
        <h3><UserRound size={17} /> Cuentas</h3>
        {data?.users.length ? data.users.map(user => <article className="user-access-row" key={user.id}>
          <div className="user-access-identity"><strong>{user.display_name}</strong><small>@{user.username} · {user.role_name} · {isActive(user.active) ? 'Activa' : 'Inactiva'}</small></div>
          <div className="user-access-actions">
            <select aria-label={`Rol de ${user.username}`} value={user.role_key} disabled={busy || user.id === actorId} onChange={event => void updateUser(user, isActive(user.active), event.target.value)}>
              {(data?.roles ?? []).filter(role => role.key === user.role_key || assignableRoles.some(item => item.key === role.key)).map(role => <option key={role.key} value={role.key}>{role.name}</option>)}
            </select>
            {canAdminManage && <button type="button" className="sc-button secondary small" disabled={busy} onClick={() => { setResetPasswordValue(''); setResetPasswordConfirmation(''); setResetPasswordError(''); setPasswordResetUser(user); }}><KeyRound size={14} /> Restablecer contraseña</button>}
            <button type="button" className="sc-button secondary small" disabled={busy || user.id === actorId} onClick={() => void updateUser(user, !isActive(user.active))}>{isActive(user.active) ? <><UserRoundX size={14} /> Desactivar</> : <><Check size={14} /> Reactivar</>}</button>
          </div>
        </article>) : <p>No hay cuentas registradas.</p>}
      </div>

      {canAdminManage && <div className="role-permission-list">
        <h3><ShieldCheck size={17} /> Permisos por rol</h3>
        {(data?.roles ?? []).filter(role => role.key !== 'administrador' && isActive(role.active)).map(role => <Accordion key={role.key} className="role-permission-accordion">
          <Accordion.Item id={`role-${role.key}`}>
            <Accordion.Heading><Accordion.Trigger><span><strong>{role.name}</strong><small>{(roleDrafts[role.key] ?? []).length} permisos</small></span><Accordion.Indicator><ChevronDown size={16} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading>
            <Accordion.Panel><Accordion.Body>
              {groups.map(group => <fieldset className="permission-group" key={group}><legend>{group}</legend>{permissionLabels.filter(item => item.group === group).map(item => <label key={item.key}><input type="checkbox" checked={(roleDrafts[role.key] ?? []).includes(item.key)} onChange={event => setRoleDrafts(current => ({ ...current, [role.key]: event.target.checked ? [...new Set([...(current[role.key] ?? []), item.key])] : (current[role.key] ?? []).filter(permission => permission !== item.key) }))} /><span>{item.label}</span></label>)}</fieldset>)}
              <button type="button" className="sc-button primary small" disabled={busy} onClick={() => void saveRole(role)}><Check size={15} /> Guardar permisos</button>
            </Accordion.Body></Accordion.Panel>
          </Accordion.Item>
        </Accordion>)}
        <p className="preference-note">El rol administrador del sistema no se puede modificar. Tus permisos no pueden ampliarse desde esta pantalla.</p>
      </div>}
    </>}
    {passwordResetUser && <Modal title="Restablecer contraseña" eyebrow={`CUENTA @${passwordResetUser.username}`} close={() => { if (!busy) { setPasswordResetUser(null); setResetPasswordValue(''); setResetPasswordConfirmation(''); setResetPasswordError(''); } }}><form onSubmit={resetPassword}><div className="form-body"><p>La persona deberá iniciar sesión de nuevo con la contraseña nueva; sus sesiones anteriores se revocarán.</p><Field label="Nueva contraseña (mínimo 12 caracteres)"><input type="password" autoFocus autoComplete="new-password" minLength={12} maxLength={256} required value={resetPasswordValue} onChange={event => setResetPasswordValue(event.target.value)} /></Field><Field label="Confirmar contraseña"><input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={resetPasswordConfirmation} onChange={event => setResetPasswordConfirmation(event.target.value)} /></Field>{resetPasswordError && <p className="form-error" role="alert">{resetPasswordError}</p>}</div><div className="dialog-actions"><button type="button" className="sc-button secondary" disabled={busy} onClick={() => { setPasswordResetUser(null); setResetPasswordValue(''); setResetPasswordConfirmation(''); setResetPasswordError(''); }}>Cancelar</button><button type="submit" className="sc-button primary" disabled={busy || resetPasswordValue.length < 12 || resetPasswordValue !== resetPasswordConfirmation}>{busy ? 'Restableciendo…' : 'Confirmar cambio'}</button></div></form></Modal>}
    {error && <p className="form-error" role="alert">{error}<button type="button" className="link-button" onClick={() => void load()}>Reintentar</button></p>}
  </section>;
}
