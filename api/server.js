import crypto from "node:crypto";
import express from "express";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "127.0.0.1";

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

export function createApp(env = process.env) {
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
    express.raw({ type: "*/*", limit: "1mb" }),
    (_req, res) => {
      res.status(503).json({ error: "column_webhook_not_ready" });
    },
  );

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    validateInternalToken(process.env.INTERNAL_TOKEN);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  createApp().listen(PORT, HOST, () => {
    console.log(`API listening on ${HOST}:${PORT}`);
  });
}
