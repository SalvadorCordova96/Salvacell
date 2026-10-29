import { createHash, scryptSync } from "node:crypto";
import { createPostgresPool } from "./postgres-connection.mjs";

export const testSessionToken = "e2eTemporarySessionToken0000000000000000000000000";
export const testSessionCookie = `salvacel_session=${testSessionToken}`;

export async function seedTestAdmin(env) {
  const pool = createPostgresPool(env);
  try {
    const salt = "dGVzdC1vbmx5LW5vLXJlYWwtY3JlZGVudGlhbA";
    const passwordHash = scryptSync("e2e-admin-password-only-for-temporary-db", Buffer.from(salt, "base64url"), 64, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex");
    const role = await pool.query("SELECT id FROM roles WHERE key='administrador'");
    if (!role.rows[0]) throw new Error("Falta el rol administrador para el E2E.");
    const createdAt = new Date().toISOString();
    const user = await pool.query(`INSERT INTO users (username,display_name,password_hash,password_salt,role_id,active,created_at,updated_at)
      VALUES ('e2e-admin','Administrador E2E',$1,$2,$3,1,$4,$4) RETURNING id`, [passwordHash, salt, role.rows[0].id, createdAt]);
    await pool.query(`INSERT INTO sessions (token_hash,created_at,expires_at,user_id,last_seen_at)
      VALUES ($1,$2,$3,$4,$2)`, [createHash("sha256").update(testSessionToken).digest("hex"), createdAt, new Date(Date.now() + 60 * 60 * 1000).toISOString(), user.rows[0].id]);
  } finally { await pool.end(); }
}
