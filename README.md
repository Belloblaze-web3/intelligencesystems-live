# Intelligence Systems Academy

A responsive learning and internship platform with five six-module tracks, local demo progress, and a PostgreSQL-backed internship application workflow. Learning tracks are temporarily free and open without payment, sign-in, or enrolment. Applicant management is private behind the admin sign-in.

## Run and validate

Requires Node.js 20 or newer. Install dependencies with `npm ci`, then start the application with `npm start`. Open `http://localhost:3000`; the public application API and admin dashboard require a configured PostgreSQL database. The admin page is at `/admin`.

Run `npm run check` for JavaScript syntax checks and `npm run build` to verify the public assets. The Docker image runs the Node server and includes production dependencies. A static-only host cannot provide application storage, admin authentication, or notification delivery.

## Production configuration

Copy `.env.example` into your deployment's secret/configuration manager (do not commit a real `.env` file). Required settings include:

- `DATABASE_URL`: PostgreSQL connection string. The server creates/updates its application, email-outbox, and admin-session tables at startup. Use a managed PostgreSQL service with backups, TLS, access controls, and a private network where available.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`: one authorized admin account. Generate a hash without putting a plaintext password in shell history using a hidden prompt:

  ```bash
  read -r -s -p 'New admin password (14+ characters): ' ADMIN_PASSWORD; echo
  printf '%s' "$ADMIN_PASSWORD" | npm run admin:hash-password
  unset ADMIN_PASSWORD
  ```

  Store the emitted `scrypt$...` value as the `ADMIN_PASSWORD_HASH` deployment secret. Never place the password or hash in browser config or source control.
- SMTP settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Set `APPLICATION_NOTIFICATION_TO` to the team inbox; it defaults to `internships@intelligencesystems.in`. Use a provider-approved sender/domain.
- For managed PostgreSQL with TLS, set `PGSSL=true` and keep certificate validation enabled (`PGSSL_REJECT_UNAUTHORIZED=true`). Do not disable certificate validation in production.

The admin session cookie is HttpOnly, SameSite=Strict, Secure in production, and expires after eight hours. Only a SHA-256 hash of each session token is stored in PostgreSQL. Sign-in checks use a scrypt password hash, constant-time comparison, and a basic per-process attempt limiter. This is intentionally a single configured admin identity; use a managed identity/SSO provider and a centralized rate limiter for a multi-user or high-risk deployment.

## Applications and notifications

`POST /api/applications` validates submissions on the server and writes the application and its email-outbox row in one PostgreSQL transaction. The SMTP worker sends an automatic notification containing application details and retries failures with backoff. The outbox is at-least-once: a rare process/database failure after SMTP accepted a message can cause a duplicate notification. A missing SMTP configuration leaves notifications queued rather than silently discarding them.

The team reviews applications at `/admin`: search by name/email/role, filter by status, review contact and portfolio details, update status (`new`, `reviewing`, `shortlisted`, `rejected`, `hired`), add internal notes, and archive/unarchive records. There is no public API to read applicants and no hard-delete action in the dashboard. Admin notes are not included in notifications. Limit dashboard access, use HTTPS, and establish a documented retention/deletion policy before collecting real applicant data. Application notifications transmit applicant data through the configured mail provider; restrict the recipient inbox and its retention accordingly.

### Import existing file-based applications

If a previous server has a legacy `applications.json` file, copy it securely to a private path and run the idempotent importer against the production database before switching traffic:

```bash
DATABASE_URL='...' APPLICATIONS_FILE=/private/path/applications.json npm run migrate:applications
```

The import creates the applications table if needed, preserves valid IDs and submission dates, and skips IDs already present. It does not delete or modify the source JSON file. Run it over a protected connection and remove/retain the legacy file according to your data-retention policy. Do not put the real connection URL on a shared command line or in shell history; configure it as a secret in production.

## Open course access

All five learning tracks are temporarily available without checkout, login, or demo enrolment. Learners can open any module directly; completion state remains browser-local and is not a production account record. Current lesson/video/resource URLs include demo/shared materials, so review and replace them with authored curriculum before presenting the site as a complete production course. Course checkout URLs remain unused while open access is enabled.

## Other launch notes

The learner login, enrolments, progress, and certificate preview are still browser-local demo functionality. Do not treat them as production authentication, verified payment, or official credentials. For actual commerce, connect provider-generated checkout sessions and a server-side payment entitlement/webhook flow. Keep secrets out of `public/config.js` and other browser-delivered files.
