const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.PORT || 3000);
const root = path.join(__dirname, 'public');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.pdf': 'application/pdf' };
function safePath(urlPath) { const decoded = decodeURIComponent(urlPath.split('?')[0]); const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, ''); const resolved = path.resolve(root, relative); return resolved.startsWith(root + path.sep) ? resolved : null; }
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }); return res.end('ok'); }
  const requested = safePath(req.url || '/');
  const fallback = path.join(root, 'index.html');
  const file = requested && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : fallback;
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(500); return res.end('Server error'); } const ext = path.extname(file).toLowerCase(); res.writeHead(200, { 'content-type': mime[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=86400' }); res.end(data); });
});
server.listen(port, '0.0.0.0', () => console.log(`Intelligence Systems listening on ${port}`));
