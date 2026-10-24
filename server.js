const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const port = Number(process.env.PORT || 3000);
const root = path.join(__dirname, 'public');
const applicationFile = path.resolve(process.env.APPLICATIONS_FILE || path.join(__dirname, 'data', 'applications.json'));
const maxBodyBytes = 16 * 1024;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.pdf': 'application/pdf' };
const allowedRoles = new Set(['ML Intern', 'AI Research Intern', 'Data Science Intern', 'Digital Marketing Intern', 'GenAI Intern']);
let writeQueue = Promise.resolve();

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
    role: cleanText(input.role),
    name: cleanText(input.name),
    email: cleanText(input.email),
    phone: cleanText(input.phone),
    portfolio: cleanText(input.portfolio),
    linkedin: cleanText(input.linkedin),
    message: cleanText(input.message)
  };
  const errors = {};
  if (!allowedRoles.has(application.role)) errors.role = 'Choose a listed internship role.';
  if (application.name.length < 2 || application.name.length > 120 || !/^\p{L}[\p{L}\p{M} .,'’\-]*$/u.test(application.name)) errors.name = 'Enter a valid name (2–120 letters, spaces, apostrophes, periods, or hyphens).';
  if (application.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(application.email)) errors.email = 'Enter a valid email address.';
  if (application.phone && (application.phone.length > 40 || !/^\+?[0-9().\s-]{7,30}$/.test(application.phone))) errors.phone = 'Enter a valid phone number or leave it blank.';
  if (!validUrl(application.portfolio)) errors.portfolio = 'Use a valid HTTPS portfolio or resume URL.';
  if (!validUrl(application.linkedin)) errors.linkedin = 'Use a valid HTTPS LinkedIn profile URL.';
  if (application.message.length < 10 || application.message.length > 1200) errors.message = 'Write a message of 10–1,200 characters.';
  return Object.keys(errors).length ? { errors } : { application };
}
async function storeApplication(application) {
  const operation = writeQueue.then(async () => {
    await fs.promises.mkdir(path.dirname(applicationFile), { recursive: true, mode: 0o700 });
    let saved = [];
    try {
      const parsed = JSON.parse(await fs.promises.readFile(applicationFile, 'utf8'));
      if (!Array.isArray(parsed)) throw new Error('Application store must contain a JSON array.');
      saved = parsed;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const record = { id: randomUUID(), submittedAt: new Date().toISOString(), ...application };
    const temporaryFile = `${applicationFile}.${process.pid}.${randomUUID()}.tmp`;
    await fs.promises.writeFile(temporaryFile, `${JSON.stringify([...saved, record], null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    await fs.promises.rename(temporaryFile, applicationFile);
    await fs.promises.chmod(applicationFile, 0o600);
    return record.id;
  });
  writeQueue = operation.catch(() => {});
  return operation;
}
async function handleApplication(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return sendJson(res, 415, { error: 'Send application data as JSON.' });
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBodyBytes) {
      sendJson(res, 413, { error: 'Application payload is too large.' });
      req.destroy();
      return;
    }
  }
  let input;
  try { input = JSON.parse(body); } catch { return sendJson(res, 400, { error: 'Request body must be valid JSON.' }); }
  const result = validateApplication(input);
  if (result.errors) return sendJson(res, 400, { error: 'Please correct the highlighted application details.', fields: result.errors });
  try {
    const id = await storeApplication(result.application);
    return sendJson(res, 201, { ok: true, id, message: 'Application saved.' });
  } catch (error) {
    console.error('Could not save internship application:', error.message);
    return sendJson(res, 500, { error: 'The application could not be saved. Please try again later.' });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    return res.end('ok');
  }
  if ((req.url || '').split('?')[0] === '/api/applications') return handleApplication(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' });
    return res.end('Method not allowed');
  }
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
});
server.listen(port, '0.0.0.0', () => console.log(`Intelligence Systems listening on ${port}`));
