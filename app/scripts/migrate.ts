import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
});

async function migrate() {
  console.log('🔄 Starting database migrations...');
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(process.cwd(), '..', 'database', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const { rows: applied } = await client.query('SELECT name FROM _migrations');
    const appliedNames = new Set(applied.map(r => r.name));

    for (const file of files) {
      if (!appliedNames.has(file)) {
        console.log(`🚀 Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      } else {
        console.log(`✅ Migration already applied: ${file}`);
      }
    }

    await client.query('COMMIT');
    console.log('🏁 All migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
