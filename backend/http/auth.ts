import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { getDatabase } from "@/db";

const scrypt = (password: string, salt: Buffer, keyLength: number, options: { N: number; r: number; p: number; maxmem: number }) =>
  new Promise<Buffer>((resolve, reject) => scryptCallback(password, salt, keyLength, options, (error, key) => error ? reject(error) : resolve(key as Buffer)));
const sessionCookie = "salvacel_session";
const sessionLifetimeSeconds = 12 * 60 * 60;
const passwordBytes = 64;
const passwordOptions = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export type WorkshopActor = {
  id: number;
  username: string;
  displayName: string;
  roleKey: string;
  roleName: string;
  permissions: string[];
};

type AuthRow = Record<string, unknown>;
type LoginWindow = { count: number; startedAt: number; blockedUntil: number };
const loginWindows = new Map<string, LoginWindow>();

export class AuthError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "AuthError";
  }
}

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers } });
}

export function isSameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    // Honor only the public origin forwarded by the trusted local proxy; Next's
    // own URL may otherwise expose its private Docker service name.
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost || request.headers.get("host");
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
    const protocol = forwardedProtocol === "https" || forwardedProtocol === "http"
      ? `${forwardedProtocol}:`
      : new URL(request.url).protocol;
    const expectedOrigin = host ? new URL(`${protocol}//${host}`).origin : new URL(request.url).origin;
    return new URL(origin).origin === expectedOrigin;
  } catch { return false; }
}

function text(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== "string") throw new AuthError(`${label} no es válido.`);
  const result = value.trim();
  if ((required && !result) || result.length > max) throw new AuthError(`${label} no es válido.`);
  return result;
}

function username(value: unknown): string {
  const result = text(value, "Usuario", 40, true).toLocaleLowerCase("en-US");
  if (!/^[a-z0-9._-]{3,40}$/.test(result)) throw new AuthError("El usuario debe tener de 3 a 40 caracteres: letras, números, punto, guion o guion bajo.");
  return result;
}

function password(value: unknown): string {
  const result = text(value, "Contraseña", 256, true);
  if (result.length < 12) throw new AuthError("La contraseña debe tener al menos 12 caracteres.");
  return result;
}

function sessionToken(request: Request): string {
  const cookie = request.headers.get("cookie") || "";
  const value = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1) || "";
  return /^[A-Za-z0-9_-]{40,64}$/.test(value) ? value : "";
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(request: Request, token: string | null): string {
  const secure = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  return token
    ? `${sessionCookie}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${sessionLifetimeSeconds}${secure ? "; Secure" : ""}`
    : `${sessionCookie}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

async function hashPassword(value: string, salt = randomBytes(16).toString("base64url")) {
  const derived = await scrypt(value, Buffer.from(salt, "base64url"), passwordBytes, passwordOptions) as Buffer;
  return { salt, hash: derived.toString("hex") };
}

async function passwordMatches(value: string, salt: string, expected: string): Promise<boolean> {
  const { hash } = await hashPassword(value, salt);
  const actualBytes = Buffer.from(hash, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function permissionList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((permission): permission is string => typeof permission === "string" && (permission === "*" || /^[a-z][a-z0-9.*_-]{0,80}$/.test(permission)));
}

export async function currentActor(request: Request): Promise<WorkshopActor | null> {
  const token = sessionToken(request);
  if (!token) return null;
  const now = new Date().toISOString();
  const database = getDatabase();
  const row = await database.prepare(`SELECT u.id,u.username,u.display_name,r.key AS role_key,r.name AS role_name,r.permissions,s.last_seen_at
    FROM sessions s JOIN users u ON u.id=s.user_id JOIN roles r ON r.id=u.role_id
    WHERE s.token_hash=? AND s.expires_at>? AND s.revoked_at IS NULL AND u.active=1 AND r.active=1`).bind(tokenHash(token), now).first() as AuthRow | null;
  if (!row) return null;
  const lastSeen = String(row.last_seen_at || "");
  if (!lastSeen || Date.now() - Date.parse(lastSeen) > 5 * 60 * 1000) {
    await database.prepare(`UPDATE sessions SET last_seen_at=? WHERE token_hash=? AND revoked_at IS NULL`).bind(now, tokenHash(token)).run();
  }
  const rawPermissions = row.permissions;
  let parsed: unknown = rawPermissions;
  if (typeof rawPermissions === "string") {
    try { parsed = JSON.parse(rawPermissions); } catch { parsed = []; }
  }
  return {
    id: Number(row.id), username: String(row.username), displayName: String(row.display_name),
    roleKey: String(row.role_key), roleName: String(row.role_name), permissions: permissionList(parsed),
  };
}

export function hasPermission(actor: WorkshopActor, permission: string): boolean {
  return actor.permissions.includes("*") || actor.permissions.includes(permission);
}

export function permissionForAction(action: unknown): string {
  if (typeof action !== "string") return "admin.manage";
  if (["createCustomer", "updateCustomer"].includes(action)) return "customers.write";
  if (["createReception", "createOrder", "updateOrder", "status", "convertQuote", "resolveOrder"].includes(action)) return "orders.write";
  if (["createQuote", "updateQuote", "setQuoteClientPrice"].includes(action)) return "quotes.write";
  if (["addPart", "updatePart", "createPartQuote", "chooseSupplierResponse", "closeSupplierPriceRequest", "requestPrice", "resolvePriceRequest"].includes(action)) return "parts.write";
  if (["createWarrantyClaim", "updateWarrantyClaim"].includes(action)) return "warranties.write";
  if (["payment", "voidPayment"].includes(action)) return "payments.write";
  if (["createSale", "voidSale"].includes(action)) return "pos.write";
  if (["recordCashOutflow", "voidCashOutflow", "createRecurringExpense", "updateRecurringExpense", "payRecurringOccurrence", "closeCashDay"].includes(action)) return "cash.write";
  if (["createSupplier", "updateSupplier"].includes(action)) return "admin.manage";
  if (["createSupplierPriceRequest", "receiveSupplierResponse", "reviewSupplierInboundMessage", "createPurchaseOrder", "markPurchaseOrdered", "recordSupplierPayment", "receivePurchaseOrder", "cancelPurchaseOrder", "transferPurchasePartToInventory", "installPurchasedPart"].includes(action)) return "procurement.write";
  if (["createProduct", "updateProduct", "adjustStock"].includes(action)) return "admin.manage";
  if (["settings", "configurePin", "warrantyTerms", "createBrand", "updateBrand", "createService", "updateService", "updateMethod"].includes(action)) return "settings.write";
  if (["restoreBackup", "importHistoricalOrders", "importLegacyOrders"].includes(action)) return "backup.manage";
  if (["unlock", "revealUnlock"].includes(action)) return "orders.sensitive";
  return "admin.manage";
}

export async function authorize(request: Request, permission: string) {
  const actor = await currentActor(request);
  if (!actor) return { actor: null, response: json({ error: "Inicia sesión para continuar." }, 401) };
  if (!hasPermission(actor, permission)) return { actor, response: json({ error: "Tu cuenta no tiene permiso para esta operación." }, 403) };
  return { actor, response: null };
}

export async function auditActorAction(actor: WorkshopActor, action: string, entityId: number | null = null) {
  const database = getDatabase();
  await database.prepare(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id) VALUES ('api',?,?,?,?,?)`)
    .bind(entityId, action, "Operación autorizada por la API.", new Date().toISOString(), actor.id).run();
}

function rateLimitKey(user: string) { return user; }
function loginIsBlocked(user: string): boolean {
  const entry = loginWindows.get(rateLimitKey(user));
  if (!entry) return false;
  if (entry.blockedUntil > Date.now()) return true;
  if (Date.now() - entry.startedAt > 15 * 60 * 1000) loginWindows.delete(rateLimitKey(user));
  return false;
}
function recordFailedLogin(user: string) {
  const now = Date.now();
  const key = rateLimitKey(user);
  const entry = loginWindows.get(key);
  if (!entry || now - entry.startedAt > 15 * 60 * 1000) loginWindows.set(key, { count: 1, startedAt: now, blockedUntil: 0 });
  else {
    entry.count += 1;
    if (entry.count >= 8) entry.blockedUntil = now + 15 * 60 * 1000;
  }
}

async function login(request: Request, body: AuthRow) {
  let user: string;
  try { user = username(body.username); } catch { user = "invalid"; }
  if (loginIsBlocked(user)) return json({ error: "Espera 15 minutos antes de volver a intentar." }, 429);
  const suppliedPassword = typeof body.password === "string" ? body.password.slice(0, 256) : "";
  const database = getDatabase();
  const row = await database.prepare(`SELECT u.id,u.username,u.display_name,u.password_hash,u.password_salt,u.role_id,r.key AS role_key,r.name AS role_name,r.permissions
    FROM users u JOIN roles r ON r.id=u.role_id WHERE u.username=? AND u.active=1 AND r.active=1`).bind(user).first() as AuthRow | null;
  const dummy = await hashPassword("salvacel-login-dummy", "ZHVtbXktc2FsdC1mb3ItbG9naW4=");
  const matches = row
    ? await passwordMatches(suppliedPassword, String(row.password_salt), String(row.password_hash))
    : await passwordMatches(suppliedPassword || "invalid", dummy.salt, dummy.hash);
  if (!row || !matches || suppliedPassword.length < 12) {
    recordFailedLogin(user);
    return json({ error: "Usuario o contraseña incorrectos." }, 401);
  }
  loginWindows.delete(rateLimitKey(user));
  const token = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + sessionLifetimeSeconds * 1000).toISOString();
  await database.prepare(`INSERT INTO sessions (token_hash,created_at,expires_at,user_id,last_seen_at,revoked_at) VALUES (?,?,?,?,?,NULL)`)
    .bind(tokenHash(token), now, expiresAt, Number(row.id), now).run();
  await database.prepare(`UPDATE users SET last_login_at=? WHERE id=?`).bind(now, Number(row.id)).run();
  const permissions = typeof row.permissions === "string" ? JSON.parse(row.permissions) : row.permissions;
  return json({ ok: true, user: {
    id: Number(row.id), username: String(row.username), displayName: String(row.display_name),
    roleKey: String(row.role_key), roleName: String(row.role_name), permissions: permissionList(permissions),
  } }, 200, { "Set-Cookie": cookieOptions(request, token) });
}

export async function GET(request: Request) {
  try {
    const database = getDatabase();
    const countRow = await database.prepare(`SELECT count(*) AS count FROM users WHERE active=1`).first() as AuthRow;
    const actor = await currentActor(request);
    return json({ setupRequired: Number(countRow.count) === 0, user: actor });
  } catch (error) {
    console.error("auth-status", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "No se pudo consultar el acceso." }, 503);
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return json({ error: "Origen de solicitud no permitido." }, 403);
    const body = await request.json() as AuthRow;
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Solicitud inválida." }, 400);
    const action = text(body.action, "Acción", 40, true);
    const database = getDatabase();
    if (action === "login") return await login(request, body);
    if (action === "logout") {
      const token = sessionToken(request);
      if (token) await database.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(tokenHash(token)).run();
      return json({ ok: true }, 200, { "Set-Cookie": cookieOptions(request, null) });
    }
    if (action === "changePassword") {
      const actor = await currentActor(request);
      if (!actor) return json({ error: "Inicia sesión para continuar." }, 401);
      const currentPassword = text(body.currentPassword, "Contraseña actual", 256, true);
      const newPassword = password(body.newPassword);
      const row = await database.prepare(`SELECT password_hash,password_salt FROM users WHERE id=? AND active=1`).bind(actor.id).first() as AuthRow | null;
      if (!row || !await passwordMatches(currentPassword, String(row.password_salt), String(row.password_hash))) return json({ error: "La contraseña actual no coincide." }, 403);
      const encoded = await hashPassword(newPassword);
      const now = new Date().toISOString();
      await database.batch([
        database.prepare(`UPDATE users SET password_hash=?,password_salt=?,updated_at=? WHERE id=?`).bind(encoded.hash, encoded.salt, now, actor.id),
        database.prepare(`DELETE FROM sessions WHERE user_id=? AND token_hash<>?`).bind(actor.id, tokenHash(sessionToken(request))),
      ]);
      return json({ ok: true });
    }
    return json({ error: "Acción de acceso desconocida." }, 400);
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message }, error.status);
    console.error("auth-request", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "No se pudo completar la operación de acceso." }, 503);
  }
}

export async function GETUsers(request: Request) {
  const { response } = await authorize(request, "users.manage");
  if (response) return response;
  const rows = await getDatabase().prepare(`SELECT u.id,u.username,u.display_name,u.active,u.created_at,u.last_login_at,r.key AS role_key,r.name AS role_name
    FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id`).all();
  const roleRows = await getDatabase().prepare(`SELECT id,key,name,permissions,active FROM roles ORDER BY id`).all();
  return json({ users: rows.results, roles: roleRows.results });
}

export async function POSTUsers(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return json({ error: "Origen de solicitud no permitido." }, 403);
    const body = await request.json() as AuthRow;
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Solicitud inválida." }, 400);
    const action = text(body.action, "Acción", 40, true);
    const requiredPermission = ["updateRole", "resetPassword"].includes(action) ? "admin.manage" : "users.manage";
    const { actor, response } = await authorize(request, requiredPermission);
    if (response || !actor) return response || json({ error: "No autorizado." }, 401);
    const database = getDatabase();
    const now = new Date().toISOString();
    if (action === "create") {
      const user = username(body.username), displayName = text(body.displayName, "Nombre", 80, true), secret = password(body.password);
      const roleKey = text(body.roleKey, "Rol", 40, true);
      const role = await database.prepare(`SELECT id,permissions FROM roles WHERE key=? AND active=1`).bind(roleKey).first() as AuthRow | null;
      if (!role) return json({ error: "El rol seleccionado no está disponible." }, 400);
      const rolePermissions = typeof role.permissions === "string" ? JSON.parse(role.permissions) : role.permissions;
      if (!hasPermission(actor, "admin.manage") && (roleKey === "administrador" || permissionList(rolePermissions).some((permission) => permission === "*" || !actor.permissions.includes(permission)))) {
        return json({ error: "No puedes asignar un rol con permisos que tu cuenta no tiene." }, 403);
      }
      const encoded = await hashPassword(secret);
      const row = await database.prepare(`INSERT INTO users (username,display_name,password_hash,password_salt,role_id,active,created_at,updated_at)
        VALUES (?,?,?,?,?,1,?,?) RETURNING id`).bind(user, displayName, encoded.hash, encoded.salt, Number(role.id), now, now).first() as AuthRow;
      await auditActorAction(actor, "user_created", Number(row.id));
      return json({ id: Number(row.id) }, 201);
    }
    if (action === "update") {
      const id = Number(body.id);
      if (!Number.isSafeInteger(id) || id < 1) return json({ error: "Usuario inválido." }, 400);
      const target = await database.prepare(`SELECT u.id,u.active,r.key AS role_key FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?`).bind(id).first() as AuthRow | null;
      if (!target) return json({ error: "No se encontró el usuario." }, 404);
      const displayName = text(body.displayName, "Nombre", 80, true);
      const roleKey = text(body.roleKey, "Rol", 40, true);
      const active = body.active === false ? 0 : 1;
      if (id === actor.id && (!active || roleKey !== actor.roleKey)) return json({ error: "No puedes desactivar ni cambiar tu propio rol." }, 409);
      const role = await database.prepare(`SELECT id,permissions FROM roles WHERE key=? AND active=1`).bind(roleKey).first() as AuthRow | null;
      if (!role) return json({ error: "El rol seleccionado no está disponible." }, 400);
      const rolePermissions = typeof role.permissions === "string" ? JSON.parse(role.permissions) : role.permissions;
      if (!hasPermission(actor, "admin.manage") && (String(target.role_key) === "administrador" || roleKey === "administrador" || permissionList(rolePermissions).some((permission) => permission === "*" || !actor.permissions.includes(permission)))) {
        return json({ error: "No puedes asignar un rol con permisos que tu cuenta no tiene." }, 403);
      }
      if (String(target.role_key) === "administrador" && (active === 0 || roleKey !== "administrador")) {
        const admins = await database.prepare(`SELECT count(*) AS count FROM users u JOIN roles r ON r.id=u.role_id WHERE u.active=1 AND r.key='administrador'`).first() as AuthRow;
        if (Number(admins.count) <= 1) return json({ error: "Debe quedar al menos un administrador activo." }, 409);
      }
      await database.batch([
        database.prepare(`UPDATE users SET display_name=?,role_id=?,active=?,updated_at=? WHERE id=?`).bind(displayName, Number(role.id), active, now, id),
        ...(active ? [] : [database.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(id)]),
      ]);
      await auditActorAction(actor, active ? "user_updated" : "user_deactivated", id);
      return json({ ok: true });
    }
    if (action === "resetPassword") {
      const id = Number(body.id), secret = password(body.password);
      if (!Number.isSafeInteger(id) || id < 1) return json({ error: "Usuario inválido." }, 400);
      const encoded = await hashPassword(secret);
      const updated = await database.prepare(`UPDATE users SET password_hash=?,password_salt=?,updated_at=? WHERE id=? RETURNING id`).bind(encoded.hash, encoded.salt, now, id).first() as AuthRow | null;
      if (!updated) return json({ error: "No se encontró el usuario." }, 404);
      await database.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(id).run();
      await auditActorAction(actor, "user_password_reset", id);
      return json({ ok: true });
    }
    if (action === "updateRole") {
      const roleKey = text(body.roleKey, "Rol", 40, true);
      const name = text(body.name, "Nombre del rol", 80, true);
      const allowed = new Set(["workshop.read", "customers.read", "customers.write", "orders.read", "orders.write", "orders.sensitive", "repairs.write", "quotes.write", "parts.write", "warranties.write", "payments.write", "pos.write", "cash.write", "procurement.read", "procurement.write", "suppliers.read", "inventory.write", "settings.write", "backup.manage", "users.manage", "admin.manage"]);
      if (!Array.isArray(body.permissions) || body.permissions.length > 32 || body.permissions.some((value) => typeof value !== "string" || !allowed.has(value))) return json({ error: "La lista de permisos contiene valores inválidos." }, 400);
      if (roleKey === "administrador") return json({ error: "El rol administrador del sistema no se puede editar." }, 409);
      const result = await database.prepare(`UPDATE roles SET name=?,permissions=?::jsonb,updated_at=? WHERE key=? AND key<>'administrador' RETURNING id`).bind(name, JSON.stringify(body.permissions), now, roleKey).first() as AuthRow | null;
      if (!result) return json({ error: "No se encontró el rol editable." }, 404);
      await auditActorAction(actor, "role_updated", Number(result.id));
      return json({ ok: true });
    }
    return json({ error: "Acción de usuarios desconocida." }, 400);
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message }, error.status);
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505") return json({ error: "Ese nombre de usuario ya está registrado." }, 409);
    console.error("auth-users", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "No se pudo guardar el cambio de usuarios." }, 503);
  }
}

export async function bootstrapFirstAdmin(usernameValue: string, displayNameValue: string, passwordValue: string) {
  const user = username(usernameValue), displayName = text(displayNameValue, "Nombre", 80, true), secret = password(passwordValue);
  const encoded = await hashPassword(secret);
  const database = getDatabase();
  const now = new Date().toISOString();
  return database.transaction(async (client) => {
    await client.query("LOCK TABLE users IN EXCLUSIVE MODE");
    const count = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM users`);
    if (Number(count.rows[0]?.count || 0) > 0) throw new AuthError("Ya existe una cuenta; el alta inicial se cerró.", 409);
    const role = await client.query<{ id: number }>(`SELECT id FROM roles WHERE key='administrador' AND active=1`);
    if (!role.rows[0]) throw new AuthError("No se encontró el rol administrador.", 503);
    const result = await client.query<{ id: number }>(`INSERT INTO users (username,display_name,password_hash,password_salt,role_id,active,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,1,$6,$6) RETURNING id`, [user, displayName, encoded.hash, encoded.salt, role.rows[0].id, now]);
    return Number(result.rows[0].id);
  });
}
