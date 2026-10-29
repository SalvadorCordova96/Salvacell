import assert from "node:assert/strict";

const baseUrl = process.env.SALVACEL_URL || "http://127.0.0.1:8787";
const pageResponse = await fetch(baseUrl);
assert.equal(pageResponse.status, 200, "La página principal debe responder 200");

const html = await pageResponse.text();
const stylesheets = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]
  .map((match) => match[1]);
assert.ok(stylesheets.length > 0, "La página debe incluir hojas de estilo");

for (const path of stylesheets) {
  const response = await fetch(new URL(path, baseUrl));
  const body = await response.arrayBuffer();
  assert.equal(response.status, 200, `La hoja de estilo ${path} debe responder 200`);
  assert.match(response.headers.get("content-type") || "", /text\/css/, `${path} debe servirse como CSS`);
  assert.ok(body.byteLength > 0, `${path} no debe estar vacía`);
}

const logoPath = html.match(/<img\b[^>]*src="([^"]+)"[^>]*alt="Logotipo de Salvacel"/)?.[1];
assert.ok(logoPath, "La página debe incluir el logotipo de Salvacel");
const logoResponse = await fetch(new URL(logoPath, baseUrl));
const logo = await logoResponse.arrayBuffer();
assert.equal(logoResponse.status, 200, "El logotipo debe responder 200");
assert.match(logoResponse.headers.get("content-type") || "", /image\//, "El logotipo debe servirse como imagen");
assert.ok(logo.byteLength > 0, "El logotipo no debe estar vacío");

console.log(`Recursos estáticos correctos: ${stylesheets.length} hojas de estilo y logotipo (${logo.byteLength} bytes).`);
