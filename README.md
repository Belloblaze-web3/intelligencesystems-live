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

## Deployment

The managed deployment is configured as a static build from `public/` using the no-dependency `npm run build` validation command; `server.js` is used for local Preview and health checks. If deploying to a static host, publish the `public/` directory and configure unknown routes to fall back to `index.html` if hash navigation is later replaced with pathname routing. Keep `/manus-routes.json` available at the site root. Internship listings use listing-specific `mailto:` application URLs; replace them with real external application portals before launch if desired.

The original attachment was incomplete and contained fake Supabase, Stripe, and Razorpay placeholders plus client-side auto-enrolment after opening payment. Those unsafe behaviors were removed.
