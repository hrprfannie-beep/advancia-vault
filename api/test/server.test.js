import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, test } from "node:test";
import { createApp, validateInternalToken } from "../server.js";

let server;
let baseUrl;

before(async () => {
  server = createApp({}).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("health endpoint is public", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("startup rejects a missing internal token", () => {
  assert.throws(() => validateInternalToken(undefined), /INTERNAL_TOKEN missing or too short/);
});

test("startup rejects an internal token shorter than 32 bytes", () => {
  assert.throws(() => validateInternalToken("too-short"), /INTERNAL_TOKEN missing or too short/);
});

test("startup accepts an internal token of at least 32 bytes", () => {
  assert.doesNotThrow(() => validateInternalToken("a".repeat(32)));
});

test("internal endpoint fails closed when token is not configured", async () => {
  const response = await fetch(`${baseUrl}/internal/health`);
  assert.equal(response.status, 503);
});

test("internal endpoint rejects requests without the token", async () => {
  const app = createApp({ INTERNAL_TOKEN: "test-internal-token" });
  const protectedServer = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => protectedServer.once("listening", resolve));

  try {
    const response = await fetch(
      `http://127.0.0.1:${protectedServer.address().port}/internal/health`,
    );
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve, reject) => {
      protectedServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("internal endpoint accepts the configured token", async () => {
  const app = createApp({ INTERNAL_TOKEN: "test-internal-token" });
  const protectedServer = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => protectedServer.once("listening", resolve));

  try {
    const response = await fetch(
      `http://127.0.0.1:${protectedServer.address().port}/internal/health`,
      { headers: { "x-internal-token": "test-internal-token" } },
    );
    assert.equal(response.status, 200);
  } finally {
    await new Promise((resolve, reject) => {
      protectedServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("Column webhook remains disabled unless explicitly enabled", async () => {
  const response = await fetch(`${baseUrl}/webhooks/column`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "evt_test_only", type: "test.event" }),
  });
  assert.equal(response.status, 503);
});

test("wired Column webhook verifies the raw request body before storing", async () => {
  const secret = "test-webhook-secret";
  const rawBody = Buffer.from(JSON.stringify({ id: "evt_route_test", type: "test.event" }));
  const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const savedEvents = [];
  const app = createApp(
    {
      COLUMN_WEBHOOK_ENABLED: "true",
      COLUMN_WEBHOOK_SECRET: secret,
      COLUMN_SIGNATURE_ENCODING: "hex",
    },
    {
      saveEvent: async (event) => {
        savedEvents.push(event);
        return true;
      },
    },
  );
  const webhookServer = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => webhookServer.once("listening", resolve));

  try {
    const response = await fetch(
      `http://127.0.0.1:${webhookServer.address().port}/webhooks/column`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Column-Signature": signature,
        },
        body: rawBody,
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true, duplicate: false });
    assert.deepEqual(savedEvents, [{ id: "evt_route_test", type: "test.event" }]);
  } finally {
    await new Promise((resolve, reject) => {
      webhookServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
