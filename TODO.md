# Intelligence Systems Academy — delivery outcomes

- [x] Import the existing implementation from `https://github.com/Belloblaze-web3/intelligencesystems-live` into this managed website project without replacing its implementation.
- [ ] Publish the responsive static academy interface with five learning tracks—Machine Learning, Artificial Intelligence, Data Science, Digital Marketing, and Generative AI—each containing six modules.
- [x] Preserve sequential module unlocking according to completed prerequisites.
- [x] Preserve internship listings and provide a clickable role-specific application action plus a form with applicant name, email, optional phone/portfolio, and a message. Submission prepares an email draft to the existing internship contact; the applicant must send it, and the site does not store or submit applications automatically.
- [x] Preserve browser-local demo login, enrolments, learning progress, and certificate preview/download behavior; do not imply demo login or demo enrolment is production authentication or a successful payment.
- [x] Include the actual generated hero and five course illustration WebP files in the repository, update references to repository-relative paths, and serve WebP with the correct MIME type.
- [x] Preview the updated site locally; the homepage, four-route manifest, internship board, and all six image files were verified, and the first role-specific application form opened with its role prefilled.
- [ ] Publish the latest managed-site checkpoint so the updates appear online.
- [x] Implement external checkout handoff for provider-generated HTTPS links; opening a link alone does not grant enrolment or claim successful payment.
- [ ] Configure actual provider-generated checkout URLs for the five course tracks and the bundle; the required link values have not been supplied.
- [x] Update checkout messaging to state that checkout is unavailable and demo enrolment is local-only while provider URLs are blank.
- [x] Run the existing syntax and static-build checks successfully.

## Repository's documented launch boundary

- [ ] Before accepting real users, add provider-approved checkout URLs to `public/config.js`, replace demo enrolment with server-side payment webhook entitlements, and connect login and progress storage to a production authentication/database service.
- [ ] Before representing course content or application destinations as production-ready, replace shared placeholder PDF/lesson links and `mailto:` internship destinations with authored course content, real application portals, and production application submission storage as needed.
