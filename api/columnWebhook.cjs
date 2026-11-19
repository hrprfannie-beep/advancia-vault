'use strict';

const crypto = require('node:crypto');

const ENCODINGS = new Set(['hex', 'base64']);

function decodeSignature(header, encoding) {
  if (typeof header !== 'string') return null;

  if (encoding === 'hex' && /^[\da-f]{64}$/i.test(header)) {
    return Buffer.from(header, 'hex');
  }

  if (encoding === 'base64') {
    const decoded = Buffer.from(header, 'base64');
    if (decoded.length === 32 && decoded.toString('base64') === header) {
      return decoded;
    }
  }

  return null;
}

function verifySignature({ rawBody, header, secret, encoding }) {
  if (!Buffer.isBuffer(rawBody) || typeof secret !== 'string' || !secret) {
    return false;
  }

  const received = decodeSignature(header, encoding);
  if (!received) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function createColumnWebhookHandler({ store, secret, encoding, enabled = false }) {
  return async (req, res) => {
    if (
      !enabled ||
      typeof secret !== 'string' ||
      !secret ||
      !ENCODINGS.has(encoding) ||
      !store ||
      typeof store.saveEvent !== 'function'
    ) {
      return res.status(503).json({ error: 'column_webhook_not_ready' });
    }

    if (!Buffer.isBuffer(req.body)) return res.sendStatus(400);

    const header = req.get('Column-Signature');
    if (!verifySignature({ rawBody: req.body, header, secret, encoding })) {
      return res.sendStatus(401);
    }

    let event;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.sendStatus(400);
    }

    if (
      !event ||
      typeof event !== 'object' ||
      Array.isArray(event) ||
      typeof event.id !== 'string' ||
      !event.id ||
      typeof event.type !== 'string' ||
      !event.type
    ) {
      return res.sendStatus(400);
    }

    try {
      const inserted = await store.saveEvent(event);
      return res.status(200).json({ received: true, duplicate: !inserted });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error(`Column webhook persistence failed: ${message}`);
      return res.sendStatus(503);
    }
  };
}

module.exports = { createColumnWebhookHandler, verifySignature };
