import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const backups = resolve(root, "backups");
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
const target = resolve(backups, `salvacel-${stamp}.dump`);
mkdirSync(backups, { recursive: true });

const backupAt = new Date().toISOString();
const mark = spawnSync(
  "docker",
  ["exec", "salvacel-postgres", "psql", "-U", "salvacel", "-d", "salvacel", "-c", `UPDATE settings SET last_backup_at = '${backupAt}' WHERE id = 1`],
  { cwd: root, encoding: "utf8" },
);
if (mark.error || mark.status !== 0) {
  console.error("No se pudo registrar la fecha del respaldo en PostgreSQL.");
  if (mark.stderr) process.stderr.write(mark.stderr);
  process.exit(1);
}

const dump = spawnSync(
  "docker",
  ["exec", "salvacel-postgres", "pg_dump", "-U", "salvacel", "-d", "salvacel", "-Fc"],
  { cwd: root, maxBuffer: 512 * 1024 * 1024 },
);
if (dump.error || dump.status !== 0 || !dump.stdout?.length) {
  console.error("No se pudo crear el respaldo PostgreSQL.");
  if (dump.stderr) process.stderr.write(dump.stderr);
  process.exit(1);
}

writeFileSync(target, dump.stdout, { flag: "wx" });
console.log(`Respaldo PostgreSQL creado: ${target}`);
