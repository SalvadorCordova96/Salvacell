import { randomUUID } from "node:crypto";
import { lstatSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const dumpPath = process.argv[2] ? resolve(process.argv[2]) : "";
const maxDumpBytes = 1024 * 1024 * 1024;
const image = "postgres:17.6-bookworm";
const container = `salvacel-restore-check-${randomUUID().slice(0, 12)}`;
const database = "salvacel_restore_check";
const user = "restore_check";
const password = randomUUID() + randomUUID();
const dockerEnv = Object.fromEntries(
  ["PATH", "PATHEXT", "SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_CONFIG"]
    .filter((key) => process.env[key])
    .map((key) => [key, process.env[key]]),
);
dockerEnv.POSTGRES_PASSWORD = password;

function docker(args, { timeout = 120_000, allowFailure = false } = {}) {
  const result = spawnSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    env: dockerEnv,
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (allowFailure) return result;
  if (result.error || result.status !== 0) {
    const reason = result.error ? result.error.message : `código ${result.status ?? "desconocido"}`;
    throw new Error(`Falló la operación Docker “${args[0]}” (${reason}).`);
  }
  return result.stdout.trim();
}

function validateDump() {
  if (!dumpPath) throw new Error("Indica la ruta al archivo .dump: pnpm db:verify-backup -- .\\backups\\salvacel-fecha.dump");
  const info = lstatSync(dumpPath);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error("El respaldo debe ser un archivo regular, no un enlace ni una carpeta.");
  if (info.size < 1 || info.size > maxDumpBytes) throw new Error("El respaldo debe medir entre 1 byte y 1 GiB para este ensayo aislado.");
  return info.size;
}

const dumpBytes = validateDump();
const startedAt = Date.now();

try {
  docker(["image", "inspect", image]);
  docker([
    "run", "--detach", "--pull=never", "--name", container,
    "--network", "none", "--read-only", "--pids-limit", "96",
    "--memory", "1536m", "--cpus", "1.0",
    "--mount", `type=bind,source=${dumpPath},target=/tmp/salvacel-backup.dump,readonly`,
    "--tmpfs", "/var/lib/postgresql/data:rw,nosuid,nodev,size=2g,mode=0700",
    "--tmpfs", "/var/run/postgresql:rw,nosuid,nodev,size=16m,mode=0770,uid=999,gid=999",
    "--tmpfs", "/tmp:rw,nosuid,nodev,size=1100m,mode=1777",
    "--env", "POSTGRES_USER=restore_check",
    "--env", `POSTGRES_DB=${database}`,
    "--env", "POSTGRES_PASSWORD",
    image,
  ]);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = docker(["exec", container, "pg_isready", "-U", user, "-d", database], { allowFailure: true });
    if (!result.error && result.status === 0) { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("La base temporal no inició dentro del límite de 30 segundos.");

  docker(["exec", container, "pg_restore", "--list", "/tmp/salvacel-backup.dump"]);
  docker([
    "exec", container, "pg_restore", "--exit-on-error", "--single-transaction",
    "--no-owner", "--no-privileges", "-U", user, "-d", database, "/tmp/salvacel-backup.dump",
  ], { timeout: 15 * 60_000 });

  const sql = `SELECT json_build_object(
    'database', current_database(),
    'migrationCount', (SELECT count(*) FROM salvacel_schema_migrations),
    'orders', (SELECT count(*) FROM orders),
    'customers', (SELECT count(*) FROM customers),
    'payments', (SELECT count(*) FROM payments),
    'photoRecords', (SELECT count(*) FROM repair_photos)
  )::text`;
  const restored = JSON.parse(docker([
    "exec", container, "psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1",
    "-U", user, "-d", database, "-c", sql,
  ]));
  if (restored.database !== database || restored.migrationCount < 1) {
    throw new Error("El dump se restauró, pero faltan la base esperada o el historial de migraciones.");
  }

  console.log(JSON.stringify({ ok: true, dumpBytes, durationMs: Date.now() - startedAt, isolation: "contenedor efímero; sin red, puertos ni volúmenes", restored }, null, 2));
} finally {
  // A timed-out `docker run` can create the container even when the CLI never
  // returns its ID; probe our random name so cleanup still catches that case.
  const existing = docker(["container", "inspect", container], { timeout: 10_000, allowFailure: true });
  if (existing.error) {
    console.error(`No se pudo confirmar si quedó el contenedor temporal ${container}; revisa docker ps -a antes de continuar.`);
    process.exitCode = 1;
  } else if (existing.status === 0) {
    const cleanup = docker(["rm", "--force", container], { timeout: 30_000, allowFailure: true });
    if (cleanup.error || cleanup.status !== 0) {
      console.error(`No se confirmó la eliminación del contenedor temporal ${container}; revisa docker ps -a antes de continuar.`);
      process.exitCode = 1;
    }
  }
}
