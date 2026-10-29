import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const mode = process.argv[2];
if (!["dev", "build", "start"].includes(mode)) {
  console.error("Usa dev, build o start.");
  process.exit(1);
}

const next = resolve(root, "node_modules/next/dist/bin/next");
const hostname = process.env.SALVACEL_HOST || process.env.HOSTNAME || (mode === "dev" ? "127.0.0.1" : "0.0.0.0");
const args = mode === "build"
  ? ["build", ...process.argv.slice(3).filter((argument) => argument === "--webpack")]
  : mode === "dev"
    ? ["dev", "--hostname", hostname, "--port", process.env.PORT || "8787"]
    : ["start", "--hostname", hostname, "--port", process.env.PORT || "8787", ...process.argv.slice(3)];

const child = spawn(process.execPath, [next, ...args], {
  cwd: root,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("No se pudo iniciar Next.js.", error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
