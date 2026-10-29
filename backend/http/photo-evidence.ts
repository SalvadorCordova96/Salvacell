import { createHash, randomBytes, randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { basename, join, resolve } from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { authorize, isSameOriginRequest } from "@/backend/http/auth";
import { getDatabase } from "@/db";

export const maxUploadBytes = 12_000_000;
const maxUploads = 10;
const qrLifetimeMs = 10 * 60 * 1000;
const uploadSessionLifetimeMs = 30 * 60 * 1000;
const defaultPhotoStorageLimitBytes = 5 * 1024 * 1024 * 1024;
const allowedFormats = new Set(["jpeg", "png", "webp"]);
const responseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
type DbRow = Record<string, unknown>;

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: responseHeaders });
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const privateV4 = (host: string) => {
  if (isIP(host) !== 4) return false;
  const octets = host.split(".").map(Number);
  return octets[0] === 10 || octets[0] === 127 || (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 169 && octets[1] === 254);
};
const privateV6 = (host: string) => isIP(host) === 6 && /^(?:fc|fd|fe[89ab])/i.test(host);

function mobileOrigin(): URL | null {
  const configured = process.env.SALVACEL_PHOTO_MOBILE_ORIGIN?.trim();
  if (!configured) return null;
  let url: URL;
  try { url = new URL(configured); } catch { throw new Error("SALVACEL_PHOTO_MOBILE_ORIGIN no es una URL válida."); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const localHost = host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".lan") || privateV4(host) || host === "::1" || privateV6(host);
  const loopbackHost = host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "::1";
  if (!localHost || !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Configura el origen móvil con una dirección privada del taller, sin ruta adicional.");
  }
  if (!loopbackHost && url.protocol !== "https:") throw new Error("El acceso desde celular requiere HTTPS con un certificado confiable en la red del taller.");
  return url;
}

function photoDirectory(): string {
  const configured = process.env.SALVACEL_PHOTO_STORAGE_DIR?.trim();
  if (!configured) throw new Error("Falta configurar el volumen privado de fotos.");
  return resolve(configured);
}

function photoStorageLimitBytes(): number {
  const configured = process.env.SALVACEL_PHOTO_MAX_STORAGE_BYTES?.trim();
  if (!configured) return defaultPhotoStorageLimitBytes;
  const limit = Number(configured);
  if (!Number.isSafeInteger(limit) || limit < 50 * 1024 * 1024) throw new Error("SALVACEL_PHOTO_MAX_STORAGE_BYTES debe ser un entero de al menos 50 MiB.");
  return limit;
}

async function ensurePhotoDirectory(): Promise<string> {
  const directory = photoDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("El almacenamiento de fotos no es un directorio privado válido.");
  await chmod(directory, 0o700);
  return directory;
}

function safeFilename(value: string): string {
  const name = Array.from(basename(value).replace(/[\u0000-\u001f\u007f"\\/]/g, "_").trim()).slice(0, 120).join("");
  return name || "foto-equipo";
}

function idFrom(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function listOrderPhotos(request: Request): Promise<Response> {
  const { response } = await authorize(request, "repairs.write");
  if (response) return response;
  const orderId = idFrom(new URL(request.url).searchParams.get("orderId") || "");
  if (!orderId) return json({ error: "Orden inválida." }, 400);
  const database = getDatabase();
  const order = await database.prepare("SELECT id FROM orders WHERE id=?").bind(orderId).first() as DbRow | null;
  if (!order) return json({ error: "No se encontró la orden." }, 404);
  const photos = await database.prepare(`SELECT id,original_name,content_type,size_bytes,sha256,created_at
    FROM repair_photos WHERE order_id=? AND deleted_at IS NULL ORDER BY created_at,id`).bind(orderId).all();
  return json({ photos: photos.results });
}

export async function createPhotoToken(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) return json({ error: "Origen de solicitud no permitido." }, 403);
  const { actor, response } = await authorize(request, "repairs.write");
  if (response || !actor) return response || json({ error: "No autorizado." }, 401);
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Solicitud inválida." }, 400);
    body = parsed as Record<string, unknown>;
  } catch { return json({ error: "Solicitud inválida." }, 400); }
  const orderId = idFrom(String(body.orderId || ""));
  if (!orderId) return json({ error: "Orden inválida." }, 400);
  let origin: URL | null;
  try { origin = mobileOrigin(); } catch (error) { return json({ error: error instanceof Error ? error.message : "Origen móvil inválido." }, 400); }
  if (!origin) return json({ error: "La carga móvil aún no está habilitada. Configura el origen privado y activa el acceso restringido de fotos." }, 409);
  try { await ensurePhotoDirectory(); } catch { return json({ error: "El almacenamiento privado de fotos no está disponible." }, 503); }

  const database = getDatabase();
  const order = await database.prepare("SELECT id,brand,model,status FROM orders WHERE id=?").bind(orderId).first() as DbRow | null;
  if (!order) return json({ error: "No se encontró la orden." }, 404);
  if (["entregada", "cancelada"].includes(String(order.status))) return json({ error: "Solo se pueden agregar fotos a una orden activa." }, 409);

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = sha256(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + qrLifetimeMs).toISOString();
  const mobileUrl = new URL("/mobile-photos.html", origin);
  mobileUrl.hash = rawToken;
  try {
    const qr = await QRCode.toDataURL(mobileUrl.toString(), { type: "image/png", width: 256, margin: 2, errorCorrectionLevel: "M" });
    await database.transaction(async client => {
      const currentOrder = await client.query<DbRow>("SELECT status FROM orders WHERE id=$1 FOR UPDATE", [orderId]);
      if (!currentOrder.rows[0] || ["entregada", "cancelada"].includes(String(currentOrder.rows[0].status))) throw new Error("PHOTO_ORDER_CLOSED");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('salvacel-photo-order:'||$1::text,0))", [orderId]);
      await client.query("UPDATE repair_photo_upload_tokens SET revoked_at=$1 WHERE order_id=$2 AND revoked_at IS NULL", [now.toISOString(), orderId]);
      await client.query(`INSERT INTO repair_photo_upload_tokens (token_hash,order_id,created_by_user_id,created_at,expires_at,max_uploads)
        VALUES ($1,$2,$3,$4,$5,$6)`, [tokenHash, orderId, actor.id, now.toISOString(), expiresAt, maxUploads]);
      await client.query(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id)
        VALUES ('order',$1,'photo_qr_created','Se generó un QR temporal para evidencia fotográfica.', $2,$3)`, [orderId, now.toISOString(), actor.id]);
    });
    return json({ qr, mobileUrl: mobileUrl.toString(), tokenHash, expiresAt, maxUploads, order: { brand: String(order.brand), model: String(order.model) } }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "PHOTO_ORDER_CLOSED") return json({ error: "Solo se pueden agregar fotos a una orden activa." }, 409);
    console.error("photo-token-create", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "No se pudo generar el código QR." }, 503);
  }
}

export async function redeemPhotoToken(request: Request): Promise<Response> {
  if (request.method !== "POST" || !isSameOriginRequest(request)) return json({ error: "Origen o método no permitido." }, 403);
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Solicitud inválida." }, 400);
    body = parsed as Record<string, unknown>;
  } catch { return json({ error: "Solicitud inválida." }, 400); }
  const token = typeof body.token === "string" ? body.token : "";
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return json({ error: "El código no es válido o ya venció." }, 410);
  const rawSession = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + uploadSessionLifetimeMs).toISOString();
  try {
    const database = getDatabase();
    const redeemed = await database.prepare(`UPDATE repair_photo_upload_tokens SET redeemed_at=?,upload_session_hash=?,upload_session_expires_at=?
      WHERE token_hash=? AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at>? AND upload_count<max_uploads
      RETURNING order_id`).bind(now.toISOString(), sha256(rawSession), expiresAt, sha256(token), now.toISOString()).first() as DbRow | null;
    if (!redeemed) return json({ error: "El código ya se usó, fue cancelado o venció." }, 410);
    const order = await database.prepare("SELECT brand,model FROM orders WHERE id=? AND status NOT IN ('entregada','cancelada')").bind(Number(redeemed.order_id)).first() as DbRow | null;
    if (!order) {
      await database.prepare("UPDATE repair_photo_upload_tokens SET revoked_at=? WHERE token_hash=?").bind(now.toISOString(), sha256(token)).run();
      return json({ error: "La orden ya no está activa." }, 410);
    }
    return json({ session: rawSession, expiresAt, remaining: maxUploads, order: { brand: String(order.brand), model: String(order.model) } }, 200);
  } catch (error) {
    console.error("photo-token-redeem", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "No se pudo iniciar la carga segura." }, 503);
  }
}

function uploadSession(request: Request): string {
  const value = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{40,64})$/)?.[1] || "";
  return value;
}

export async function uploadPhoto(request: Request): Promise<Response> {
  if (request.method !== "POST" || !isSameOriginRequest(request)) return json({ error: "Origen o método no permitido." }, 403);
  const session = uploadSession(request);
  if (!session) return json({ error: "La sesión de carga no es válida." }, 401);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxUploadBytes + 100_000) return json({ error: "La foto supera el límite de 12 MB." }, 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: "No se pudo leer la foto." }, 400); }
  const file = form.get("photo");
  if (!(file instanceof File) || file.size < 1 || file.size > maxUploadBytes) return json({ error: "Selecciona una imagen de hasta 12 MB." }, 400);

  let input: Buffer;
  try { input = Buffer.from(await file.arrayBuffer()); }
  catch { return json({ error: "No se pudo leer la foto seleccionada." }, 400); }
  let format: string | undefined;
  let thumbnail: Buffer;
  try {
    const pipeline = sharp(input, { failOn: "error", limitInputPixels: 40_000_000, animated: false });
    const metadata = await pipeline.metadata();
    format = metadata.format;
    if (!format || !allowedFormats.has(format) || !metadata.width || !metadata.height) return json({ error: "Solo se aceptan fotos JPG, PNG o WebP válidas." }, 415);
    thumbnail = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000, animated: false })
      .rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch { return json({ error: "El archivo no es una imagen válida o está dañado." }, 415); }

  const contentType = format === "jpeg" ? "image/jpeg" : `image/${format}`;
  const extension = format === "jpeg" ? "jpg" : format;
  const suffix = randomUUID();
  const originalKey = `${suffix}.${extension}`;
  const thumbnailKey = `${suffix}.thumb.webp`;
  let directory: string;
  try { directory = await ensurePhotoDirectory(); } catch { return json({ error: "El almacenamiento privado de fotos no está disponible." }, 503); }
  try {
    await writeFile(join(/*turbopackIgnore: true*/ directory, originalKey), input, { flag: "wx", mode: 0o600 });
    await writeFile(join(/*turbopackIgnore: true*/ directory, thumbnailKey), thumbnail, { flag: "wx", mode: 0o600 });
  } catch (error) {
    await Promise.all([rm(join(/*turbopackIgnore: true*/ directory, originalKey), { force: true }), rm(join(/*turbopackIgnore: true*/ directory, thumbnailKey), { force: true })]);
    console.error("photo-storage-write", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "No se pudo guardar la foto en el almacenamiento privado." }, 503);
  }

  try {
    const database = getDatabase();
    const photo = await database.transaction(async client => {
      const locked = await client.query<DbRow>(`SELECT t.order_id,t.token_hash,t.created_by_user_id,t.upload_count,t.max_uploads,o.status
        FROM repair_photo_upload_tokens t JOIN orders o ON o.id=t.order_id
        WHERE t.upload_session_hash=$1 AND t.revoked_at IS NULL AND t.upload_session_expires_at>$2 FOR UPDATE OF t`, [sha256(session), new Date().toISOString()]);
      const token = locked.rows[0];
      if (!token) throw new Error("UPLOAD_SESSION_INVALID");
      if (["entregada", "cancelada"].includes(String(token.status))) throw new Error("UPLOAD_ORDER_CLOSED");
      if (Number(token.upload_count) >= Number(token.max_uploads)) throw new Error("UPLOAD_LIMIT_REACHED");
      const storageLimit = photoStorageLimitBytes();
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('salvacel-photo-storage-quota',0))");
      const storage = await client.query<DbRow>("SELECT COALESCE(SUM(size_bytes + thumbnail_size_bytes),0)::bigint AS total_bytes FROM repair_photos");
      if (Number(storage.rows[0]?.total_bytes || 0) + input.length + thumbnail.length > storageLimit) throw new Error("UPLOAD_STORAGE_LIMIT");
      const now = new Date().toISOString();
      const inserted = await client.query<DbRow>(`INSERT INTO repair_photos
        (order_id,upload_token_hash,storage_key,thumbnail_key,original_name,content_type,size_bytes,thumbnail_size_bytes,sha256,created_by_user_id,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, [Number(token.order_id), String(token.token_hash), originalKey, thumbnailKey, safeFilename(file.name), contentType, input.length, thumbnail.length, sha256(input), Number(token.created_by_user_id), now]);
      await client.query("UPDATE repair_photo_upload_tokens SET upload_count=upload_count+1 WHERE upload_session_hash=$1", [sha256(session)]);
      await client.query(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id)
        VALUES ('order',$1,'photo_uploaded','Se agregó evidencia fotográfica desde una sesión QR temporal.',$2,$3)`, [Number(token.order_id), now, Number(token.created_by_user_id)]);
      const remaining = Number(token.max_uploads) - Number(token.upload_count) - 1;
      return { id: Number(inserted.rows[0].id), remaining };
    });
    return json({ ok: true, photoId: photo.id, remaining: photo.remaining }, 201);
  } catch (error) {
    await Promise.all([rm(join(/*turbopackIgnore: true*/ directory, originalKey), { force: true }), rm(join(/*turbopackIgnore: true*/ directory, thumbnailKey), { force: true })]);
    if (error instanceof Error && error.message === "UPLOAD_SESSION_INVALID") return json({ error: "La sesión venció o fue revocada. Solicita un nuevo QR." }, 410);
    if (error instanceof Error && error.message === "UPLOAD_ORDER_CLOSED") return json({ error: "La orden ya se cerró; no se aceptan más fotos." }, 410);
    if (error instanceof Error && error.message === "UPLOAD_LIMIT_REACHED") return json({ error: "Esta sesión alcanzó el límite de 10 fotos." }, 409);
    if (error instanceof Error && error.message === "UPLOAD_STORAGE_LIMIT") return json({ error: "Se alcanzó el límite local de almacenamiento de fotos; no se guardó la imagen." }, 507);
    console.error("photo-upload-commit", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "No se pudo registrar la foto." }, 503);
  }
}

export async function servePhoto(request: Request, photoIdText: string): Promise<Response> {
  const { response } = await authorize(request, "repairs.write");
  if (response) return response;
  const photoId = idFrom(photoIdText);
  if (!photoId) return json({ error: "Foto inválida." }, 400);
  const variant = new URL(request.url).searchParams.get("variant") === "thumbnail" ? "thumbnail" : "original";
  const photo = await getDatabase().prepare(`SELECT storage_key,thumbnail_key,original_name,content_type,deleted_at
    FROM repair_photos WHERE id=?`).bind(photoId).first() as DbRow | null;
  if (!photo || photo.deleted_at) return json({ error: "No se encontró la foto." }, 404);
  const key = String(variant === "thumbnail" ? photo.thumbnail_key : photo.storage_key);
  if (!/^[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp|thumb\.webp)$/.test(key)) return json({ error: "La referencia de archivo no es válida." }, 500);
  try {
    const file = await readFile(join(/*turbopackIgnore: true*/ photoDirectory(), key));
    const headers = new Headers(responseHeaders);
    headers.set("Content-Type", variant === "thumbnail" ? "image/webp" : String(photo.content_type));
    const originalName = safeFilename(String(photo.original_name));
    const asciiName = originalName.replace(/[^\x20-\x7e]/g, "_");
    headers.set("Content-Disposition", variant === "thumbnail" ? "inline" : `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(originalName)}`);
    headers.set("Content-Length", String(file.byteLength));
    return new Response(file, { headers });
  } catch { return json({ error: "El archivo privado no está disponible." }, 404); }
}

export async function deletePhoto(request: Request, photoIdText: string): Promise<Response> {
  if (!isSameOriginRequest(request)) return json({ error: "Origen de solicitud no permitido." }, 403);
  const { actor, response } = await authorize(request, "repairs.write");
  if (response || !actor) return response || json({ error: "No autorizado." }, 401);
  const photoId = idFrom(photoIdText);
  if (!photoId) return json({ error: "Foto inválida." }, 400);
  let reason = "Retirada de la evidencia por personal autorizado.";
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.reason === "string" && body.reason.trim()) reason = body.reason.trim().slice(0, 240);
  } catch { return json({ error: "Solicitud inválida." }, 400); }
  const now = new Date().toISOString();
  const orderId = await getDatabase().transaction(async client => {
    const result = await client.query<DbRow>(`UPDATE repair_photos SET deleted_at=$1,delete_reason=$2
      WHERE id=$3 AND deleted_at IS NULL RETURNING order_id`, [now, reason, photoId]);
    if (!result.rows[0]) return null;
    const linkedOrder = Number(result.rows[0].order_id);
    await client.query(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id)
      VALUES ('order',$1,'photo_removed',$2,$3,$4)`, [linkedOrder, reason, now, actor.id]);
    return linkedOrder;
  });
  if (orderId === null) return json({ error: "No se encontró la foto o ya se retiró." }, 404);
  return json({ ok: true });
}

export async function revokePhotoTokens(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) return json({ error: "Origen de solicitud no permitido." }, 403);
  const { actor, response } = await authorize(request, "repairs.write");
  if (response || !actor) return response || json({ error: "No autorizado." }, 401);
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Solicitud inválida." }, 400);
    body = parsed as Record<string, unknown>;
  } catch { return json({ error: "Solicitud inválida." }, 400); }
  const tokenHash = typeof body.tokenHash === "string" && /^[a-f0-9]{64}$/.test(body.tokenHash) ? body.tokenHash : "";
  if (!tokenHash) return json({ error: "Código QR inválido." }, 400);
  const now = new Date().toISOString();
  const orderId = await getDatabase().transaction(async client => {
    const result = await client.query<DbRow>(`UPDATE repair_photo_upload_tokens SET revoked_at=$1 WHERE token_hash=$2 AND revoked_at IS NULL RETURNING order_id`, [now, tokenHash]);
    if (!result.rows[0]) return null;
    const linkedOrder = Number(result.rows[0].order_id);
    await client.query(`INSERT INTO audit_log (entity,entity_id,action,detail,created_at,actor_user_id)
      VALUES ('order',$1,'photo_qr_revoked','Se revocó un QR temporal de evidencia fotográfica.',$2,$3)`, [linkedOrder, now, actor.id]);
    return linkedOrder;
  });
  if (orderId === null) return json({ error: "El código ya venció o fue revocado." }, 404);
  return json({ ok: true });
}
