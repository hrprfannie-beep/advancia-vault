# Column webhook wiring

The API accepts Column webhook requests at `POST /webhooks/column`. The route
uses Express raw-body middleware so signature verification sees the exact
request bytes, then checks the configured `Column-Signature` encoding before
storing an event in Postgres.

The route returns `503` unless `COLUMN_WEBHOOK_ENABLED=true`, a signing secret
and supported encoding are configured, and the event store is available.
`COLUMN_SIGNATURE_ENCODING` supports `hex` and `base64` for local verification
tests; Column's published documentation does not confirm which encoding it
sends. Do not enable the route until Column confirms the encoding in writing
or provides an authoritative sandbox sample.

Events are stored with their full JSON payload. The `event_id` primary key
makes retries idempotent: duplicate event IDs are acknowledged without a
second insert. No event processing or money movement is performed. Apply
appropriate database access controls and retention rules before handling
real customer data.

Run API tests from `api/` with `npm test`. These tests use synthetic HMACs and
do not establish compatibility with Column's real webhook signatures.
