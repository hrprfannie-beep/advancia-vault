# advancia-vault

Status: scaffold only. No payment processing, no deployed/live endpoints, no secrets.

## Layout
- `src/` local-only Column webhook signature verification example
- `tests/` tests, sandbox data only
- `.env.example` variable names only, no values
- `.gitignore` excludes `.env`, `*.pem`, and key files

## Rules
- Never commit API keys, webhook secrets, or passwords.
- Use sandbox credentials only until a written go-live decision is made.
- Every webhook route verifies the sender's signature before processing.
- Every change goes through a pull request.

The local webhook example verifies Column's `Column-Signature` header as an
HMAC-SHA256 of the unmodified raw request body. It binds to loopback only and
is not production-ready. Column's reviewed documentation does not specify the
signature's text encoding; the example currently assumes hex, which must be
confirmed before testing real events. See [Column's webhook documentation](https://docs.column.com/markdown/working-with-the-api/events-and-webhooks.md).
