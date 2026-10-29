import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { createPostgresPool } from "./postgres-connection.mjs";
import { readHidden } from "./read-hidden-input.mjs";

const scrypt = promisify(scryptCallback);
const rl = createInterface({ input: stdin, output: stdout });

const username = (await rl.question("Usuario administrador (3-40 caracteres): ")).trim().toLocaleLowerCase("en-US");
const displayName = (await rl.question("Nombre visible: ")).trim();
rl.close();
if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error("El usuario debe usar letras, números, punto, guion o guion bajo.");
if (!displayName || displayName.length > 80) throw new Error("El nombre visible debe tener entre 1 y 80 caracteres.");
const password = await readHidden("Contraseña (mínimo 12 caracteres): ");
const confirmation = await readHidden("Confirma la contraseña: ");
if (password.length < 12 || password !== confirmation) throw new Error("La contraseña no cumple el mínimo o no coincide.");

const pool = createPostgresPool();
try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE users IN EXCLUSIVE MODE");
    const existing = await client.query("SELECT count(*)::int AS count FROM users");
    if (existing.rows[0].count > 0) throw new Error("Ya existen usuarios. El alta inicial está cerrada.");
    const role = await client.query("SELECT id FROM roles WHERE key='administrador' AND active=1");
    if (!role.rows[0]) throw new Error("No existe el rol Administrador; aplica las migraciones pendientes.");
    const salt = randomBytes(16).toString("base64url");
    const hash = (await scrypt(password, Buffer.from(salt, "base64url"), 64, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })).toString("hex");
    await client.query(`INSERT INTO users (username,display_name,password_hash,password_salt,role_id,active,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,1,$6,$6)`, [username, displayName, hash, salt, role.rows[0].id, new Date().toISOString()]);
    await client.query("COMMIT");
    console.log(`Administrador ${username} creado. Ya puedes iniciar sesión en Salvacel.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
} finally { await pool.end(); }
