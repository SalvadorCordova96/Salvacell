import assert from 'node:assert/strict';

const root = process.env.TEST_TALLER_URL || 'http://127.0.0.1:4181';
const cookie = process.env.SALVACEL_TEST_SESSION_COOKIE || '';
const origin = new URL(root).origin;
let checks = 0;

async function chat(message, history = [], { withSession = true, requestOrigin = origin } = {}) {
  const response = await fetch(`${root}/api/assistant/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: requestOrigin,
      ...(withSession ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ message, history }),
  });
  return { response, body: await response.json() };
}

let result = await chat('TEST_OPERATOR_CHAT_NAV', [], { withSession: false });
assert.equal(result.response.status, 401, 'El chat requiere una sesión de Salvacel.');
checks += 1;

result = await chat('TEST_OPERATOR_CHAT_NAV', [], { requestOrigin: 'https://attacker.example' });
assert.equal(result.response.status, 403, 'El chat rechaza solicitudes desde otro origen.');
checks += 1;

result = await chat('TEST_OPERATOR_CHAT_NAV');
assert.equal(result.response.status, 200, JSON.stringify(result.body));
assert.match(result.body.reply, /TEST_OPERATOR_CHAT_NAV/);
assert.deepEqual(result.body.action, { type: 'navigate', view: 'orders' });
checks += 3;

result = await chat('TEST_OPERATOR_CHAT_ORDER');
assert.equal(result.response.status, 200, JSON.stringify(result.body));
assert.equal(result.body.action.type, 'draft_order');
assert.equal(result.body.action.draft.model, 'A15');
checks += 3;

result = await chat('TEST_OPERATOR_CHAT_CUSTOMER');
assert.equal(result.response.status, 200, JSON.stringify(result.body));
assert.equal(result.body.action.type, 'draft_customer');
checks += 2;

result = await chat('TEST_OPERATOR_CHAT_PRODUCT');
assert.equal(result.response.status, 200, JSON.stringify(result.body));
assert.equal(result.body.action.type, 'draft_product');
checks += 2;

result = await chat('TEST_OPERATOR_CHAT_OPEN_ORDER');
assert.equal(result.response.status, 200, JSON.stringify(result.body));
assert.deepEqual(result.body.action, { type: 'open_order', orderId: 123 });
checks += 2;

result = await chat('TEST_OPERATOR_CHAT_OPEN_CUSTOMER');
assert.equal(result.response.status, 200, JSON.stringify(result.body));
assert.deepEqual(result.body.action, { type: 'open_customer', customerId: 456 });
checks += 2;

result = await chat('TEST_OPERATOR_CHAT_OPEN_ORDER_FORBIDDEN');
assert.notEqual(result.response.status, 200, 'El turno no acepta abrir un registro fuera de las referencias autorizadas.');
checks += 1;

const callback = await fetch(`${root}/api/agent/operator-chat-callback`, {
  method: 'POST',
  headers: { Authorization: 'Bearer definitely-not-the-callback-token', 'Content-Type': 'application/json' },
  body: JSON.stringify({ turnId: crypto.randomUUID(), reply: 'No autorizado.' }),
});
assert.equal(callback.status, 401, 'El callback interno exige su secreto independiente.');
checks += 1;

console.log(`OpenClaw operator chat simulado: ${checks} comprobaciones correctas.`);
