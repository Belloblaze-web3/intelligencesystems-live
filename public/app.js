(() => {
  'use strict';

  const config = window.ACADEMY_CONFIG || { payments: { links: {} } };
  const storeKeys = { user: 'isa_demo_user_v1', enrolled: 'isa_demo_enrolled_v1', progress: 'isa_demo_progress_v1' };
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const state = { user: read(storeKeys.user, null), enrolled: read(storeKeys.enrolled, []), progress: read(storeKeys.progress, {}), activeFilter: 'All', selectedCourse: null, selectedModule: null };

  const courseSeeds = [
    { id: 1, title: 'Machine Learning', short: 'ML', description: 'From clean data to deployable prediction systems.', accent: '#8e7dff', modules: ['Python & ML foundations', 'Data preprocessing & EDA', 'Supervised learning', 'Unsupervised learning', 'Practical lab: real-estate prediction', 'Capstone: ML pipeline'] },
    { id: 2, title: 'Artificial Intelligence', short: 'AI', description: 'Reasoning, neural networks and agentic problem solving.', accent: '#65d6ff', modules: ['AI foundations', 'Knowledge & reasoning', 'Neural networks', 'Computer vision', 'Practical lab: chatbot', 'Capstone: AI agent'] },
    { id: 3, title: 'Data Science', short: 'DS', description: 'Python, SQL and analytics for business decisions.', accent: '#b8f57a', modules: ['Python for data science', 'Statistics & EDA', 'SQL & data wrangling', 'Visualization & dashboards', 'Practical lab: sales dashboard', 'Capstone: business case'] },
    { id: 4, title: 'Digital Marketing', short: 'DM', description: 'SEO, paid acquisition and measurable growth loops.', accent: '#ffb86b', modules: ['SEO fundamentals', 'Social media systems', 'Google Ads', 'Email automation', 'Practical lab: live campaign', 'Capstone: brand growth'] },
    { id: 5, title: 'Generative AI', short: 'GEN', description: 'LLMs, prompting, retrieval and product deployment.', accent: '#ff83cf', modules: ['LLM foundations', 'Prompt engineering', 'LangChain & RAG', 'Image generation', 'Practical lab: AI assistant', 'Capstone: GenAI SaaS'] }
  ];
  const courseIllustrations = {
    1: { src: '/course-illustrations/machine-learning.webp', alt: 'A learning machine adapting to incoming data patterns' },
    2: { src: '/course-illustrations/artificial-intelligence.webp', alt: 'An AI robotic system automating connected tasks' },
    3: { src: '/course-illustrations/data-science.webp', alt: 'Data structures revealing patterns and insights' },
    4: { src: '/course-illustrations/digital-marketing.webp', alt: 'A digital campaign reaching a connected audience' },
    5: { src: '/course-illustrations/generative-ai.webp', alt: 'Generative AI transforming a network into a new creation' }
  };
  const videoIds = ['7eh4d6sabA0', 'ukzFI9rgwfU', '7eh4d6sabA0', 'ukzFI9rgwfU', '7eh4d6sabA0', '7eh4d6sabA0'];
  const courses = courseSeeds.map(course => ({ ...course, modules: course.modules.map((title, index) => ({ title, description: ['Concepts, setup and your first working system.', 'Turn messy inputs into useful signals.', 'Build and evaluate a supervised solution.', 'Find structure without labels.', 'A focused, real-world implementation sprint.', 'Ship an end-to-end portfolio project.'][index], video: `https://www.youtube.com/embed/${videoIds[index]}?rel=0`, pdf: `/resources/module-guide.pdf#page=${index + 1}`, lab: `https://colab.research.google.com/?course=${encodeURIComponent(course.title)}&module=${index + 1}` })) }));
  const internships = [
    { title: 'ML Intern', company: 'IS Labs', course: 'Machine Learning', duration: '3 months', stipend: '$150 / ₹12k', type: 'Remote', applyUrl: 'mailto:internships@intelligencesystems.in?subject=ML%20Intern%20application' },
    { title: 'AI Research Intern', company: 'IS Research', course: 'Artificial Intelligence', duration: '2 months', stipend: '$200', type: 'Remote', applyUrl: 'mailto:internships@intelligencesystems.in?subject=AI%20Research%20Intern%20application' },
    { title: 'Data Science Intern', company: 'DataLabs', course: 'Data Science', duration: '3 months', stipend: '$180', type: 'Hybrid', applyUrl: 'mailto:internships@intelligencesystems.in?subject=Data%20Science%20Intern%20application' },
    { title: 'Digital Marketing Intern', company: 'IS Growth', course: 'Digital Marketing', duration: '2 months', stipend: '$120', type: 'Remote', applyUrl: 'mailto:internships@intelligencesystems.in?subject=Digital%20Marketing%20Intern%20application' },
    { title: 'GenAI Intern', company: 'IS GenAI Lab', course: 'Generative AI', duration: '3 months', stipend: '$250', type: 'Remote', applyUrl: 'mailto:internships@intelligencesystems.in?subject=GenAI%20Intern%20application' }
  ];

  const $ = id => document.getElementById(id);
  const save = () => { localStorage.setItem(storeKeys.user, JSON.stringify(state.user)); localStorage.setItem(storeKeys.enrolled, JSON.stringify(state.enrolled)); localStorage.setItem(storeKeys.progress, JSON.stringify(state.progress)); };
  const toast = message => { const el = $('toast'); el.textContent = message; el.classList.add('show'); window.clearTimeout(toast.timer); toast.timer = window.setTimeout(() => el.classList.remove('show'), 3200); };
  const courseById = id => courses.find(course => course.id === Number(id));
  const completed = id => Array.isArray(state.progress[id]) ? state.progress[id] : [];
  const isUnlocked = (id, index) => index === 0 || completed(id).includes(index - 1);
  const openDialog = id => $(id).showModal();
  const closeDialog = id => $(id).close();
  function createCourseIllustration(course) {
    const visual = document.createElement('div');
    visual.className = 'course-visual';
    const image = document.createElement('img');
    image.src = courseIllustrations[course.id].src;
    image.alt = courseIllustrations[course.id].alt;
    image.loading = 'lazy';
    image.decoding = 'async';
    visual.append(image);
    return visual;
  }

  function navigate(view) {
    const valid = ['home', 'courses', 'dashboard', 'internships'];
    const next = valid.includes(view) ? view : 'home';
    valid.forEach(name => { const el = $(`${name}View`); if (el) el.hidden = name !== next; });
    document.querySelectorAll('[data-view]').forEach(link => link.classList.toggle('active', link.dataset.view === next));
    if (next === 'courses') renderCourses();
    if (next === 'dashboard') renderDashboard();
    if (next === 'internships') renderInternships();
    history.replaceState(null, '', `#${next}`);
    $('primaryNav').classList.remove('open');
  }

  function renderCourses() {
    $('courseGrid').innerHTML = courses.map(course => `<article class="course-card" data-course-id="${course.id}" style="--accent:${course.accent}" tabindex="0" role="button" aria-label="View ${course.title} course">
      <div class="course-top"><span class="course-index">0${course.id} / 05</span><span class="course-icon">${course.short}</span></div>
      <h3>${course.title}</h3><p>${course.description}</p>
      <div class="course-footer"><span>6 modules · $25 / ₹2,099</span><span>↗</span></div></article>`).join('');
    courses.forEach(course => document.querySelector(`[data-course-id="${course.id}"]`).prepend(createCourseIllustration(course)));
    document.querySelectorAll('[data-course-id]').forEach(card => { card.addEventListener('click', () => showCourse(Number(card.dataset.courseId))); card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') showCourse(Number(card.dataset.courseId)); }); });
  }

  function getCheckoutUrl(id) {
    const value = config.payments?.links?.[id];
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value.trim());
      return url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  }

  function showCourse(id) {
    const course = courseById(id); state.selectedCourse = id;
    const checkoutUrl = getCheckoutUrl(id);
    const hasPayment = Boolean(checkoutUrl);
    const rows = course.modules.map((module, index) => `<div class="module-row"><span class="module-number" style="--accent:${course.accent}">${index + 1}</span><div><strong>${module.title}</strong><small>${module.description}</small></div></div>`).join('');
    $('courseDialogContent').innerHTML = `<div class="course-dialog-inner" style="--accent:${course.accent}"><span class="dialog-kicker">Track 0${course.id} · six modules</span><h2>${course.title}</h2><p>${course.description}</p><div class="module-list">${rows}</div><div class="enrol-actions"><span class="price-pill">$25 <small class="muted">/ ₹2,099</small></span>${hasPayment ? `<a class="button button-primary" href="${checkoutUrl}" target="_blank" rel="noopener noreferrer">Continue to checkout <span>↗</span></a><button class="button button-outline" id="demoEnrollButton" type="button">Demo enrolment</button>` : `<button class="button button-outline" id="demoEnrollButton" type="button">Demo enrolment</button>`}</div>${hasPayment ? '<p class="form-note">Checkout opens the provider page. This demo does not verify payment or grant access from a checkout return. Demo enrolment saves local preview progress only.</p>' : '<div class="notice">Checkout is not available yet. Add provider-generated HTTPS URLs to <code>public/config.js</code>. Demo enrolment saves local preview progress only and does not process or verify payment.</div>'}</div>`;
    $('demoEnrollButton').addEventListener('click', () => demoEnroll(id));
    openDialog('courseDialog');
  }

  function demoEnroll(id) {
    if (!state.enrolled.includes(id)) { state.enrolled.push(id); state.progress[id] = []; save(); toast('Demo enrolment added to your dashboard.'); }
    closeDialog('courseDialog'); navigate('dashboard');
  }

  function renderDashboard() {
    const empty = $('dashboardEmpty'); const content = $('dashboardContent');
    if (!state.user || !state.enrolled.length) { empty.hidden = false; content.hidden = true; return; }
    empty.hidden = true; content.hidden = false;
    content.innerHTML = `<div class="dashboard-welcome"><p class="eyebrow">Signed in as ${escapeHtml(state.user.email)}</p><h3 style="font:600 31px var(--display);letter-spacing:-.05em;margin:0 0 22px">Good to see you, <em style="color:var(--cyan);font-style:normal">${escapeHtml(state.user.name.split(' ')[0])}.</em></h3></div>${state.enrolled.map(renderDashboardCourse).join('')}`;
    content.querySelectorAll('[data-module]').forEach(button => button.addEventListener('click', () => showModule(Number(button.dataset.course), Number(button.dataset.module))));
    content.querySelectorAll('[data-certificate]').forEach(button => button.addEventListener('click', () => downloadCertificate(Number(button.dataset.certificate))));
  }

  function renderDashboardCourse(id) {
    const course = courseById(id); if (!course) return ''; const done = completed(id); const percent = Math.round(done.length / course.modules.length * 100);
    const modules = course.modules.map((module, index) => { const finished = done.includes(index); const unlocked = isUnlocked(id, index); return `<button class="dash-module ${finished ? 'done' : ''}" data-course="${id}" data-module="${index}" type="button" ${unlocked ? '' : 'disabled'}><span class="dash-module-num">${finished ? '✓' : index + 1}</span><span><strong>${module.title}</strong><small>${unlocked ? (finished ? 'Completed · open again' : 'Open module') : 'Locked · finish the previous module'}</small></span></button>`; }).join('');
    const certificate = percent === 100 ? `<div class="certificate"><p class="eyebrow">Track complete</p><h4>Certificate ready, ${escapeHtml(state.user.name)}.</h4><p>You completed the ${course.title} learning path in demo mode.</p><button class="button button-primary" data-certificate="${id}" type="button">Download certificate <span>↓</span></button></div>` : '';
    return `<article class="dashboard-card"><div class="dashboard-card-head"><div><p class="eyebrow" style="color:${course.accent}">Track 0${course.id}</p><h3>${course.title}</h3></div><span class="progress-label">${percent}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div><div class="dashboard-modules">${modules}</div>${certificate}</article>`;
  }

  function showModule(courseId, index) {
    const course = courseById(courseId); const module = course?.modules[index]; if (!course || !module) return;
    if (!isUnlocked(courseId, index)) { toast('Finish the previous module to unlock this one.'); return; }
    state.selectedCourse = courseId; state.selectedModule = index;
    const done = completed(courseId).includes(index);
    $('moduleDialogContent').innerHTML = `<div class="module-inner"><span class="dialog-kicker" style="color:${course.accent}">${course.title} · module ${index + 1} of 6</span><h2>${module.title}</h2><p class="muted">${module.description}</p><div class="module-meta"><span class="tag">Video lesson</span><span class="tag">PDF guide</span><span class="tag">Hands-on lab</span></div><iframe class="video-frame" src="${module.video}" title="${module.title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><div class="resource-row"><a href="${module.pdf}" target="_blank" rel="noopener">↗ Open PDF guide</a><a href="${module.lab}" target="_blank" rel="noopener">↗ Open Colab lab</a></div><button class="button button-primary module-complete" id="completeModule" type="button">${done ? 'Completed · mark again' : 'Mark complete & unlock next'} <span>→</span></button></div>`;
    $('completeModule').addEventListener('click', () => completeModule(courseId, index)); openDialog('moduleDialog');
  }

  function completeModule(courseId, index) {
    const items = completed(courseId); if (!items.includes(index)) items.push(index); items.sort((a, b) => a - b); state.progress[courseId] = items; save(); closeDialog('moduleDialog'); renderDashboard(); toast(index === 5 ? 'Track complete — your certificate is ready.' : 'Module complete — the next module is unlocked.');
  }

  function renderInternships() {
    const types = ['All', ...new Set(internships.map(item => item.type))]; $('internshipFilters').innerHTML = types.map(type => `<button class="filter-button ${state.activeFilter === type ? 'active' : ''}" type="button" data-filter="${type}">${type}</button>`).join('');
    $('internshipGrid').innerHTML = internships.filter(item => state.activeFilter === 'All' || item.type === state.activeFilter).map(item => `<article class="intern-card"><div><p class="eyebrow" style="color:var(--lime)">${item.course}</p><h3>${item.title}</h3><p>${item.company} · ${item.duration} · ${item.stipend}</p><div class="intern-tags"><span>${item.type}</span><span>Portfolio preferred</span></div></div><a href="${item.applyUrl}" data-apply-title="${escapeHtml(item.title)}" aria-label="Apply for ${escapeHtml(item.title)}">Apply →</a></article>`).join('');
    document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { state.activeFilter = button.dataset.filter; renderInternships(); }));
    document.querySelectorAll('[data-apply-title]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); openApplication(link.dataset.applyTitle); }));
  }

  function openApplication(title) {
    const listing = internships.find(item => item.title === title);
    if (!listing) return;
    $('applicationRole').value = listing.title;
    openDialog('applicationDialog');
  }

  function openAuth() { $('authName').value = state.user?.name || ''; $('authEmail').value = state.user?.email || ''; openDialog('authDialog'); }
  function updateAuthButton() { $('authButton').textContent = state.user ? `Hi, ${state.user.name.split(' ')[0]}` : 'Log in'; }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
  function downloadCertificate(id) { const course = courseById(id); const safeName = escapeHtml(state.user?.name || 'Student'); const serial = `ISA-${id}-${new Date().getFullYear()}-${String(state.user?.email || 'demo').replace(/\W/g, '').slice(0, 7).toUpperCase()}`; const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850"><rect width="1200" height="850" fill="#080c28"/><rect x="35" y="35" width="1130" height="780" rx="18" fill="none" stroke="#b8f57a" stroke-width="3"/><rect x="55" y="55" width="1090" height="740" rx="12" fill="none" stroke="#65d6ff" stroke-opacity=".45"/><circle cx="600" cy="210" r="55" fill="#7067ff" fill-opacity=".3" stroke="#65d6ff" stroke-width="2"/><text x="600" y="225" text-anchor="middle" fill="#b8f57a" font-family="sans-serif" font-size="48">✦</text><text x="600" y="325" text-anchor="middle" fill="#65d6ff" font-family="sans-serif" font-size="24" letter-spacing="8">INTELLIGENCE SYSTEMS</text><text x="600" y="400" text-anchor="middle" fill="#f4f6ff" font-family="sans-serif" font-size="52" font-weight="bold">CERTIFICATE OF COMPLETION</text><text x="600" y="475" text-anchor="middle" fill="#8b95bd" font-family="sans-serif" font-size="22">This certifies that</text><text x="600" y="540" text-anchor="middle" fill="#b8f57a" font-family="sans-serif" font-size="38" font-weight="bold">${safeName}</text><text x="600" y="592" text-anchor="middle" fill="#8b95bd" font-family="sans-serif" font-size="22">has completed the ${escapeHtml(course.title)} learning path</text><text x="600" y="700" text-anchor="middle" fill="#8b95bd" font-family="sans-serif" font-size="14">${serial} · ${new Date().toLocaleDateString()}</text></svg>`; const blob = new Blob([svg], { type: 'image/svg+xml' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${course.title.toLowerCase().replace(/\s+/g, '-')}-certificate.svg`; link.click(); URL.revokeObjectURL(url); toast('Certificate downloaded.'); }

  $('authButton').addEventListener('click', openAuth);
  $('authForm').addEventListener('submit', event => { event.preventDefault(); state.user = { name: $('authName').value.trim(), email: $('authEmail').value.trim() }; save(); updateAuthButton(); closeDialog('authDialog'); navigate('dashboard'); toast('Demo session started.'); });
  $('applicationForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    const originalLabel = submitButton.innerHTML;
    submitButton.textContent = 'Saving application…';
    const values = new FormData(event.currentTarget);
    const role = String(values.get('role') || 'Internship').trim();
    const body = [
      `Role: ${role}`,
      `Name: ${String(values.get('name') || '').trim()}`,
      `Email: ${String(values.get('email') || '').trim()}`,
      `Phone: ${String(values.get('phone') || '').trim() || 'Not provided'}`,
      `Portfolio or resume: ${String(values.get('portfolio') || '').trim() || 'Not provided'}`,
      `LinkedIn profile: ${String(values.get('linkedin') || '').trim() || 'Not provided'}`,
      '',
      'Message:',
      String(values.get('message') || '').trim()
    ].join('\n');
    const application = Object.fromEntries(values.entries());
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(application)
      });
      const result = await response.json();
      if (!response.ok) {
        const fieldErrors = result.fields ? Object.entries(result.fields).map(([field, message]) => `${field}: ${message}`).join(' ') : result.error;
        throw new Error(fieldErrors || 'The application could not be saved.');
      }
      const subject = encodeURIComponent(`Internship application: ${role}`);
      window.location.href = `mailto:internships@intelligencesystems.in?subject=${subject}&body=${encodeURIComponent(body)}`;
      toast('Application saved on this server. Review and send the email draft to notify the team.');
    } catch (error) {
      toast(error.message || 'Could not save your application. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalLabel;
    }
  });
  document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', event => { const view = link.dataset.view; if (view) { event.preventDefault(); navigate(view); } }));
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => closeDialog(button.dataset.closeDialog)));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  $('mobileMenu').addEventListener('click', () => { const nav = $('primaryNav'); const open = nav.classList.toggle('open'); $('mobileMenu').setAttribute('aria-expanded', String(open)); });
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'home'));
  updateAuthButton(); navigate(location.hash.slice(1) || 'home');
})();
