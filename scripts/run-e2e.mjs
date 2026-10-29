import { spawn, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { existsSync, lstatSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { runMigrations, startTemporaryPostgres } from "./temporary-postgres.mjs";
import { seedTestAdmin } from "./seed-test-admin.mjs";

const root = resolve(import.meta.dirname, "..");
const port = 8789;
const baseURL = `http://127.0.0.1:${port}`;
const isolatedNextDir = process.env.SALVACEL_VERIFY_NEXT_DIST_DIR || ".next-verify";
const testAgentIngressToken = "e2e-agent-ingress-token-with-at-least-32-characters";
const database = await startTemporaryPostgres();
let photosDir;
let server;
let stopRequested = false;

try {
  photosDir = mkdtempSync(join(tmpdir(), "salvacel-e2e-photos-"));
  runMigrations(database.env);
  await seedTestAdmin(database.env);
  if (process.env.SALVACEL_SKIP_E2E_BUILD === "true") {
    if (!existsSync(resolve(root, isolatedNextDir, "BUILD_ID"))) {
      throw new Error(`No existe una compilación Next válida en ${isolatedNextDir}; quita SALVACEL_SKIP_E2E_BUILD o ejecuta primero pnpm build.`);
    }
  } else {
    const buildEngine = process.env.SALVACEL_NEXT_BUILD_ENGINE || "webpack";
    const build = spawnSync(process.execPath, [resolve(root, "scripts/run-local.mjs"), "build", ...(buildEngine === "webpack" ? ["--webpack"] : [])], {
      cwd: root,
      env: { ...database.env, SALVACEL_AGENT_INGRESS_TOKEN: testAgentIngressToken, SALVACEL_PHOTO_MOBILE_ORIGIN: baseURL, SALVACEL_PHOTO_STORAGE_DIR: photosDir, SALVACEL_NEXT_DIST_DIR: isolatedNextDir },
      stdio: "inherit",
    });
    if (build.error || build.status !== 0) {
      throw build.error || new Error(`La compilación aislada para E2E falló (${build.status}).`);
    }
  }

  server = spawn(process.execPath, [resolve(root, "scripts/run-local.mjs"), "start"], {
    cwd: root,
    env: { ...database.env, SALVACEL_AGENT_INGRESS_TOKEN: testAgentIngressToken, SALVACEL_PHOTO_MOBILE_ORIGIN: baseURL, SALVACEL_PHOTO_STORAGE_DIR: photosDir, SALVACEL_HOST: "127.0.0.1", PORT: String(port), SALVACEL_NEXT_DIST_DIR: isolatedNextDir },
    stdio: "inherit",
  });

  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`La app E2E terminó con código ${server.exitCode}.`);
    try {
      if ((await fetch(`${baseURL}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("La app E2E no estuvo disponible después de 60 segundos.");

  await new Promise((resolve, reject) => {
    server.once("close", (code, signal) => {
      if (stopRequested) resolve();
      else if (code === 0) resolve();
      else reject(new Error(`La app E2E terminó inesperadamente (${code ?? signal}).`));
    });
    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.once(signal, () => {
        stopRequested = true;
        server.kill(signal);
      });
    }
  });
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("close", resolve));
  }
  try {
    if (photosDir) {
      const resolvedPhotosDir = resolve(photosDir);
      const photoDirectoryInfo = lstatSync(resolvedPhotosDir);
      if (dirname(resolvedPhotosDir) !== resolve(tmpdir()) || !photoDirectoryInfo.isDirectory() || photoDirectoryInfo.isSymbolicLink() || !resolvedPhotosDir.includes("salvacel-e2e-photos-")) {
        throw new Error(`Se rechazó limpiar el directorio temporal de fotos E2E: ${resolvedPhotosDir}`);
      }
      rmSync(resolvedPhotosDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
    }
  } finally {
    database.stop();
  }
}
