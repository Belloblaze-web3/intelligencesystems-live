const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');

(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be configured.');
  const source = path.resolve(process.env.APPLICATIONS_FILE || path.join(__dirname, '..', 'data', 'applications.json'));
  const records = JSON.parse(await fs.readFile(source, 'utf8'));
  if (!Array.isArray(records)) throw new Error('Legacy application file must contain a JSON array.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' } : undefined });
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS internship_applications (
      id uuid PRIMARY KEY, submitted_at timestamptz NOT NULL DEFAULT now(), role text NOT NULL, name text NOT NULL,
      email text NOT NULL, phone text NOT NULL DEFAULT '', portfolio text NOT NULL DEFAULT '', linkedin text NOT NULL DEFAULT '',
      message text NOT NULL, status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','shortlisted','rejected','hired')),
      admin_notes text NOT NULL DEFAULT '', archived boolean NOT NULL DEFAULT false
    )`);
    const client = await pool.connect();
    let imported = 0;
    try {
      await client.query('BEGIN');
      for (const row of records) {
        if (!row || !row.role || !row.name || !row.email || !row.message) throw new Error('Each legacy row needs role, name, email, and message fields.');
        const id = /^[0-9a-f-]{36}$/i.test(String(row.id || '')) ? row.id : randomUUID();
        const timestamp = row.submittedAt && !Number.isNaN(Date.parse(row.submittedAt)) ? new Date(row.submittedAt).toISOString() : new Date().toISOString();
        const result = await client.query(`INSERT INTO internship_applications (id, submitted_at, role, name, email, phone, portfolio, linkedin, message)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`, [id, timestamp, String(row.role), String(row.name), String(row.email), String(row.phone || ''), String(row.portfolio || ''), String(row.linkedin || ''), String(row.message)]);
        imported += result.rowCount;
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
    console.log(`Imported ${imported} new application record(s); ${records.length - imported} already existed.`);
  } finally { await pool.end(); }
})().catch(error => { console.error(`Migration failed: ${error.message}`); process.exit(1); });
