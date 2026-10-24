# Intelligence Systems Academy

A deployable, responsive static academy interface with five six-module learning tracks, sequential unlocks, internship listings, browser-local demo login/progress, and certificate download.

## Run locally

Use Node 20 or newer:

```bash
npm start
```

Open `http://localhost:3000`. Run `npm run check` for the JavaScript syntax check and `npm run build` to validate the complete static output.

## Configure payments before launch

Edit `public/config.js` and set the course checkout URLs under `payments.links`. These values are intentionally public browser configuration, so use only provider-generated checkout links. Do not put API keys, webhook secrets, database credentials, or private tokens in this file. The current demo button is for testing the learning flow and does not verify a payment.

For real commerce, replace the demo enrolment path with a server-backed checkout session and webhook entitlement flow. The static project does not claim a payment succeeded merely because a user opened an external checkout page.

## Authentication and persistence

The login, enrolments, progress, and certificate state are explicitly browser-local demo data. Connect a real authentication provider and server/database before collecting or relying on personal data. The UI copy marks this boundary so it is not confused with production account security.

## Internship application API and storage

The internship form posts to `POST /api/applications`. The Node server validates the role, name, email, optional phone and HTTPS profile URLs, and message on the server before accepting a submission. Accepted applications are stored as JSON records outside `public/`, by default in `data/applications.json`. Set `APPLICATIONS_FILE` to a path on a private, durable writable volume in production. The data directory is excluded from Git and records are written with restrictive file permissions. There is intentionally no public endpoint for reading stored applications; review them only through authorized server access and establish an appropriate retention/deletion policy before collecting real applicants' data.

The saved application is followed by a `mailto:` draft so the applicant can notify the team by reviewing and sending the email. Saving it does not send an email. Apply rate limiting, monitoring, backups/access controls, and retention policy appropriate to the deployment before collecting real applicant data; the included demo endpoint does not provide administrator authentication, a CAPTCHA, or a production database.

## Deployment

The default `npm run build` validates static assets only. `server.js` provides local Preview, health checks, and the application API. A static-only host serving `public/` cannot persist internship applications; deploy the Node server (or implement an equivalent protected backend) and attach a durable private volume for `APPLICATIONS_FILE`. Keep `/manus-routes.json` available at the site root. If deploying to a static host, configure unknown routes to fall back to `index.html` if hash navigation is later replaced with pathname routing.

The original attachment was incomplete and contained fake Supabase, Stripe, and Razorpay placeholders plus client-side auto-enrolment after opening payment. Those unsafe behaviors were removed.
