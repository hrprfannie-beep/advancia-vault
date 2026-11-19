'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifySignature, createColumnWebhookHandler } = require('./columnWebhook.cjs');

const SECRET = 'test-secret';
const body = Buffer.from(JSON.stringify({ id: 'evt_1', type: 'ach.incoming_transfer.completed' }));
const sign = (rawBody, encoding) =>
  crypto.createHmac('sha256', SECRET).update(rawBody).digest(encoding);

function call(handler, { raw = body, sig }) {
  return new Promise((resolve) => {
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(value) {
        resolve({ code: this.code, body: value });
      },
      sendStatus(code) {
        resolve({ code });
      },
    };
    handler({ body: raw, get: () => sig }, res);
  });
}

const enabledConfig = (store, overrides = {}) => ({
  store,
  secret: SECRET,
  encoding: 'hex',
  enabled: true,
  ...overrides,
});

test('accepts a valid hex signature and rejects tampering', () => {
  const header = sign(body, 'hex');
  assert.equal(verifySignature({ rawBody: body, header, secret: SECRET, encoding: 'hex' }), true);
  assert.equal(
    verifySignature({
      rawBody: Buffer.from('{}'),
      header,
      secret: SECRET,
      encoding: 'hex',
    }),
    false,
  );
});

test('accepts base64 only when configured for base64', () => {
  const header = sign(body, 'base64');
  assert.equal(
    verifySignature({ rawBody: body, header, secret: SECRET, encoding: 'base64' }),
    true,
  );
  assert.equal(verifySignature({ rawBody: body, header, secret: SECRET, encoding: 'hex' }), false);
});

test('rejects missing, empty and malformed signatures without throwing', () => {
  for (const header of [undefined, '', 'abc', 'zz'.repeat(32)]) {
    assert.equal(
      verifySignature({ rawBody: body, header, secret: SECRET, encoding: 'hex' }),
      false,
    );
  }
});

test('fails closed when disabled or missing secret, encoding or store', async () => {
  const store = { saveEvent: async () => true };
  const configs = [
    enabledConfig(store, { enabled: false }),
    enabledConfig(store, { secret: '' }),
    enabledConfig(store, { encoding: '' }),
    enabledConfig(null),
  ];

  for (const config of configs) {
    const response = await call(createColumnWebhookHandler(config), { sig: sign(body, 'hex') });
    assert.equal(response.code, 503);
  }
});

test('bad signature returns 401 without storing the event', async () => {
  let saved = 0;
  const store = { saveEvent: async () => { saved += 1; return true; } };
  const response = await call(
    createColumnWebhookHandler(enabledConfig(store)),
    { sig: 'ab'.repeat(32) },
  );

  assert.equal(response.code, 401);
  assert.equal(saved, 0);
});

test('duplicate events are acknowledged but flagged as duplicates', async () => {
  const seen = new Set();
  const store = {
    saveEvent: async (event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    },
  };
  const handler = createColumnWebhookHandler(enabledConfig(store));
  const sig = sign(body, 'hex');

  assert.deepEqual((await call(handler, { sig })).body, { received: true, duplicate: false });
  assert.deepEqual((await call(handler, { sig })).body, { received: true, duplicate: true });
});

test('storage failure returns 503 so Column retries', async () => {
  const store = { saveEvent: async () => { throw new Error('database unavailable'); } };
  const response = await call(
    createColumnWebhookHandler(enabledConfig(store)),
    { sig: sign(body, 'hex') },
  );

  assert.equal(response.code, 503);
});

test('signed invalid JSON and events without string identifiers are rejected', async () => {
  const store = { saveEvent: async () => true };
  const handler = createColumnWebhookHandler(enabledConfig(store));
  const invalidJson = Buffer.from('{');
  const invalidJsonSig = sign(invalidJson, 'hex');
  assert.equal((await call(handler, { raw: invalidJson, sig: invalidJsonSig })).code, 400);

  const invalidEvent = Buffer.from(JSON.stringify({ id: 1, type: 'event.test' }));
  const invalidEventSig = sign(invalidEvent, 'hex');
  assert.equal((await call(handler, { raw: invalidEvent, sig: invalidEventSig })).code, 400);
});
