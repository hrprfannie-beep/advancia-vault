# advancia-vault

Status: scaffold only. No payment processing, no live endpoints, no secrets.

## Layout
- `src/` application code (empty until reviewed)
- `tests/` tests, sandbox data only
- `.env.example` variable names only, no values
- `.gitignore` excludes `.env`, `*.pem`, and key files

## Rules
- Never commit API keys, webhook secrets, or passwords.
- Use sandbox credentials only until a written go-live decision is made.
- Every webhook route verifies the sender's signature before processing.
- Every change goes through a pull request.
