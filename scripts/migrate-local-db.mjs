import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createPostgresPool } from "./postgres-connection.mjs";

const root = resolve(import.meta.dirname, "..");
const migrationsDir = resolve(root, "drizzle-postgres");
const pool = createPostgresPool();

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS salvacel_schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const migrations = readdirSync(migrationsDir)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();

  for (const name of migrations) {
    const applied = await pool.query(
      "SELECT 1 FROM salvacel_schema_migrations WHERE name = $1",
      [name],
    );
    if (applied.rowCount) continue;

    const statements = readFileSync(resolve(migrationsDir, name), "utf8")
      .split(/-->\s*statement-breakpoint\s*/g)
      .map((statement) => statement.trim())
      .filter(Boolean);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const statement of statements) await client.query(statement);
      await client.query(
        "INSERT INTO salvacel_schema_migrations (name) VALUES ($1)",
        [name],
      );
      await client.query("COMMIT");
      console.log(`Migración PostgreSQL aplicada: ${name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Falló la migración PostgreSQL ${name}.`, { cause: error });
    } finally {
      client.release();
    }
  }

  await pool.query(
    "INSERT INTO settings (id, revision) VALUES (1, 0) ON CONFLICT (id) DO NOTHING",
  );
} finally {
  await pool.end();
}
