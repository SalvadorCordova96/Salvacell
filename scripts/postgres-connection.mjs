import { readFileSync } from "node:fs";
import { Pool } from "pg";

export function createPostgresPool(env = process.env) {
  const passwordFile = env.PGPASSWORD_FILE;
  const password = env.PGPASSWORD || (passwordFile ? readFileSync(passwordFile, "utf8").trim() : undefined);
  if (!password) throw new Error("Falta configurar el secreto local de PostgreSQL.");

  return new Pool({
    host: env.PGHOST || "127.0.0.1",
    port: Number(env.PGPORT || 5432),
    database: env.PGDATABASE || "salvacel",
    user: env.PGUSER || "salvacel",
    password,
    connectionTimeoutMillis: 5_000,
  });
}
