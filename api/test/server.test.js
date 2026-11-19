import assert from "node:assert/strict";
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

test("Column webhook remains disabled until verified and processing is implemented", async () => {
  const response = await fetch(`${baseUrl}/webhooks/column`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "evt_test_only", type: "test.event" }),
  });
  assert.equal(response.status, 503);
});
