(() => {
  const status = document.querySelector("#status");
  const begin = document.querySelector("#begin");
  const device = document.querySelector("#device");
  const start = document.querySelector("#start");
  const upload = document.querySelector("#upload");
  const picker = document.querySelector("#photos");
  const queue = document.querySelector("#queue");
  const send = document.querySelector("#send");
  const remainingLabel = document.querySelector("#remaining");
  const token = location.hash.slice(1);
  let session = "";
  let remaining = 10;
  let files = [];
  const showStatus = (message) => { status.textContent = message; };
  const validToken = /^[A-Za-z0-9_-]{40,64}$/.test(token);

  if (!validToken) {
    showStatus("El enlace no contiene un código válido. Pide un QR nuevo en Salvacel.");
    history.replaceState(null, "", location.pathname);
    return;
  }

  history.replaceState(null, "", location.pathname);
  begin.hidden = false;
  showStatus("Código listo. Tócalo para iniciar la sesión de carga.");
  begin.addEventListener("click", async () => {
    begin.disabled = true;
    showStatus("Validando el código…");
    try {
      const response = await fetch("/api/photos/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
        credentials: "omit",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "El código ya no está disponible.");
      session = result.session;
      remaining = Number(result.remaining) || 0;
      device.textContent = `${result.order.brand} ${result.order.model}`;
      device.hidden = false;
      start.hidden = true;
      upload.hidden = false;
      remainingLabel.textContent = `Quedan ${remaining} cargas en esta sesión.`;
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "No se pudo iniciar la carga.");
      begin.disabled = false;
    }
  });

  picker.addEventListener("change", () => {
    files = Array.from(picker.files || []).slice(0, remaining);
    queue.replaceChildren();
    for (const file of files) {
      const item = document.createElement("p");
      item.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
      queue.append(item);
    }
    send.disabled = files.length === 0;
    showStatus(files.length ? `${files.length} foto(s) listas para subir.` : "Elige al menos una foto.");
  });

  send.addEventListener("click", async () => {
    if (!session || files.length === 0) return;
    send.disabled = true;
    picker.disabled = true;
    let uploaded = 0;
    for (const file of files) {
      if (file.size < 1 || file.size > 12_000_000) {
        showStatus(`${file.name} supera el máximo de 12 MB; no se subió.`);
        continue;
      }
      const data = new FormData();
      data.set("photo", file, file.name);
      try {
        const response = await fetch("/api/photos/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${session}` },
          body: data,
          cache: "no-store",
          credentials: "omit",
        });
        const result = await response.json();
        if (!response.ok) {
          const error = new Error(result.error || "No se pudo subir la foto.");
          error.status = response.status;
          throw error;
        }
        uploaded += 1;
        remaining = Number(result.remaining) || 0;
        showStatus(`Foto guardada. ${remaining} cargas restantes.`);
      } catch (error) {
        showStatus(error instanceof Error ? error.message : "No se pudo subir la foto.");
        if (error && typeof error === "object" && "status" in error && error.status === 410) session = "";
        break;
      }
    }
    files = [];
    picker.value = "";
    queue.replaceChildren();
    picker.disabled = false;
    send.disabled = true;
    remainingLabel.textContent = `Se subieron ${uploaded} foto(s). Quedan ${remaining} cargas.`;
    if (remaining === 0 || !session) {
      picker.disabled = true;
      showStatus(`Se subieron ${uploaded} foto(s). La sesión terminó; ya puedes cerrar esta página.`);
    }
  });

})();
