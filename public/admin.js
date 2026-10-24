(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { applications: [], busy: false, timer: null, offset: 0, limit: 200 };
  const loginPanel = $('loginPanel');
  const dashboardPanel = $('dashboardPanel');
  const loginError = $('loginError');
  const message = $('dashboardMessage');
  function setMessage(text) { message.textContent = text || ''; }
  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }
  function showDashboard(email) {
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;
    $('logoutButton').hidden = false;
    $('signedInAs').textContent = `Signed in as ${email}`;
    loadApplications();
  }
  function showLogin() {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    $('logoutButton').hidden = true;
  }
  function linkOrText(value, label) {
    const dd = document.createElement('dd');
    if (value) {
      const anchor = document.createElement('a');
      anchor.href = value;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = label || value;
      dd.append(anchor);
    } else dd.textContent = 'Not provided';
    return dd;
  }
  function addDetail(dl, label, value, options = {}) {
    const wrap = document.createElement('div');
    if (options.wide) wrap.className = 'wide';
    const dt = document.createElement('dt'); dt.textContent = label;
    wrap.append(dt, options.url ? linkOrText(value, options.urlLabel) : Object.assign(document.createElement('dd'), { textContent: value || 'Not provided' }));
    dl.append(wrap);
  }
  function render() {
    const list = $('applicationList');
    list.replaceChildren();
    if (!state.applications.length) {
      const empty = document.createElement('div'); empty.className = 'panel empty-applications'; empty.textContent = 'No applications match these filters.'; list.append(empty); return;
    }
    state.applications.forEach(application => {
      const card = document.createElement('article'); card.className = 'panel application-review';
      const head = document.createElement('div'); head.className = 'review-head';
      const identity = document.createElement('div');
      const title = document.createElement('h2'); title.textContent = application.name;
      const subtitle = document.createElement('div'); subtitle.className = 'review-subtitle'; subtitle.textContent = `${application.role} · ${application.email}`;
      identity.append(title, subtitle);
      const date = document.createElement('time'); date.className = 'review-date'; date.dateTime = application.submitted_at; date.textContent = new Date(application.submitted_at).toLocaleString();
      head.append(identity, date);
      const tags = document.createElement('div'); tags.className = 'review-tags';
      const statusTag = document.createElement('span'); statusTag.textContent = application.status;
      const archiveTag = document.createElement('span'); archiveTag.textContent = application.archived ? 'Archived' : 'Active';
      tags.append(statusTag, archiveTag);
      const details = document.createElement('dl'); details.className = 'review-content';
      addDetail(details, 'Email', application.email);
      addDetail(details, 'Phone', application.phone);
      addDetail(details, 'Portfolio / resume', application.portfolio, { url: true });
      addDetail(details, 'LinkedIn', application.linkedin, { url: true });
      addDetail(details, 'Applicant message', application.message, { wide: true });
      const controls = document.createElement('div'); controls.className = 'review-controls';
      const statusLabel = document.createElement('label'); statusLabel.textContent = 'Application status';
      const statusSelect = document.createElement('select');
      [['new','New'],['reviewing','Reviewing'],['shortlisted','Shortlisted'],['rejected','Rejected'],['hired','Hired']].forEach(([value,label]) => { const option = document.createElement('option'); option.value = value; option.textContent = label; option.selected = value === application.status; statusSelect.append(option); });
      statusLabel.append(statusSelect);
      const notesLabel = document.createElement('label'); notesLabel.textContent = 'Internal notes';
      const notes = document.createElement('textarea'); notes.maxLength = 4000; notes.placeholder = 'Private team notes'; notes.value = application.admin_notes || ''; notesLabel.append(notes);
      const saveButton = document.createElement('button'); saveButton.className = 'button button-small button-primary'; saveButton.type = 'button'; saveButton.textContent = 'Save';
      const archiveButton = document.createElement('button'); archiveButton.className = 'button button-small button-outline archive-button'; archiveButton.type = 'button'; archiveButton.textContent = application.archived ? 'Unarchive' : 'Archive';
      saveButton.addEventListener('click', async () => {
        saveButton.disabled = true;
        try { await api(`/api/admin/applications/${encodeURIComponent(application.id)}`, { method: 'PATCH', body: JSON.stringify({ status: statusSelect.value, admin_notes: notes.value }) }); setMessage('Application updated.'); await loadApplications(); }
        catch (error) { setMessage(error.message); }
        finally { saveButton.disabled = false; }
      });
      archiveButton.addEventListener('click', async () => {
        archiveButton.disabled = true;
        try { await api(`/api/admin/applications/${encodeURIComponent(application.id)}`, { method: 'PATCH', body: JSON.stringify({ archived: !application.archived }) }); setMessage(application.archived ? 'Application restored.' : 'Application archived.'); await loadApplications(); }
        catch (error) { setMessage(error.message); }
        finally { archiveButton.disabled = false; }
      });
      controls.append(statusLabel, notesLabel, saveButton, archiveButton);
      card.append(head, tags, details, controls);
      list.append(card);
    });
  }
  async function loadApplications(reset = true) {
    const params = new URLSearchParams();
    params.set('limit', String(state.limit));
    if (reset) state.offset = 0;
    params.set('offset', String(state.offset));
    if ($('statusFilter').value) params.set('status', $('statusFilter').value);
    if ($('searchInput').value.trim()) params.set('q', $('searchInput').value.trim());
    if ($('archivedFilter').checked) params.set('archived', 'true');
    setMessage('Loading applications…');
    try { const data = await api(`/api/admin/applications?${params}`); state.applications = reset ? data.applications : state.applications.concat(data.applications); state.offset += data.applications.length; $('loadMoreButton').hidden = data.applications.length < state.limit; render(); setMessage(`${state.applications.length} application${state.applications.length === 1 ? '' : 's'} loaded.`); }
    catch (error) { setMessage(error.message); if (/sign in/i.test(error.message)) showLogin(); }
  }
  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    loginError.hidden = true;
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try { const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: form.elements.email.value, password: form.elements.password.value }) }); form.elements.password.value = ''; showDashboard(data.email); }
    catch (error) { loginError.textContent = error.message; loginError.hidden = false; }
    finally { submit.disabled = false; }
  });
  $('logoutButton').addEventListener('click', async () => { try { await api('/api/admin/logout', { method: 'POST', body: '{}' }); } catch {} showLogin(); });
  $('refreshButton').addEventListener('click', () => loadApplications(true));
  $('loadMoreButton').addEventListener('click', () => loadApplications(false));
  $('statusFilter').addEventListener('change', () => loadApplications(true));
  $('archivedFilter').addEventListener('change', () => loadApplications(true));
  $('searchInput').addEventListener('input', () => { clearTimeout(state.timer); state.timer = setTimeout(() => loadApplications(true), 250); });
  api('/api/admin/session').then(data => showDashboard(data.email)).catch(showLogin);
})();
