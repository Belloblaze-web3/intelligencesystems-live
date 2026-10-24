# Intelligence Systems Academy — delivery outcomes

- [x] Responsive dark-indigo academy interface covers the five requested courses: Machine Learning, Artificial Intelligence, Data Science, Digital Marketing, and Generative AI.
- [x] Course enrollment has clear demo states persisted in the browser, with no false claim that payment succeeded when payment links are not configured.
- [x] Pricing displays international USD/INR amounts and a configurable payment handoff.
- [x] Student demo login and dashboard are clearly labeled as local demo persistence until real authentication is connected.
- [x] Every course has six modules with video, PDF, and lab resource links; later modules remain gated until prerequisites are completed.
- [x] Module completion and progress persist locally and a completed course exposes certificate preview/download.
- [x] Internship board provides responsive opportunity listings and listing-specific external mailto application links.
- [x] Deployment hardening includes route metadata, direct-route fallback guidance, production documentation, a deterministic build check, and no client-side secrets.

## Before accepting real users

1. Add provider-approved checkout URLs to `public/config.js`.
2. Replace demo enrolment with server-side payment webhook entitlements.
3. Connect the login form and progress storage to a production authentication/database service.
4. Replace the shared placeholder PDF/lesson links and mailto application destinations with authored course content and real application portals.
