import { randomBytes } from "node:crypto";
import { chmod, mkdir, open, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const secretDir = resolve(import.meta.dirname, "../../../Salvacel-OpenClaw/.local-secrets");
await mkdir(secretDir, { recursive: true, mode: 0o700 });
await chmod(secretDir, 0o700);

for (const name of ["salvacel_agent_ingress_token", "openclaw_hook_token", "salvacel_operator_chat_token"]) {
  const path = resolve(secretDir, name);
  try {
    const value = await readFile(path, "utf8");
    if (value.trim().length < 64) throw new Error(`${name} existe, pero no cumple el mínimo de longitud.`);
    await chmod(path, 0o600);
    console.log(`Secreto local verificado: ${name}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    const handle = await open(path, "wx", 0o600);
    try { await handle.writeFile(`${randomBytes(48).toString("hex")}\n`, "utf8"); }
    finally { await handle.close(); }
    console.log(`Secreto local creado: ${name}`);
  }
}

console.log("Guarda estos archivos como secretos locales; no los compartas ni los agregues a Git.");
