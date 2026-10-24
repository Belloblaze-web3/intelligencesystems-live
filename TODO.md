# Intelligence Systems Academy — delivery outcomes

- [x] Import the existing implementation from `https://github.com/Belloblaze-web3/intelligencesystems-live` into this managed website project without replacing its implementation.
- [ ] Preserve and publish the existing responsive static academy interface, presenting five learning tracks: Machine Learning, Artificial Intelligence, Data Science, Digital Marketing, and Generative AI; each track contains six modules.
- [x] Preserve the repository's existing learning-flow logic that enforces sequential module unlocking according to completed prerequisites.
- [x] Preserve the existing internship listings experience, including listing-specific application links.
- [x] Preserve browser-local demo login, enrolments, learning progress, and certificate state; do not imply that demo login is production authentication.
- [x] Preserve the existing certificate preview/download behavior after a course is completed.
- [ ] Add one course-specific graphical illustration to each of the five course experiences: Machine Learning should clearly depict a learning machine/system; Artificial Intelligence should emphasize automation; the other illustrations should represent Data Science, Digital Marketing, and Generative AI. Retain the existing Academy visual style. The five generated image URLs are wired into the course cards while image generation completes.
- [ ] Add a home-page background image showing students of different races around a globe, integrated into the existing hero while keeping its text legible.
- [ ] Use provider-generated course checkout URLs configured before launch; opening a checkout link must not be treated or displayed as a successful payment. Do not add or imply a payment provider configuration not supplied by the user. The repository currently has blank checkout URL values for all five tracks and the bundle.
- [ ] Build and deploy the repository as a publicly accessible website, resolving only issues required for successful publication while preserving the implementation. The existing syntax/static-build checks pass; publication awaits launch readiness.

## Repository's documented launch boundary

- [ ] Before accepting real users, add provider-approved checkout URLs to `public/config.js`, replace demo enrolment with server-side payment webhook entitlements, and connect login and progress storage to a production authentication/database service.
- [ ] Before representing course content or application destinations as production-ready, replace shared placeholder PDF/lesson links and `mailto:` internship destinations with authored course content and real application portals.
