import crypto from "node:crypto";
import express from "express";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "127.0.0.1";
const require = createRequire(import.meta.url);
const { createColumnWebhookHandler } = require("./columnWebhook.cjs");
const { createStore } = require("./db.cjs");

export function validateInternalToken(token) {
  if (typeof token !== "string" || Buffer.byteLength(token, "utf8") < 32) {
    throw new Error("INTERNAL_TOKEN missing or too short");
  }
}

function tokensMatch(expected, provided) {
  if (typeof provided !== "string") {
    return false;
  }

  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return (
    expectedBytes.length === providedBytes.length &&
    crypto.timingSafeEqual(expectedBytes, providedBytes)
  );
}

function requireInternalToken(env) {
  return (req, res, next) => {
    const expected = env.INTERNAL_TOKEN;
    if (!expected) {
      res.status(503).json({ error: "internal_auth_not_configured" });
      return;
    }

    if (!tokensMatch(expected, req.get("x-internal-token"))) {
      res.sendStatus(401);
      return;
    }

    next();
  };
}

export function createApp(env = process.env, store = null) {
  const app = express();
  app.disable("x-powered-by");

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/internal/health", requireInternalToken(env), (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.post(
    "/webhooks/column",
    express.raw({ type: "application/json", limit: "1mb" }),
    createColumnWebhookHandler({
      store,
      secret: env.COLUMN_WEBHOOK_SECRET,
      encoding: env.COLUMN_SIGNATURE_ENCODING,
      enabled: env.COLUMN_WEBHOOK_ENABLED === "true",
    }),
  );

  return app;
}

async function startApi() {
  const env = process.env;
  validateInternalToken(env.INTERNAL_TOKEN);

  let store = null;
  if (env.DATABASE_URL) {
    store = createStore(env.DATABASE_URL);
    await store.init();
  }

  return createApp(env, store).listen(PORT, HOST, () => {
    console.log(`API listening on ${HOST}:${PORT}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await startApi();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown startup error";
    console.error(`API startup failed: ${message}`);
    process.exitCode = 1;
  }
}
