const http = require("node:http");
const crypto = require("node:crypto");

const PORT = process.env.PORT || 3000;
const SECRET = process.env.COLUMN_WEBHOOK_SECRET;
const SIGNATURE_HEADER = "column-signature";
const WEBHOOK_PATH = "/api/v1/column/webhook";

function verifySignature(rawBody, signature, secret) {
  if (typeof signature !== "string" || !secret || !/^[\da-f]{64}$/i.test(signature)) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function createHandler(secret) {
  return (req, res) => {
    if (req.method !== "POST" || req.url !== WEBHOOK_PATH) {
      res.writeHead(404).end();
      return;
    }

    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks);
      if (!verifySignature(rawBody, req.headers[SIGNATURE_HEADER], secret)) {
        console.warn(JSON.stringify({ event: "rejected", reason: "bad_signature" }));
        res.writeHead(401).end();
        return;
      }

      let payload;
      try {
        payload = JSON.parse(rawBody.toString("utf8"));
      } catch {
        res.writeHead(400).end();
        return;
      }

      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        res.writeHead(400).end();
        return;
      }

      console.log(JSON.stringify({ event: "received", id: payload.id, type: payload.type }));
      res.writeHead(200).end();
    });
  };
}

if (require.main === module) {
  if (!SECRET) {
    console.error("COLUMN_WEBHOOK_SECRET is not set");
    process.exit(1);
  }

  http.createServer(createHandler(SECRET)).listen(PORT, "127.0.0.1", () => {
    console.log(`listening on 127.0.0.1:${PORT}`);
  });
}

module.exports = { verifySignature, createHandler };
