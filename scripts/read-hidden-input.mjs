import { stdin, stdout } from "node:process";

export async function readHidden(prompt, { input = stdin, output = stdout } = {}) {
  output.write(prompt);
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("Ejecuta este comando con una terminal interactiva (docker compose exec -it).");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    let settled = false;
    const cleanup = () => {
      input.off("data", onData);
      input.off("error", onError);
      try { input.setRawMode(false); } catch {}
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else { output.write("\n"); resolve(value); }
    };
    const onError = (error) => finish(error);
    const onData = (chunk) => {
      for (const key of chunk.toString("utf8")) {
        if (key === "\u0003") { finish(new Error("Cancelado.")); return; }
        if (key === "\r" || key === "\n") { finish(); return; }
        if (key === "\u007f" || key === "\b") value = value.slice(0, -1);
        else if (key >= " ") value += key;
      }
    };

    try {
      input.setRawMode(true);
      input.on("data", onData);
      input.on("error", onError);
      input.resume();
    } catch (error) {
      finish(error);
    }
  });
}
