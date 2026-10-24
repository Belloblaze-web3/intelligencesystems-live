const { randomBytes, scrypt: scryptCallback } = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(scryptCallback);

(async () => {
  if (process.stdin.isTTY) {
    console.error('Pipe a password from a hidden shell prompt; see the README setup instructions.');
    process.exit(2);
  }
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const password = Buffer.concat(chunks).toString('utf8').replace(/[\r\n]+$/, '');
  if (password.length < 14 || password.length > 1024) {
    console.error('Use an admin password of at least 14 characters (maximum 1024).');
    process.exit(2);
  }
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  console.log(`scrypt$${salt.toString('hex')}$${hash.toString('hex')}`);
})().catch(error => { console.error('Could not generate password hash:', error.message); process.exit(1); });
