# advancia-vault

Status: scaffold only. No payment processing, no deployed/live endpoints, no secrets.

## Layout
- `api/` local API-service scaffold; Column webhooks remain disabled
- `src/` local-only signature-verification prototype, not verified against Column
- `tests/` tests, sandbox data only
- `.env.example` variable names only, no values
- `.gitignore` excludes `.env`, `*.pem`, and key files

## Rules
- Never commit API keys, webhook secrets, or passwords.
- Use sandbox credentials only until a written go-live decision is made.
- Every webhook route verifies the sender's signature before processing.
- Every change goes through a pull request.

The API scaffold binds to loopback by default. Its `/health` endpoint is
available locally, while `/internal/health` fails closed unless an internal
token of at least 32 bytes is configured; the API process refuses to start
without one. The optional Compose stack includes Postgres without publishing
its port. The Column webhook route is disabled by default and stores events
only when explicitly enabled with a secret, supported encoding, and database.
Column's documentation specifies the `Column-Signature` header and HMAC-SHA256
over the unmodified raw body, but does not specify the signature encoding.
Do not enable the route until Column confirms the encoding.

The current repository has no Next.js application. No web service, bank
account listing route, or CI deployment workflow is included. See [Column's webhook documentation](https://docs.column.com/markdown/working-with-the-api/events-and-webhooks.md) and [WIRING.md](./WIRING.md).

To run the local API scaffold, install dependencies from `api/` with
`npm ci`, then run `npm start`. The API tests can be run with `npm test` from
the same directory. Tests use synthetic HMACs and do not establish
compatibility with Column's real webhook signature encoding.
