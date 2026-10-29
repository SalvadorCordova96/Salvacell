import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";

function docker(args, options = {}) {
  const result = spawnSync("docker", args, { encoding: "utf8", ...options });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(result.stderr || `Docker terminó con código ${result.status}.`);
  }
  return result.stdout.trim();
}

export async function startTemporaryPostgres() {
  const name = `salvacel-test-pg-${process.pid}-${randomBytes(4).toString("hex")}`;
  const password = randomBytes(32).toString("base64url");
  docker([
    "run", "--detach", "--rm", "--name", name,
    ...(process.env.SALVACEL_TEST_RUN_ID ? ["--label", `salvacel.test-run=${process.env.SALVACEL_TEST_RUN_ID}`] : []),
    "--memory", "512m", "--cpus", "1",
    "-e", "POSTGRES_DB=salvacel",
    "-e", "POSTGRES_USER=salvacel",
    "-e", `POSTGRES_PASSWORD=${password}`,
    "-p", "127.0.0.1::5432",
    "postgres:17.6-bookworm",
  ]);

  try {
    const portLine = docker(["port", name, "5432/tcp"]).split(/\r?\n/)[0];
    const port = Number(portLine.match(/:(\d+)$/)?.[1]);
    if (!Number.isInteger(port)) throw new Error("Docker no devolvió un puerto temporal válido.");

    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const check = spawnSync("docker", ["exec", name, "pg_isready", "-U", "salvacel", "-d", "salvacel"], { encoding: "utf8" });
      if (check.status === 0) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("PostgreSQL temporal no inició a tiempo.");

    const env = {
      ...process.env,
      PGHOST: "127.0.0.1",
      PGPORT: String(port),
      PGDATABASE: "salvacel",
      PGUSER: "salvacel",
      PGPASSWORD: password,
    };
    const pool = new Pool({
      host: env.PGHOST,
      port,
      database: env.PGDATABASE,
      user: env.PGUSER,
      password,
      connectionTimeoutMillis: 1_000,
    });
    ready = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        await pool.query("SELECT 1");
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    await pool.end();
    if (!ready) throw new Error("El puerto temporal de PostgreSQL no aceptó conexiones desde las pruebas.");

    return {
      name,
      env,
      stop() {
        spawnSync("docker", ["rm", "--force", name], { stdio: "ignore" });
      },
    };
  } catch (error) {
    spawnSync("docker", ["rm", "--force", name], { stdio: "ignore" });
    throw error;
  }
}

export function runMigrations(env) {
  const result = spawnSync(process.execPath, ["scripts/migrate-local-db.mjs"], {
    env,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) {
    throw result.error || new Error("No se pudieron aplicar las migraciones PostgreSQL temporales.");
  }
}
