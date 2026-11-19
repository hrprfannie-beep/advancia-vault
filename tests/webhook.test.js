const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const crypto = require("node:crypto");
const { createHandler, verifySignature } = require("../src/server");

const SECRET = "test-secret-not-real";
const body = JSON.stringify({ id: "evt_test_1", type: "transfer.completed" });
const signature = crypto.createHmac("sha256", SECRET).update(body).digest("hex");

function post(port, headers, payload) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/api/v1/column/webhook",
        method: "POST",
        headers,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", reject);
    req.end(payload);
  });
}

async function withServer(fn) {
  const server = http.createServer(createHandler(SECRET));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await fn(server.address().port);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("accepts a valid signature", async () => {
  await withServer(async (port) => {
    const status = await post(port, { "Column-Signature": signature }, body);
    assert.equal(status, 200);
  });
});

test("rejects a missing signature", async () => {
  await withServer(async (port) => {
    assert.equal(await post(port, {}, body), 401);
  });
});

test("rejects a wrong signature", async () => {
  await withServer(async (port) => {
    assert.equal(await post(port, { "Column-Signature": "00" }, body), 401);
  });
});

test("rejects a tampered body", async () => {
  await withServer(async (port) => {
    const tampered = body.replace("evt_test_1", "evt_test_2");
    assert.equal(await post(port, { "Column-Signature": signature }, tampered), 401);
  });
});

test("verifySignature returns false for empty inputs", () => {
  assert.equal(verifySignature(Buffer.from(body), undefined, SECRET), false);
  assert.equal(verifySignature(Buffer.from(body), signature, undefined), false);
});
