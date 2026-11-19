'use strict';

const { Pool } = require('pg');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS column_events (
  event_id     text PRIMARY KEY,
  type         text NOT NULL,
  payload      jsonb NOT NULL,
  status       text NOT NULL DEFAULT 'received',
  received_at  timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS column_events_status_idx ON column_events (status, received_at);
`;

function createStore(connectionString) {
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 3000,
  });

  return {
    init: () => pool.query(SCHEMA),
    async saveEvent(event) {
      const result = await pool.query(
        'INSERT INTO column_events (event_id, type, payload) VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING',
        [event.id, event.type, event],
      );
      return result.rowCount === 1;
    },
    close: () => pool.end(),
  };
}

module.exports = { createStore, SCHEMA };
