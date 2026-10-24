const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes, createHash, timingSafeEqual, scrypt: scryptCallback } = require('node:crypto');
const { promisify } = require('node:util');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const scrypt = promisify(scryptCallback);
const port = Number(process.env.PORT || 3000);
const root = path.join(__dirname, 'public');
const maxBodyBytes = 16 * 1024;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.pdf': 'application/pdf' };
const allowedRoles = new Set(['ML Intern', 'AI Research Intern', 'Data Science Intern', 'Digital Marketing Intern', 'GenAI Intern']);
const applicationStatuses = new Set(['new', 'reviewing', 'shortlisted', 'rejected', 'hired']);
const loginAttempts = new Map();
const sessionDurationMs = 8 * 60 * 60 * 1000;
const sessionCookie = process.env.NODE_ENV === 'production' ? '__Host-isa_admin' : 'isa_admin';
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'true' || (process.env.NODE_ENV === 'production' && process.env.PGSSL !== 'false') ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' } : undefined, max: Number(process.env.PGPOOL_MAX || 10) }) : null;
let databaseReady = false;
let mailer = null;
let sendingNotifications = false;

function safePath(urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath.split('?')[0]); } catch { return null; }
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const resolved = path.resolve(root, relative);
  return resolved.startsWith(root + path.sep) ? resolved : null;
}
function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
}
function cleanText(value) { return typeof value === 'string' ? value.trim() : ''; }
function validUrl(value) {
  if (!value) return true;
  if (value.length > 2048) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
function validateApplication(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { errors: { form: 'Invalid application payload.' } };
  const application = {
    role: cleanText(input.role), name: cleanText(input.name), email: cleanText(input.email),
    phone: cleanText(input.phone), portfolio: cleanText(input.portfolio), linkedin: cleanText(input.linkedin), message: cleanText(input.message)
  };
  const errors = {};
  if (!allowedRoles.has(application.role)) errors.role = 'Choose a listed internship role.';
  if (application.name.length < 2 || application.name.length > 120 || !/^\p{L}[\p{L}\p{M} .,'’\-]*$/u.test(application.name)) errors.name = 'Enter a valid name (2–120 letters, spaces, apostrophes, periods, or hyphens).';
  if (application.email.length > 254 || !/^(?!\.)(?!.*\.\.)[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(application.email)) errors.email = 'Enter a valid email address.';
  if (application.phone && (application.phone.length > 40 || !/^\+?[0-9().\s-]{7,30}$/.test(application.phone))) errors.phone = 'Enter a valid phone number or leave it blank.';
  if (!validUrl(application.portfolio)) errors.portfolio = 'Use a valid HTTPS portfolio or resume URL.';
  if (!validUrl(application.linkedin)) errors.linkedin = 'Use a valid HTTPS LinkedIn profile URL.';
  if (application.message.length < 10 || application.message.length > 1200) errors.message = 'Write a message of 10–1,200 characters.';
  return Object.keys(errors).length ? { errors } : { application };
}
async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBodyBytes) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  }
  try { return JSON.parse(body); } catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}
async function ensureDatabase() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS internship_applications (
    id uuid PRIMARY KEY,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    role text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL DEFAULT '',
    portfolio text NOT NULL DEFAULT '',
    linkedin text NOT NULL DEFAULT '',
    message text NOT NULL,
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','shortlisted','rejected','hired')),
    admin_notes text NOT NULL DEFAULT '',
    archived boolean NOT NULL DEFAULT false
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS internship_applications_submitted_idx ON internship_applications (submitted_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS internship_applications_status_idx ON internship_applications (status, archived, submitted_at DESC)');
  await pool.query(`CREATE TABLE IF NOT EXISTS internship_notification_outbox (
    id bigserial PRIMARY KEY,
    application_id uuid NOT NULL UNIQUE REFERENCES internship_applications(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz,
    last_error text
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS internship_admin_sessions (token_hash char(64) PRIMARY KEY, admin_email text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL)`);
  await pool.query('CREATE INDEX IF NOT EXISTS internship_admin_sessions_expiry_idx ON internship_admin_sessions (expires_at)');
  databaseReady = true;
  console.log('PostgreSQL schema ready.');
}
function databaseUnavailable(res) {
  sendJson(res, 503, { error: 'Application storage is not configured or temporarily unavailable.' });
}
async function createApplication(req, res) {
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); return sendJson(res, 405, { error: 'Method not allowed.' }); }
  if (!databaseReady) return databaseUnavailable(res);
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return sendJson(res, 415, { error: 'Send application data as JSON.' });
  let input;
  try { input = await readBody(req); } catch (error) { return sendJson(res, error.status || 400, { error: error.message }); }
  const result = validateApplication(input);
  if (result.errors) return sendJson(res, 400, { error: 'Please correct the application details.', fields: result.errors });
  const record = result.application;
  const id = randomUUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO internship_applications (id, role, name, email, phone, portfolio, linkedin, message)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, record.role, record.name, record.email, record.phone, record.portfolio, record.linkedin, record.message]);
    await client.query('INSERT INTO internship_notification_outbox (application_id) VALUES ($1)', [id]);
    await client.query('COMMIT');
    sendJson(res, 201, { ok: true, id, notification: 'queued', message: 'Application saved; team notification queued.' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Could not save internship application:', error.message);
    sendJson(res, 500, { error: 'The application could not be saved. Please try again later.' });
  } finally { client.release(); }
}
function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(part => part.trim()).filter(Boolean).map(part => { const i = part.indexOf('='); return i < 0 ? [part, ''] : [part.slice(0, i), decodeURIComponent(part.slice(i + 1))]; }));
}
async function getSession(req) {
  const token = parseCookies(req)[sessionCookie];
  if (!token || !databaseReady) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { rows } = await pool.query('SELECT admin_email FROM internship_admin_sessions WHERE token_hash = $1 AND expires_at > now()', [tokenHash]);
  if (!rows.length) return null;
  return { tokenHash, session: { email: rows[0].admin_email } };
}
async function requireAdmin(req, res) {
  const item = await getSession(req);
  if (!item) { sendJson(res, 401, { error: 'Please sign in to the admin dashboard.' }); return null; }
  return item;
}
function originIsSameSite(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
function hashFieldsMatch(a, b) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function getLoginLimit(ip) {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt <= now) { const next = { count: 0, resetAt: now + 15 * 60 * 1000 }; loginAttempts.set(ip, next); return next; }
  return current;
}
async function loginAdmin(req, res) {
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); return sendJson(res, 405, { error: 'Method not allowed.' }); }
  if (!originIsSameSite(req)) return sendJson(res, 403, { error: 'Request origin is not allowed.' });
  if (!databaseReady) return databaseUnavailable(res);
  const ip = req.socket.remoteAddress || 'unknown';
  const attempts = getLoginLimit(ip);
  if (attempts.count >= 8) return sendJson(res, 429, { error: 'Too many sign-in attempts. Try again later.' });
  let input;
  try { input = await readBody(req); } catch (error) { return sendJson(res, error.status || 400, { error: error.message }); }
  const configuredEmail = cleanText(process.env.ADMIN_EMAIL).toLowerCase();
  const configuredHash = process.env.ADMIN_PASSWORD_HASH || '';
  const parts = configuredHash.split('$');
  let validPassword = false;
  if (configuredEmail && parts.length === 3 && parts[0] === 'scrypt' && /^[0-9a-f]{32,128}$/i.test(parts[1]) && /^[0-9a-f]{128}$/i.test(parts[2])) {
    try { const derived = await scrypt(String(input?.password || ''), Buffer.from(parts[1], 'hex'), 64); validPassword = hashFieldsMatch(derived.toString('hex'), parts[2].toLowerCase()); } catch { validPassword = false; }
  }
  const validEmail = hashFieldsMatch(cleanText(input?.email).toLowerCase(), configuredEmail || 'not-configured');
  if (!validEmail || !validPassword) { attempts.count += 1; return sendJson(res, 401, { error: 'Email or password is incorrect.' }); }
  loginAttempts.delete(ip);
  const token = randomBytes(32).toString('base64url');
  await pool.query("INSERT INTO internship_admin_sessions (token_hash, admin_email, expires_at) VALUES ($1,$2,now() + interval '8 hours')", [createHash('sha256').update(token).digest('hex'), configuredEmail]);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('set-cookie', `${sessionCookie}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionDurationMs / 1000}${secure}`);
  sendJson(res, 200, { ok: true, email: configuredEmail });
}
async function adminApi(req, res, pathname, url) {
  if (pathname === '/api/admin/login') return loginAdmin(req, res);
  if (pathname === '/api/admin/session' && req.method === 'GET') {
    const item = await requireAdmin(req, res);
    if (!item) return;
    return sendJson(res, 200, { authenticated: true, email: item.session.email });
  }
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    if (!originIsSameSite(req)) return sendJson(res, 403, { error: 'Request origin is not allowed.' });
    const item = await requireAdmin(req, res);
    if (!item) return;
    await pool.query('DELETE FROM internship_admin_sessions WHERE token_hash = $1', [item.tokenHash]);
    res.setHeader('set-cookie', `${sessionCookie}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    return sendJson(res, 200, { ok: true });
  }
  if (!databaseReady) return databaseUnavailable(res);
  if (pathname === '/api/admin/applications' && req.method === 'GET') {
    if (!await requireAdmin(req, res)) return;
    const status = url.searchParams.get('status') || '';
    const search = (url.searchParams.get('q') || '').trim().slice(0, 120);
    const archived = url.searchParams.get('archived') === 'true';
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 200);
    const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
    if (status && !applicationStatuses.has(status)) return sendJson(res, 400, { error: 'Invalid status filter.' });
    try {
      const params = [archived];
      let where = 'archived = $1';
      if (status) { params.push(status); where += ` AND status = $${params.length}`; }
      if (search) { params.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`); where += ` AND (name ILIKE $${params.length} ESCAPE E'\\\\' OR email ILIKE $${params.length} ESCAPE E'\\\\' OR role ILIKE $${params.length} ESCAPE E'\\\\')`; }
      params.push(limit, offset);
      const { rows } = await pool.query(`SELECT id, submitted_at, role, name, email, phone, portfolio, linkedin, message, status, admin_notes, archived
        FROM internship_applications WHERE ${where} ORDER BY submitted_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      return sendJson(res, 200, { applications: rows, limit, offset });
    } catch (error) { console.error('Could not list applications:', error.message); return sendJson(res, 500, { error: 'Could not load applications.' }); }
  }
  const match = pathname.match(/^\/api\/admin\/applications\/([0-9a-f-]{36})$/i);
  if (match && req.method === 'PATCH') {
    if (!originIsSameSite(req)) return sendJson(res, 403, { error: 'Request origin is not allowed.' });
    if (!await requireAdmin(req, res)) return;
    let input;
    try { input = await readBody(req); } catch (error) { return sendJson(res, error.status || 400, { error: error.message }); }
    const status = input?.status;
    const notes = input?.admin_notes;
    const archived = input?.archived;
    if (status !== undefined && !applicationStatuses.has(status)) return sendJson(res, 400, { error: 'Choose a supported application status.' });
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 4000)) return sendJson(res, 400, { error: 'Notes must be 4,000 characters or fewer.' });
    if (archived !== undefined && typeof archived !== 'boolean') return sendJson(res, 400, { error: 'Archived must be true or false.' });
    const fields = []; const params = [];
    if (status !== undefined) { params.push(status); fields.push(`status = $${params.length}`); }
    if (notes !== undefined) { params.push(notes.trim()); fields.push(`admin_notes = $${params.length}`); }
    if (archived !== undefined) { params.push(archived); fields.push(`archived = $${params.length}`); }
    if (!fields.length) return sendJson(res, 400, { error: 'No supported changes provided.' });
    params.push(match[1]);
    try {
      const { rows } = await pool.query(`UPDATE internship_applications SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING id, status, admin_notes, archived`, params);
      if (!rows.length) return sendJson(res, 404, { error: 'Application not found.' });
      return sendJson(res, 200, { application: rows[0] });
    } catch (error) { console.error('Could not update application:', error.message); return sendJson(res, 500, { error: 'Could not update application.' }); }
  }
  return sendJson(res, 404, { error: 'Admin API route not found.' });
}
function htmlEscape(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function createMailer() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  const to = process.env.APPLICATION_NOTIFICATION_TO || 'internships@intelligencesystems.in';
  if (!host || !from) return null;
  return { transport: nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined }), from, to };
}
async function deliverNotifications() {
  if (!pool || !databaseReady || !mailer || sendingNotifications) return;
  sendingNotifications = true;
  try {
    for (let i = 0; i < 5; i += 1) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(`SELECT o.id AS outbox_id, o.attempts, a.* FROM internship_notification_outbox o
          JOIN internship_applications a ON a.id = o.application_id
          WHERE o.sent_at IS NULL AND o.next_attempt_at <= now() ORDER BY o.created_at
          LIMIT 1 FOR UPDATE OF o SKIP LOCKED`);
        if (!rows.length) { await client.query('COMMIT'); break; }
        const row = rows[0];
        try {
          await mailer.transport.sendMail({
            from: mailer.from, to: mailer.to,
            subject: `New internship application: ${row.role}`,
            text: [`New internship application`, `Role: ${row.role}`, `Name: ${row.name}`, `Email: ${row.email}`, `Phone: ${row.phone || 'Not provided'}`, `Portfolio or resume: ${row.portfolio || 'Not provided'}`, `LinkedIn: ${row.linkedin || 'Not provided'}`, '', 'Message:', row.message, '', `Application ID: ${row.id}`].join('\n'),
            html: `<h2>New internship application</h2><p><b>Role:</b> ${htmlEscape(row.role)}<br><b>Name:</b> ${htmlEscape(row.name)}<br><b>Email:</b> ${htmlEscape(row.email)}<br><b>Phone:</b> ${htmlEscape(row.phone || 'Not provided')}<br><b>Portfolio or resume:</b> ${htmlEscape(row.portfolio || 'Not provided')}<br><b>LinkedIn:</b> ${htmlEscape(row.linkedin || 'Not provided')}</p><p><b>Message:</b><br>${htmlEscape(row.message).replace(/\n/g, '<br>')}</p><p>Application ID: ${htmlEscape(row.id)}</p>`
          });
          await client.query('UPDATE internship_notification_outbox SET sent_at = now(), last_error = NULL WHERE id = $1', [row.outbox_id]);
          await client.query('COMMIT');
        } catch (error) {
          const attempts = row.attempts + 1;
          const delaySeconds = Math.min(3600, 30 * (2 ** Math.min(attempts - 1, 7)));
          await client.query(`UPDATE internship_notification_outbox SET attempts = $2, next_attempt_at = now() + ($3 * interval '1 second'), last_error = $4 WHERE id = $1`, [row.outbox_id, attempts, delaySeconds, String(error.message || 'SMTP error').slice(0, 500)]);
          await client.query('COMMIT');
          console.error(`Notification delivery failed for ${row.id}; will retry.`);
        }
      } catch (error) { await client.query('ROLLBACK').catch(() => {}); console.error('Notification queue error:', error.message); break; }
      finally { client.release(); }
    }
  } finally { sendingNotifications = false; }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    console.error('Unhandled request error:', error.message);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error.' });
    else res.destroy();
  });
});

async function handleRequest(req, res) {
  const pathname = (req.url || '/').split('?')[0];
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (pathname === '/health') {
    res.writeHead(databaseReady ? 200 : 503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(databaseReady ? 'ok' : (pool ? 'database-unavailable' : 'database-not-configured'));
  }
  if (pathname === '/admin') {
    const adminFile = path.join(root, 'admin.html');
    return fs.readFile(adminFile, (error, data) => { if (error) { res.writeHead(404); return res.end('Admin page not found'); } res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' }); res.end(data); });
  }
  if (pathname.startsWith('/api/admin/')) return adminApi(req, res, pathname, url);
  if (pathname === '/api/applications') return createApplication(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { allow: 'GET, HEAD' }); return res.end('Method not allowed'); }
  const requested = safePath(req.url || '/');
  const fallback = path.join(root, 'index.html');
  const file = requested && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : fallback;
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(500); return res.end('Server error'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'content-type': mime[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=86400', 'x-content-type-options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
}

server.listen(port, '0.0.0.0', async () => {
  console.log(`Intelligence Systems listening on ${port}`);
  if (!pool) console.error('DATABASE_URL is not set; application and admin data APIs are unavailable.');
  mailer = createMailer();
  if (!mailer) console.warn('SMTP is not configured; notification outbox will queue emails until SMTP settings are supplied.');
  const maintenance = async () => {
    if (pool && !databaseReady) {
      try { await ensureDatabase(); } catch (error) { console.error('PostgreSQL initialization failed:', error.message); }
    }
    if (mailer && databaseReady) {
      try { await deliverNotifications(); } catch (error) { console.error('Notification worker encountered a transient error:', error.message); }
    }
  };
  await maintenance();
  setInterval(maintenance, 10_000).unref();
});

process.on('SIGTERM', async () => { server.close(); if (pool) await pool.end(); process.exit(0); });
process.on('SIGINT', async () => { server.close(); if (pool) await pool.end(); process.exit(0); });
