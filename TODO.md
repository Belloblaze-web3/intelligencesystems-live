# Intelligence Systems Academy — delivery outcomes

- [x] Maintain five six-module learning tracks and make every course/module temporarily free and open without login, enrolment, or checkout.
- [x] Keep learner demo identity, progress, and certificate previews clearly browser-local; this is not production account data or an official credential.
- [x] Keep role-specific internship listings and applicant form with client/server validation for required and optional fields.
- [x] Replace file-backed application storage with PostgreSQL transactions, an idempotent importer for legacy JSON records, and database-backed expiring admin sessions.
- [x] Add a restricted admin dashboard for searching/filtering, paginating, reviewing, setting status, adding internal notes, and archiving/unarchiving applications.
- [x] Add transactional notification-outbox records and retry/backoff SMTP delivery for new applications.
- [x] Keep applicant data out of `public/`, Git, browser configuration, and repository secrets.
- [x] Add Docker runtime setup, example environment configuration, hash generation helper, and operations documentation.
- [x] Run syntax/build checks, dependency audit, admin hash-format check, and route smoke tests without a database configured.
- [ ] Configure production `DATABASE_URL`, admin email/password hash, SMTP credentials/sender, and team notification recipient in deployment secrets.
- [ ] Deploy the dynamic Node service with managed PostgreSQL backups/TLS/access controls and operational monitoring; static-only hosting cannot provide the application/admin APIs.
- [ ] If prior applications exist in a private JSON file, securely import them with `npm run migrate:applications` before switching service traffic.
- [ ] Review applicant-data retention, notification mailbox access, and deletion process before accepting production applications.
- [ ] Replace shared demo lesson/video/PDF/resource links with authored curriculum before describing the courses as finished production content.
- [ ] Revisit whether and when to restore course pricing/enrolment restrictions; open access is temporary.
