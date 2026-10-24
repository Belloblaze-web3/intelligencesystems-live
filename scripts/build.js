const fs = require('node:fs');
const path = require('node:path');
const required = ['index.html', 'styles.css', 'config.js', 'app.js', 'admin.html', 'admin.css', 'admin.js', 'manus-routes.json', 'favicon.svg', 'resources/module-guide.pdf'];
const root = path.join(__dirname, '..', 'public');
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) { console.error(`Build failed; missing public files: ${missing.join(', ')}`); process.exit(1); }
const routes = JSON.parse(fs.readFileSync(path.join(root, 'manus-routes.json'), 'utf8'));
if (!Array.isArray(routes.routes) || !routes.routes.some(route => route.path === '/')) { console.error('Build failed; public/manus-routes.json must declare /.'); process.exit(1); }
console.log(`Static build ready: ${required.length} required public files present.`);
